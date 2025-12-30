// src/lib/email-templates/password-changed.ts

interface PasswordChangedTemplateParams {
  name: string
}

export function getPasswordChangedEmailTemplate(params: PasswordChangedTemplateParams): string {
  const { name } = params

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Actualizada</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header con logo -->
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ PadelShot</h1>
  </div>

  <!-- Contenido principal -->
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #28a745; margin-top: 0;">Contraseña Actualizada Exitosamente</h2>

    <p>Hola <strong>${name}</strong>,</p>

    <p>Te confirmamos que la contraseña de tu cuenta en PadelShot ha sido actualizada correctamente.</p>

    <!-- Confirmación exitosa -->
    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #155724; font-size: 14px;">
        🔐 Tu cuenta está segura. Ya puedes iniciar sesión con tu nueva contraseña.
      </p>
    </div>

    <!-- Alerta de seguridad -->
    <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">
        ⚠️ <strong>¿No realizaste este cambio?</strong><br>
        Si no fuiste tú quien cambió la contraseña, contacta inmediatamente con soporte.
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
