/**
 * PaymentLogService
 *
 * Servicio de auditoría para operaciones de pagos
 * Registra todas las acciones relacionadas con pagos (creación, actualización, confirmación manual, reembolsos)
 */

import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { RegistrationPayment } from "@prisma/client"

export type PaymentLogAction =
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_MANUALLY_CONFIRMED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_CANCELLED"
  | "MERCADOPAGO_PREFERENCE_CREATED"
  | "MERCADOPAGO_WEBHOOK_RECEIVED"
  | "MERCADOPAGO_PAYMENT_APPROVED"
  | "MERCADOPAGO_PAYMENT_REJECTED"

interface LogContext {
  userId: string
  paymentId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: PaymentLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class PaymentLogService {
  /**
   * Registra una acción en el log de pagos
   */
  static async log(context: LogContext, data: LogData) {
    try {
      // Obtener información del request si está disponible
      let ipAddress = context.ipAddress
      let userAgent = context.userAgent

      if (!ipAddress || !userAgent) {
        try {
          const headersList = await headers()
          ipAddress = ipAddress || headersList.get('x-forwarded-for')?.split(',')[0] ||
                     headersList.get('x-real-ip') || 'unknown'
          userAgent = userAgent || headersList.get('user-agent') || 'unknown'
        } catch (error) {
          // Si no podemos obtener headers (ej: en contexto de servidor), usar valores por defecto
          ipAddress = ipAddress || 'server'
          userAgent = userAgent || 'server'
        }
      }

      const logEntry = await prisma.paymentLog.create({
        data: {
          action: data.action,
          description: data.description,
          paymentId: context.paymentId,
          userId: context.userId,
          ipAddress,
          userAgent,
          oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : null,
          newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : null,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
              registration: {
                select: {
                  id: true,
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  },
                  tournament: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return logEntry

    } catch (error) {
      console.error('❌ Error creating payment log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Registra la creación de un pago
   */
  static async logPaymentCreated(context: LogContext, payment: RegistrationPayment) {
    return await this.log(context, {
      action: "PAYMENT_CREATED",
      description: `Pago creado: ${payment.paymentMethod} - $${payment.amount}`,
      newData: payment,
    })
  }

  /**
   * Registra la actualización de un pago
   */
  static async logPaymentUpdated(
    context: LogContext,
    oldPayment: RegistrationPayment,
    newPayment: RegistrationPayment
  ) {
    return await this.log(context, {
      action: "PAYMENT_UPDATED",
      description: `Pago actualizado: ${oldPayment.paymentStatus} → ${newPayment.paymentStatus}`,
      oldData: oldPayment,
      newData: newPayment,
    })
  }

  /**
   * Registra la confirmación manual de un pago
   */
  static async logPaymentConfirmedManually(context: LogContext, payment: RegistrationPayment) {
    return await this.log(context, {
      action: "PAYMENT_MANUALLY_CONFIRMED",
      description: `Pago confirmado manualmente: $${payment.amount}`,
      newData: payment,
    })
  }

  /**
   * Registra un reembolso
   */
  static async logPaymentRefunded(
    context: LogContext,
    payment: RegistrationPayment,
    reason: string
  ) {
    return await this.log(context, {
      action: "PAYMENT_REFUNDED",
      description: `Pago reembolsado: $${payment.amount}`,
      newData: payment,
      metadata: { reason },
    })
  }

  /**
   * Registra la cancelación de un pago
   */
  static async logPaymentCancelled(context: LogContext, payment: RegistrationPayment) {
    return await this.log(context, {
      action: "PAYMENT_CANCELLED",
      description: `Pago cancelado: $${payment.amount}`,
      newData: payment,
    })
  }

  /**
   * Registra la creación de una preferencia de Mercado Pago
   */
  static async logMercadoPagoPreferenceCreated(
    context: LogContext,
    preferenceId: string,
    amount: number
  ) {
    return await this.log(context, {
      action: "MERCADOPAGO_PREFERENCE_CREATED",
      description: `Preferencia de Mercado Pago creada: $${amount}`,
      metadata: { preferenceId, amount },
    })
  }

  /**
   * Registra la recepción de un webhook de Mercado Pago
   */
  static async logMercadoPagoWebhookReceived(
    context: LogContext,
    webhookData: any
  ) {
    return await this.log(context, {
      action: "MERCADOPAGO_WEBHOOK_RECEIVED",
      description: `Webhook de Mercado Pago recibido: ${webhookData.type}`,
      metadata: webhookData,
    })
  }

  /**
   * Registra un pago aprobado por Mercado Pago
   */
  static async logMercadoPagoPaymentApproved(
    context: LogContext,
    payment: RegistrationPayment,
    mercadoPagoPaymentId: string
  ) {
    return await this.log(context, {
      action: "MERCADOPAGO_PAYMENT_APPROVED",
      description: `Pago aprobado por Mercado Pago: $${payment.amount}`,
      newData: payment,
      metadata: { mercadoPagoPaymentId },
    })
  }

  /**
   * Registra un pago rechazado por Mercado Pago
   */
  static async logMercadoPagoPaymentRejected(
    context: LogContext,
    mercadoPagoPaymentId: string,
    statusDetail: string
  ) {
    return await this.log(context, {
      action: "MERCADOPAGO_PAYMENT_REJECTED",
      description: `Pago rechazado por Mercado Pago: ${statusDetail}`,
      metadata: { mercadoPagoPaymentId, statusDetail },
    })
  }
}
