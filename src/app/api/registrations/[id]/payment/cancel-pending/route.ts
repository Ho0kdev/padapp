/**
 * POST /api/registrations/[id]/payment/cancel-pending
 *
 * Cancela los pagos pendientes de una inscripción
 * Permite al usuario reintentar el pago si el anterior quedó en PENDING
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
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
            user: true
          }
        },
        tournament: {
          select: {
            organizerId: true,
          }
        },
        payments: {
          where: {
            paymentStatus: 'PENDING'
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar permisos: usuario dueño, organizador o admin
    if (registration.player.userId !== session.user.id &&
        registration.tournament.organizerId !== session.user.id &&
        session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "No tienes permiso para cancelar pagos de esta inscripción" },
        { status: 403 }
      )
    }

    // Si no hay pagos pendientes, no hacer nada
    if (registration.payments.length === 0) {
      return NextResponse.json(
        { message: "No hay pagos pendientes para cancelar" },
        { status: 200 }
      )
    }

    // Cancelar todos los pagos pendientes
    const canceledPayments = await prisma.$transaction(
      registration.payments.map(payment =>
        prisma.registrationPayment.update({
          where: { id: payment.id },
          data: { paymentStatus: 'CANCELLED' }
        })
      )
    )

    // Log de auditoría para cada pago cancelado
    await Promise.all(
      canceledPayments.map(payment =>
        PaymentLogService.logPaymentCancelled(
          { userId: session.user.id, paymentId: payment.id },
          payment
        )
      )
    )

    console.log('✅ Pagos pendientes cancelados:', {
      registrationId,
      count: canceledPayments.length,
      paymentIds: canceledPayments.map(p => p.id),
      cancelledBy: session.user.id,
    })

    return NextResponse.json({
      message: `${canceledPayments.length} pago(s) cancelado(s)`,
      canceledCount: canceledPayments.length
    })

  } catch (error) {
    console.error('Error cancelando pagos pendientes:', error)
    return handleAuthError(error)
  }
}
