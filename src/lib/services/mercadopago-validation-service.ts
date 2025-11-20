/**
 * MercadoPagoValidationService
 *
 * Servicio para validar la autenticidad de las notificaciones webhook de MercadoPago
 * Implementa verificación de firma x-signature según documentación oficial
 * Ref: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */

import crypto from 'crypto'

export interface WebhookValidationParams {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
  body: any
}

/**
 * Valida la firma del webhook de MercadoPago
 * @throws Error si la validación falla
 */
export function validateWebhookSignature(params: WebhookValidationParams): void {
  const { xSignature, xRequestId, dataId, body } = params

  // Validar que existan los headers necesarios
  if (!xSignature) {
    throw new Error('Missing x-signature header')
  }

  if (!xRequestId) {
    throw new Error('Missing x-request-id header')
  }

  // Obtener el secret desde las variables de entorno
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  if (!secret) {
    console.error('⚠️ MERCADOPAGO_WEBHOOK_SECRET no configurado - VALIDACIÓN DESHABILITADA')
    // En desarrollo, permitir continuar sin validación
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MERCADOPAGO_WEBHOOK_SECRET not configured')
    }
    console.warn('⚠️ Webhook processing without signature validation (development mode)')
    return
  }

  try {
    // Extraer ts y hash de x-signature
    // Formato: "ts=1704067200,v1=abc123..."
    const signatureParts = xSignature.split(',')
    let ts: string | undefined
    let hash: string | undefined

    for (const part of signatureParts) {
      const [key, value] = part.split('=')
      if (key === 'ts') {
        ts = value
      } else if (key === 'v1') {
        hash = value
      }
    }

    if (!ts || !hash) {
      throw new Error('Invalid x-signature format')
    }

    // Construir el manifest (string a firmar)
    // Formato: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    // Calcular HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(manifest)
    const expectedHash = hmac.digest('hex')

    // Comparar hashes de forma segura (evitar timing attacks)
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      throw new Error('Invalid signature - hash mismatch')
    }

    console.log('✅ Webhook signature validated successfully')
  } catch (error) {
    console.error('❌ Webhook signature validation failed:', error)
    throw new Error(`Webhook signature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verifica si un webhook es reciente (menos de 5 minutos de antigüedad)
 * Ayuda a prevenir replay attacks
 */
export function validateWebhookTimestamp(xSignature: string | null): void {
  if (!xSignature) {
    return
  }

  try {
    const signatureParts = xSignature.split(',')
    let ts: string | undefined

    for (const part of signatureParts) {
      const [key, value] = part.split('=')
      if (key === 'ts') {
        ts = value
        break
      }
    }

    if (!ts) {
      return
    }

    const timestamp = parseInt(ts, 10)
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp

    // Permitir webhooks de hasta 5 minutos de antigüedad
    const MAX_AGE_SECONDS = 5 * 60

    if (diff > MAX_AGE_SECONDS) {
      console.warn(`⚠️ Webhook is too old: ${diff} seconds`)
      throw new Error('Webhook timestamp is too old (possible replay attack)')
    }

    if (diff < -60) {
      console.warn(`⚠️ Webhook timestamp is in the future: ${diff} seconds`)
      throw new Error('Webhook timestamp is in the future')
    }

    console.log(`✅ Webhook timestamp validated (${diff}s old)`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Webhook timestamp')) {
      throw error
    }
    console.warn('⚠️ Could not validate webhook timestamp:', error)
    // No lanzar error si no se puede parsear el timestamp
  }
}

export const MercadoPagoValidationService = {
  validateWebhookSignature,
  validateWebhookTimestamp,
}
