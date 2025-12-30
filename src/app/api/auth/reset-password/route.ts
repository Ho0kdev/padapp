// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { resetPasswordSchema } from '@/lib/validations/password-reset'
import { PasswordResetService } from '@/lib/services/password-reset-service'
import { EmailService } from '@/lib/services/email-service'
import { UserLogService } from '@/lib/services/user-log-service'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña usando un token válido
 * Endpoint PÚBLICO (no requiere autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // Obtener IP del request
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // 1. Validar token
    const validation = await PasswordResetService.validateResetToken(
      validatedData.token
    )

    if (!validation.valid || !validation.userId) {
      await UserLogService.logPasswordResetFailed(
        { userId: 'system', ipAddress },
        'unknown',
        validation.error || 'Token inválido'
      )

      return NextResponse.json(
        { error: validation.error || 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    // 2. Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        player: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!user) {
      await UserLogService.logPasswordResetFailed(
        { userId: 'system', ipAddress },
        'unknown',
        'Usuario no encontrado'
      )

      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // 3. Verificar que el usuario esté activo
    if (user.status === 'SUSPENDED') {
      await UserLogService.logPasswordResetFailed(
        { userId: user.id, ipAddress },
        user.email,
        'Usuario suspendido'
      )

      return NextResponse.json(
        { error: 'Tu cuenta está suspendida. Contacta a soporte.' },
        { status: 403 }
      )
    }

    // 4. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 5. Actualizar contraseña en DB
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // 6. Marcar token como usado
    await PasswordResetService.markTokenAsUsed(validatedData.token)

    // 7. Invalidar cualquier otro token del usuario
    await PasswordResetService.invalidateUserTokens(user.id)

    // 8. Log de operación exitosa
    await UserLogService.logPasswordResetCompleted(
      { userId: user.id, targetUserId: user.id, ipAddress },
      user
    )

    // 9. Enviar email de confirmación
    const userName =
      user.name ||
      (user.player
        ? `${user.player.firstName} ${user.player.lastName}`
        : user.email.split('@')[0])

    await EmailService.sendPasswordChangeConfirmation(user.email, userName)

    return NextResponse.json(
      {
        message: 'Contraseña actualizada exitosamente',
        success: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error en reset-password:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al restablecer la contraseña' },
      { status: 500 }
    )
  }
}
