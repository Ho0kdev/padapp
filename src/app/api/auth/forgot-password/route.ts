// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/validations/password-reset'
import { PasswordResetService } from '@/lib/services/password-reset-service'
import { EmailService } from '@/lib/services/email-service'
import { UserLogService } from '@/lib/services/user-log-service'

/**
 * POST /api/auth/forgot-password
 * Solicita recuperación de contraseña
 * Endpoint PÚBLICO (no requiere autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // Obtener IP del request
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Buscar usuario por email
    const user = await PasswordResetService.getUserByEmail(validatedData.email)

    // IMPORTANTE: Siempre retornamos éxito para evitar enumeración de usuarios
    // (no revelar si el email existe o no)
    if (!user) {
      // Log del intento con email inexistente
      await UserLogService.logPasswordResetFailed(
        { userId: 'system', ipAddress },
        validatedData.email,
        'Email no encontrado'
      )

      return NextResponse.json(
        {
          message:
            'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.',
        },
        { status: 200 }
      )
    }

    // Verificar que el usuario esté activo
    if (user.status === 'SUSPENDED') {
      await UserLogService.logPasswordResetFailed(
        { userId: user.id, ipAddress },
        validatedData.email,
        'Usuario suspendido'
      )

      return NextResponse.json(
        {
          message:
            'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.',
        },
        { status: 200 }
      )
    }

    // Invalidar tokens anteriores del usuario
    await PasswordResetService.invalidateUserTokens(user.id)

    // Generar nuevo token
    const { token, expiresAt } = await PasswordResetService.createResetToken({
      userId: user.id,
      ipAddress,
    })

    // Determinar nombre para el email
    const userName =
      user.name ||
      (user.player
        ? `${user.player.firstName} ${user.player.lastName}`
        : user.email.split('@')[0])

    // Calcular minutos de expiración
    const expirationMinutes = Math.round(
      (expiresAt.getTime() - new Date().getTime()) / 60000
    )

    // Enviar email de recuperación
    const emailResult = await EmailService.sendPasswordResetEmail({
      to: user.email,
      name: userName,
      resetToken: token,
      expiresInMinutes: expirationMinutes,
    })

    if (!emailResult.success) {
      console.error('Error enviando email de recuperación:', emailResult.error)
      // Aún así retornamos éxito para no revelar info
    }

    // Log de la solicitud exitosa
    await UserLogService.logPasswordResetRequested(
      { userId: user.id, targetUserId: user.id, ipAddress },
      user
    )

    return NextResponse.json(
      {
        message:
          'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error en forgot-password:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
