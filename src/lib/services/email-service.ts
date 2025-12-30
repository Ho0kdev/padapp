// src/lib/services/email-service.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'PadelShot <noreply@padelshot.app>',
        to: [to],
        subject: 'Recuperación de Contraseña - PadelShot',
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎾 PadelShot</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #667eea; margin-top: 0;">Recuperación de Contraseña</h2>

    <p>Hola <strong>${name}</strong>,</p>

    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en PadelShot.</p>

    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        Restablecer Contraseña
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all; font-size: 12px; color: #667eea;">
      ${resetUrl}
    </p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        ⏰ <strong>Este enlace expirará en ${expiresInMinutes} minutos.</strong>
      </p>
    </div>

    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">
        🔒 <strong>¿No solicitaste este cambio?</strong><br>
        Si no solicitaste restablecer tu contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Este es un correo automático, por favor no respondas.<br>
      © ${new Date().getFullYear()} PadelShot - Sistema de Gestión de Torneos de Pádel
    </p>
  </div>
</body>
</html>
        `,
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
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'PadelShot <noreply@padelshot.app>',
        to: [to],
        subject: 'Contraseña Actualizada - PadelShot',
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Actualizada</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ PadelShot</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #28a745; margin-top: 0;">Contraseña Actualizada Exitosamente</h2>

    <p>Hola <strong>${name}</strong>,</p>

    <p>Te confirmamos que la contraseña de tu cuenta en PadelShot ha sido actualizada correctamente.</p>

    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #155724; font-size: 14px;">
        🔐 Tu cuenta está segura. Ya puedes iniciar sesión con tu nueva contraseña.
      </p>
    </div>

    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">
        ⚠️ <strong>¿No realizaste este cambio?</strong><br>
        Si no fuiste tú quien cambió la contraseña, contacta inmediatamente con soporte.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Este es un correo automático, por favor no respondas.<br>
      © ${new Date().getFullYear()} PadelShot - Sistema de Gestión de Torneos de Pádel
    </p>
  </div>
</body>
</html>
        `,
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
