// src/lib/email-templates/password-reset.ts

interface PasswordResetTemplateParams {
  name: string
  resetUrl: string
  expiresInMinutes: number
}

export function getPasswordResetEmailTemplate(params: PasswordResetTemplateParams): string {
  const { name, resetUrl, expiresInMinutes } = params

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header con logo -->
  <div style="background: #50b4d3; padding: 10px; text-align: center; border-radius: 10px 10px 0 0;">
    <img src="https://padelshot.app/icon-512.png" alt="PadelShot" style="height: 140px; width: 140px;" />
  </div>

  <!-- Contenido principal -->
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #50b4d3; margin-top: 0;">Recuperación de Contraseña</h2>

    <p>Hola <strong>${name}</strong>,</p>

    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en PadelShot.</p>

    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>

    <!-- Botón CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background: #50b4d3;
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

    <!-- Link alternativo -->
    <p style="color: #666; font-size: 14px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all; font-size: 12px; color: #3B82F6;">
      ${resetUrl}
    </p>

    <!-- Advertencia de expiración -->
    <div style="background: #fff3cd; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        ⏰ <strong>Este enlace expirará en ${expiresInMinutes} minutos.</strong>
      </p>
    </div>

    <!-- Nota de seguridad -->
    <div style="background: #f8d7da; border-left: 4px solid #EF4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">
        🔒 <strong>¿No solicitaste este cambio?</strong><br>
        Si no solicitaste restablecer tu contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <!-- Footer -->
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Este es un correo automático, por favor no respondas.<br>
      © ${new Date().getFullYear()} PadelShot - Sistema de Gestión de Torneos de Pádel
    </p>
  </div>
</body>
</html>
  `
}
