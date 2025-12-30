// src/lib/services/password-reset-service.ts
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

interface CreateResetTokenParams {
  userId: string
  ipAddress?: string
}

interface ValidateResetTokenResult {
  valid: boolean
  userId?: string
  error?: string
}

export class PasswordResetService {
  // Tiempo de expiración en minutos
  static readonly EXPIRATION_MINUTES = 60 // 1 hora

  /**
   * Genera un token seguro de recuperación de contraseña
   * @param params Parámetros para crear el token
   * @returns Token generado (string aleatorio de 32 bytes)
   */
  static async createResetToken(
    params: CreateResetTokenParams
  ): Promise<{ token: string; expiresAt: Date }> {
    const { userId, ipAddress } = params

    // Generar token aleatorio de 32 bytes (64 caracteres hex)
    const token = crypto.randomBytes(32).toString('hex')

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES)

    // Guardar token en DB
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress,
      },
    })

    return { token, expiresAt }
  }

  /**
   * Valida un token de recuperación de contraseña
   * @param token Token a validar
   * @returns Resultado de validación con userId si es válido
   */
  static async validateResetToken(
    token: string
  ): Promise<ValidateResetTokenResult> {
    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      })

      // Token no existe
      if (!resetToken) {
        return { valid: false, error: 'Token inválido o expirado' }
      }

      // Token ya usado
      if (resetToken.used) {
        return { valid: false, error: 'Este token ya fue utilizado' }
      }

      // Token expirado
      if (new Date() > resetToken.expiresAt) {
        return { valid: false, error: 'El token ha expirado' }
      }

      // Usuario suspendido
      if (resetToken.user.status === 'SUSPENDED') {
        return {
          valid: false,
          error: 'Tu cuenta está suspendida. Contacta a soporte.',
        }
      }

      return { valid: true, userId: resetToken.userId }
    } catch (error) {
      console.error('Error validando token de reset:', error)
      return { valid: false, error: 'Error al validar el token' }
    }
  }

  /**
   * Marca un token como usado
   * @param token Token a marcar como usado
   */
  static async markTokenAsUsed(token: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { token },
      data: {
        used: true,
        usedAt: new Date(),
      },
    })
  }

  /**
   * Invalida todos los tokens de reset de un usuario
   * @param userId ID del usuario
   */
  static async invalidateUserTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
        usedAt: new Date(),
      },
    })
  }

  /**
   * Limpia tokens expirados de la base de datos (cron job recomendado)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expirados
          {
            used: true,
            usedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Usados hace más de 7 días
          },
        ],
      },
    })

    return result.count
  }

  /**
   * Obtiene el usuario asociado a un email (para iniciar el flujo de reset)
   * @param email Email del usuario
   * @returns Usuario si existe y está activo
   */
  static async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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
  }
}
