// src/lib/services/email-service.ts
import { Resend } from 'resend'
import { getPasswordResetEmailTemplate } from '@/lib/email-templates/password-reset'
import { getPasswordChangedEmailTemplate } from '@/lib/email-templates/password-changed'

// Lazy-load Resend client to avoid build errors when env var is not available
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

interface PasswordResetEmailParams {
  to: string
  name: string
  resetToken: string
  expiresInMinutes: number
}

export class EmailService {
  /**
   * Envía un email de recuperación de contraseña
   * @param params Parámetros del email
   * @returns ID del email enviado o null si falló
   */
  static async sendPasswordResetEmail(
    params: PasswordResetEmailParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { to, name, resetToken, expiresInMinutes } = params

      // Construir URL de reset (cambiar según tu dominio)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

      const resend = getResendClient()
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'PadelShot <noreply@padelshot.app>',
        to: [to],
        subject: 'Recuperación de Contraseña - PadelShot',
        html: getPasswordResetEmailTemplate({
          name,
          resetUrl,
          expiresInMinutes,
          baseUrl,
        }),
      })

      if (error) {
        console.error('Error enviando email de recuperación:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Error en sendPasswordResetEmail:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Envía un email de confirmación de cambio de contraseña
   * @param to Email del destinatario
   * @param name Nombre del usuario
   */
  static async sendPasswordChangeConfirmation(
    to: string,
    name: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const resend = getResendClient()
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'PadelShot <noreply@padelshot.app>',
        to: [to],
        subject: 'Contraseña Actualizada - PadelShot',
        html: getPasswordChangedEmailTemplate({ name, baseUrl }),
      })

      if (error) {
        console.error('Error enviando email de confirmación:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Error en sendPasswordChangeConfirmation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
