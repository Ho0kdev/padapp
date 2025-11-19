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

    // Verificar que el usuario sea el dueño de la inscripción, organizador del torneo o admin
    if (registration.player.userId !== session.user.id &&
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

    // Calculate current total paid by summing only PAID payments (not PENDING, CANCELLED, etc.)
    const currentPaid = registration.payments
      .filter(p => p.paymentStatus === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Verificar que no esté ya completamente pagada
    if (currentPaid >= registrationFee) {
      return NextResponse.json(
        { error: "Esta inscripción ya está completamente pagada" },
        { status: 400 }
      )
    }

    // Calculate remaining amount to pay
    const amountDue = registrationFee - currentPaid

    // Validar que el usuario tenga email
    if (!registration.player.user?.email) {
      return NextResponse.json(
        { error: "El jugador no tiene un email asociado" },
        { status: 400 }
      )
    }

    // Obtener nombre de la categoría
    const categoryName = registration.tournamentCategory?.category?.name || 'Sin categoría'

    // Log de datos antes de crear la preferencia
    console.log('📝 Creando preferencia de MercadoPago con datos:', {
      registrationId: registration.id,
      amount: amountDue,
      description: `${registration.tournament.name} - ${categoryName}`,
      email: registration.player.user.email,
      name: registration.player.user.name,
    })

    // Crear preferencia de pago en Mercado Pago (solo por el monto pendiente)
    let preference
    try {
      preference = await PaymentService.createPaymentPreference({
        registrationId: registration.id,
        amount: amountDue,
        description: `${registration.tournament.name} - ${categoryName}`,
        payer: {
          email: registration.player.user.email,
          name: registration.player.user.name || undefined,
        }
      })
      console.log('✅ Preferencia creada exitosamente:', preference.id)
    } catch (prefError) {
      console.error('❌ Error al crear preferencia de MercadoPago:', prefError)
      console.error('Tipo de error:', typeof prefError)
      console.error('Error completo:', JSON.stringify(prefError, null, 2))

      return NextResponse.json(
        { error: `Error al crear preferencia de pago: ${prefError instanceof Error ? prefError.message : String(prefError)}` },
        { status: 500 }
      )
    }

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

    console.log('🔗 URL de pago generada:', paymentUrl)

    return NextResponse.json({
      preferenceId: preference.id,
      paymentUrl,
      amount: amountDue,
    })

  } catch (error) {
    console.error('❌ Error general en endpoint de MercadoPago:', error)
    console.error('Tipo de error:', typeof error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return handleAuthError(error)
  }
}
