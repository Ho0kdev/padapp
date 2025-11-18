/**
 * POST /api/registrations/[id]/payment/mercadopago
 *
 * Crea una preferencia de pago en Mercado Pago
 * Devuelve el link de pago (sandbox para testing, production para producción)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { PaymentService } from "@/lib/services/payment-service"
import { PaymentLogService } from "@/lib/services/payment-log-service"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id: registrationId } = await params

    // Buscar la inscripción
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        player: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
              }
            }
          }
        },
        tournament: {
          select: {
            name: true,
            organizerId: true,
            registrationFee: true,
          }
        },
        tournamentCategory: {
          select: {
            category: {
              select: {
                name: true
              }
            },
            registrationFee: true,
          }
        },
        payments: true,
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que el usuario sea el dueño de la inscripción
    if (registration.playerId !== session.user.id &&
        registration.tournament.organizerId !== session.user.id &&
        session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No tienes permiso para crear un pago para esta inscripción" },
        { status: 403 }
      )
    }

    // Use tournamentCategory fee if available, otherwise use tournament fee
    const registrationFee = registration.tournamentCategory?.registrationFee ?? registration.tournament.registrationFee ?? 0

    // Verificar que haya una tarifa de inscripción
    if (!registrationFee || registrationFee <= 0) {
      return NextResponse.json(
        { error: "Este torneo no tiene tarifa de inscripción" },
        { status: 400 }
      )
    }

    // Calculate current total paid by summing all payments
    const currentPaid = registration.payments.reduce((sum, payment) => sum + payment.amount, 0)

    // Verificar que no esté ya completamente pagada
    if (currentPaid >= registrationFee) {
      return NextResponse.json(
        { error: "Esta inscripción ya está completamente pagada" },
        { status: 400 }
      )
    }

    // Calculate remaining amount to pay
    const amountDue = registrationFee - currentPaid

    // Crear preferencia de pago en Mercado Pago (solo por el monto pendiente)
    const preference = await PaymentService.createPaymentPreference({
      registrationId: registration.id,
      amount: amountDue,
      description: `${registration.tournament.name} - ${registration.tournamentCategory.category.name}`,
      payer: {
        email: registration.player.user.email,
        name: registration.player.user.name || undefined,
      }
    })

    // Crear nuevo registro de pago con la preferencia (siempre crear, nunca actualizar)
    const payment = await prisma.registrationPayment.create({
      data: {
        registrationId: registration.id,
        amount: amountDue,
        paymentStatus: 'PENDING',
        mercadoPagoPreferenceId: preference.id,
      }
    })

    // Log de auditoría
    await PaymentLogService.logMercadoPagoPreferenceCreated(
      { userId: session.user.id, paymentId: payment.id },
      preference.id,
      amountDue
    )

    // Devolver el link de pago
    // En desarrollo/test usa sandboxInitPoint, en producción usa initPoint
    const paymentUrl = process.env.NODE_ENV === 'production'
      ? preference.initPoint
      : preference.sandboxInitPoint

    return NextResponse.json({
      preferenceId: preference.id,
      paymentUrl,
      amount: amountDue,
    })

  } catch (error) {
    console.error('Error creando preferencia de Mercado Pago:', error)
    return handleAuthError(error)
  }
}
