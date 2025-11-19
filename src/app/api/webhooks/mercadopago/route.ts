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

    // Obtener información completa del pago desde Mercado Pago
    const paymentInfoRaw = await PaymentService.getPaymentInfo(paymentId.toString())
    const paymentInfo = await PaymentService.verifyPaymentStatus(paymentId.toString())

    console.log('💳 Información del pago:', paymentInfo)
    console.log('🔑 Preference ID:', (paymentInfoRaw as any).preference_id)

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
            id: true,
            organizerId: true,
            registrationFee: true,
          }
        }
      }
    })

    if (!registration) {
      console.error('❌ Registration no encontrada:', registrationId)
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Buscar el pago específico
    // 1. Primero intentar por mercadoPagoPaymentId (si ya fue actualizado antes)
    let payment = registration.payments.find(p => p.mercadoPagoPaymentId === paymentId.toString())

    // 2. Si no se encuentra, buscar por preferenceId
    const preferenceId = (paymentInfoRaw as any).preference_id
    if (!payment && preferenceId) {
      payment = registration.payments.find(p => p.mercadoPagoPreferenceId === preferenceId)
      console.log('🔍 Payment encontrado por preferenceId:', preferenceId)
    }

    // 3. Si aún no se encuentra, buscar el pago PENDING más reciente para esta registration
    // (esto cubre el caso cuando el preference_id no viene en la respuesta de MercadoPago)
    if (!payment) {
      const pendingPayments = registration.payments.filter(p =>
        p.paymentStatus === 'PENDING' &&
        p.mercadoPagoPreferenceId !== null
      )

      if (pendingPayments.length > 0) {
        // Ordenar por fecha de creación descendente y tomar el más reciente
        payment = pendingPayments.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
        console.log('🔍 Payment PENDING encontrado para registration:', payment.id)
      }
    }

    if (!payment) {
      console.error('❌ Payment no encontrado para registration:', registrationId, 'paymentId:', paymentId, 'preferenceId:', preferenceId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Mapear el estado de Mercado Pago a nuestro estado
    const newStatus = PaymentService.mapMercadoPagoStatus(paymentInfo.status)

    // Mapear el método de pago si está disponible
    const paymentMethod = paymentInfoRaw.payment_type_id
      ? PaymentService.mapMercadoPagoPaymentType(paymentInfoRaw.payment_type_id)
      : payment.paymentMethod // Mantener el método actual si no se puede determinar

    // Use tournamentCategory fee if available, otherwise use tournament fee
    const registrationFee = registration.tournamentCategory?.registrationFee ?? registration.tournament.registrationFee ?? 0

    // Actualizar el pago en nuestra DB
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.registrationPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: newStatus,
          paymentMethod: paymentMethod,
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

    // Log de auditoría (usar el organizador del torneo como userId)
    const logUserId = registration.tournament.organizerId

    try {
      if (paymentInfo.status === 'approved') {
        await PaymentLogService.logMercadoPagoPaymentApproved(
          { userId: logUserId, paymentId: updatedPayment.id },
          updatedPayment,
          paymentId.toString()
        )
      } else if (paymentInfo.status === 'rejected') {
        await PaymentLogService.logMercadoPagoPaymentRejected(
          { userId: logUserId, paymentId: updatedPayment.id },
          paymentId.toString(),
          paymentInfo.statusDetail
        )
      }

      // Log general del webhook
      await PaymentLogService.logMercadoPagoWebhookReceived(
        { userId: logUserId, paymentId: updatedPayment.id },
        body
      )
    } catch (logError) {
      // Si falla el log, no queremos que falle todo el webhook
      console.error('❌ Error creating payment log:', logError)
    }

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
