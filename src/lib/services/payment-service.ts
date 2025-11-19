/**
 * PaymentService
 *
 * Servicio para gestionar pagos con Mercado Pago
 * Incluye creación de preferencias, verificación de pagos y webhooks
 */

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

// Validar que exista el access token
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno')
}

// Configurar cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  },
})

const preferenceClient = new Preference(client)
const paymentClient = new Payment(client)

export interface CreatePreferenceParams {
  registrationId: string
  amount: number
  description: string
  payer: {
    email: string
    name?: string
  }
}

export interface PreferenceResponse {
  id: string
  initPoint: string
  sandboxInitPoint: string
}

/**
 * Crea una preferencia de pago en Mercado Pago
 */
export async function createPaymentPreference(
  params: CreatePreferenceParams
): Promise<PreferenceResponse> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    console.log('🌐 Base URL para MercadoPago:', baseUrl)
    console.log('📧 Email del pagador:', params.payer.email)
    console.log('💰 Monto:', params.amount)

    // Construir las URLs de retorno
    const successUrl = `${baseUrl}/dashboard/registrations/${params.registrationId}?payment=success`
    const failureUrl = `${baseUrl}/dashboard/registrations/${params.registrationId}?payment=failure`
    const pendingUrl = `${baseUrl}/dashboard/registrations/${params.registrationId}?payment=pending`

    console.log('🔗 Success URL:', successUrl)

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: params.registrationId,
            title: params.description,
            quantity: 1,
            unit_price: params.amount,
            currency_id: 'ARS', // Pesos argentinos
          },
        ],
        payer: {
          email: params.payer.email,
          name: params.payer.name,
        },
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        // auto_return: 'approved', // Comentado temporalmente - causa error con algunas versiones del SDK
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: params.registrationId,
        statement_descriptor: 'PADAPP',
        metadata: {
          registration_id: params.registrationId,
        },
      },
    })

    return {
      id: preference.id!,
      initPoint: preference.init_point!,
      sandboxInitPoint: preference.sandbox_init_point!,
    }
  } catch (error) {
    console.error('Error creando preferencia de Mercado Pago:', error)

    // Mostrar detalles del error para debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // Si es un error de MercadoPago, mostrar más detalles
    if (typeof error === 'object' && error !== null && 'cause' in error) {
      console.error('Error cause:', error.cause)
    }

    throw new Error(`No se pudo crear la preferencia de pago: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

/**
 * Obtiene información de un pago por su ID
 */
export async function getPaymentInfo(paymentId: string) {
  try {
    const payment = await paymentClient.get({ id: paymentId })
    return payment
  } catch (error) {
    console.error('Error obteniendo información del pago:', error)
    throw new Error('No se pudo obtener la información del pago')
  }
}

/**
 * Verifica el estado de un pago
 */
export async function verifyPaymentStatus(paymentId: string): Promise<{
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded'
  statusDetail: string
  amount: number
  externalReference?: string
}> {
  try {
    const payment = await paymentClient.get({ id: paymentId })

    return {
      status: payment.status as any,
      statusDetail: payment.status_detail || '',
      amount: payment.transaction_amount || 0,
      externalReference: payment.external_reference || undefined,
    }
  } catch (error) {
    console.error('Error verificando estado del pago:', error)
    throw new Error('No se pudo verificar el estado del pago')
  }
}

/**
 * Mapea el estado de Mercado Pago a PaymentStatus de la DB
 */
export function mapMercadoPagoStatus(
  mpStatus: string
): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (mpStatus) {
    case 'approved':
      return 'PAID'
    case 'pending':
    case 'in_process':
    case 'in_mediation':
      return 'PENDING'
    case 'rejected':
      return 'FAILED'
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED'
    case 'cancelled':
      return 'CANCELLED'
    default:
      return 'PENDING'
  }
}

/**
 * Mapea el método de pago de Mercado Pago a PaymentMethod de la DB
 */
export function mapMercadoPagoPaymentType(
  paymentTypeId: string
): 'MERCADOPAGO_CARD' | 'MERCADOPAGO_WALLET' {
  switch (paymentTypeId) {
    case 'credit_card':
    case 'debit_card':
    case 'prepaid_card':
      return 'MERCADOPAGO_CARD'
    case 'digital_wallet':
    case 'account_money':
      return 'MERCADOPAGO_WALLET'
    default:
      return 'MERCADOPAGO_CARD'
  }
}

export const PaymentService = {
  createPaymentPreference,
  getPaymentInfo,
  verifyPaymentStatus,
  mapMercadoPagoStatus,
  mapMercadoPagoPaymentType,
}
