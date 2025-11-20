/**
 * POST /api/webhooks/mercadopago
 *
 * Webhook para recibir notificaciones de Mercado Pago
 * Documentación: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *
 * IMPORTANTE: Este endpoint NO debe tener autenticación RBAC
 * ya que es llamado por Mercado Pago desde sus servidores
 *
 * SEGURIDAD:
 * - Valida firma x-signature para prevenir webhooks falsos
 * - Valida timestamp para prevenir replay attacks
 * - Verifica monto antes de aprobar pago
 * - Implementa idempotencia para prevenir doble procesamiento
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PaymentService } from "@/lib/services/payment-service"
import { PaymentLogService } from "@/lib/services/payment-log-service"
import { MercadoPagoValidationService } from "@/lib/services/mercadopago-validation-service"

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

    // 🔒 SEGURIDAD: Validar firma del webhook
    try {
      const xSignature = request.headers.get('x-signature')
      const xRequestId = request.headers.get('x-request-id')

      MercadoPagoValidationService.validateWebhookSignature({
        xSignature,
        xRequestId,
        dataId: paymentId.toString(),
        body,
      })

      MercadoPagoValidationService.validateWebhookTimestamp(xSignature)
    } catch (validationError) {
      console.error('❌ Webhook signature validation failed:', validationError)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
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

    // 🔒 SEGURIDAD: Buscar el pago específico SOLO por IDs únicos
    // NO usar fallback a "PENDING más reciente" para evitar confusión de pagos

    // 1. Primero intentar por mercadoPagoPaymentId (si ya fue actualizado antes)
    let payment = registration.payments.find(p => p.mercadoPagoPaymentId === paymentId.toString())

    // 2. Si no se encuentra, buscar por preferenceId
    const preferenceId = (paymentInfoRaw as any).preference_id
    if (!payment && preferenceId) {
      payment = registration.payments.find(p => p.mercadoPagoPreferenceId === preferenceId)
      console.log('🔍 Payment encontrado por preferenceId:', preferenceId)
    }

    // ❌ REMOVIDO: Fallback peligroso a PENDING más reciente
    // Esto podía causar que un pago se aplicara al RegistrationPayment incorrecto
    // si había múltiples pagos PENDING para la misma registration

    if (!payment) {
      console.error('❌ Payment no encontrado para registration:', registrationId, 'paymentId:', paymentId, 'preferenceId:', preferenceId)
      console.error('   Pagos disponibles:', registration.payments.map(p => ({
        id: p.id,
        status: p.paymentStatus,
        preferenceId: p.mercadoPagoPreferenceId,
        paymentId: p.mercadoPagoPaymentId
      })))
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // 🔒 SEGURIDAD: Verificar idempotencia - no procesar pagos ya completados
    if (payment.paymentStatus === 'PAID') {
      console.log('⏭️ Payment ya está marcado como PAID, ignorando webhook (idempotencia)')
      return NextResponse.json({
        received: true,
        message: 'Payment already processed',
        status: payment.paymentStatus
      })
    }

    // Mapear el estado de Mercado Pago a nuestro estado
    const newStatus = PaymentService.mapMercadoPagoStatus(paymentInfo.status)

    // 🔒 SEGURIDAD: Validar monto antes de aprobar el pago
    if (paymentInfo.status === 'approved') {
      const expectedAmount = payment.amount
      const receivedAmount = paymentInfo.amount

      // Permitir una pequeña diferencia por redondeo (0.01 ARS)
      const tolerance = 0.01
      const difference = Math.abs(expectedAmount - receivedAmount)

      if (difference > tolerance) {
        console.error('❌ Monto del pago no coincide:', {
          expected: expectedAmount,
          received: receivedAmount,
          difference,
          paymentId: paymentId.toString(),
          registrationId
        })

        // Registrar el intento fallido en logs
        await PaymentLogService.logMercadoPagoPaymentRejected(
          { userId: registration.tournament.organizerId, paymentId: payment.id },
          paymentId.toString(),
          `Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`
        )

        return NextResponse.json(
          { error: 'Payment amount mismatch' },
          { status: 400 }
        )
      }

      console.log('✅ Monto validado correctamente:', receivedAmount)
    }

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

    // Log de auditoría
    // Usar usuario 'system' ya que la acción es realizada por MercadoPago (webhook automático)
    // Si el usuario 'system' no existe en la DB, usar el organizador del torneo como fallback
    const logUserId = 'system'

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
