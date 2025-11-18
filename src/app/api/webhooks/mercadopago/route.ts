/**
 * POST /api/webhooks/mercadopago
 *
 * Webhook para recibir notificaciones de Mercado Pago
 * Documentación: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *
 * IMPORTANTE: Este endpoint NO debe tener autenticación RBAC
 * ya que es llamado por Mercado Pago desde sus servidores
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PaymentService } from "@/lib/services/payment-service"
import { PaymentLogService } from "@/lib/services/payment-log-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('📨 Webhook de Mercado Pago recibido:', body)

    // Validar que sea una notificación de pago
    if (body.type !== 'payment') {
      console.log('⏭️ Webhook ignorado (no es tipo payment):', body.type)
      return NextResponse.json({ received: true })
    }

    // Extraer ID del pago
    const paymentId = body.data?.id
    if (!paymentId) {
      console.error('❌ Webhook sin payment ID')
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // Obtener información del pago desde Mercado Pago
    const paymentInfo = await PaymentService.verifyPaymentStatus(paymentId.toString())

    console.log('💳 Información del pago:', paymentInfo)

    // Obtener el ID de registro desde external_reference
    const registrationId = paymentInfo.externalReference
    if (!registrationId) {
      console.error('❌ Pago sin external_reference (registrationId)')
      return NextResponse.json({ error: 'Missing external reference' }, { status: 400 })
    }

    // Buscar el pago en nuestra DB
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        payments: true,
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        },
        tournament: {
          select: {
            registrationFee: true,
          }
        }
      }
    })

    if (!registration) {
      console.error('❌ Registration no encontrada:', registrationId)
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Buscar el pago específico por mercadoPagoPaymentId
    const payment = registration.payments.find(p => p.mercadoPagoPaymentId === paymentId.toString())

    if (!payment) {
      console.error('❌ Payment no encontrado para registration:', registrationId, 'paymentId:', paymentId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Mapear el estado de Mercado Pago a nuestro estado
    const newStatus = PaymentService.mapMercadoPagoStatus(paymentInfo.status)

    // Use tournamentCategory fee if available, otherwise use tournament fee
    const registrationFee = registration.tournamentCategory?.registrationFee ?? registration.tournament.registrationFee ?? 0

    // Actualizar el pago en nuestra DB
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.registrationPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: newStatus,
          mercadoPagoPaymentId: paymentId.toString(),
          mercadoPagoStatus: paymentInfo.status,
          paidAt: paymentInfo.status === 'approved' ? new Date() : null,
        }
      })

      // Si el pago fue aprobado, verificar si se completó el pago total
      if (paymentInfo.status === 'approved') {
        // Recalcular total pagado con el pago actualizado
        const totalPaid = registration.payments.reduce((sum, p) => {
          if (p.id === payment.id) {
            return sum + updatedPayment.amount
          }
          return sum + (p.paymentStatus === 'PAID' ? p.amount : 0)
        }, 0)

        // Solo actualizar a PAID si el total cubre la tarifa
        if (totalPaid >= registrationFee) {
          await tx.registration.update({
            where: { id: registrationId },
            data: { registrationStatus: 'PAID' }
          })
        }
      }

      return updatedPayment
    })

    // Log de auditoría (usar un userId del sistema para webhooks)
    const systemUserId = 'system' // TODO: crear un usuario "system" en la DB o usar el organizador del torneo

    if (paymentInfo.status === 'approved') {
      await PaymentLogService.logMercadoPagoPaymentApproved(
        { userId: systemUserId, paymentId: updatedPayment.id },
        updatedPayment,
        paymentId.toString()
      )
    } else if (paymentInfo.status === 'rejected') {
      await PaymentLogService.logMercadoPagoPaymentRejected(
        { userId: systemUserId, paymentId: updatedPayment.id },
        paymentId.toString(),
        paymentInfo.statusDetail
      )
    }

    // Log general del webhook
    await PaymentLogService.logMercadoPagoWebhookReceived(
      { userId: systemUserId, paymentId: updatedPayment.id },
      body
    )

    console.log('✅ Pago actualizado:', {
      paymentId: updatedPayment.id,
      status: newStatus,
      mercadoPagoPaymentId: paymentId
    })

    return NextResponse.json({ received: true, status: newStatus })

  } catch (error) {
    console.error('❌ Error procesando webhook de Mercado Pago:', error)
    // Devolver 200 para que Mercado Pago no reintente
    // pero logear el error internamente
    return NextResponse.json(
      { received: true, error: 'Internal error' },
      { status: 200 }
    )
  }
}

/**
 * GET /api/webhooks/mercadopago
 *
 * Endpoint de verificación para cuando configures el webhook en Mercado Pago
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook de Mercado Pago funcionando',
    timestamp: new Date().toISOString()
  })
}
