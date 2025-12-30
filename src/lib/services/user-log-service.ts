import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type UserLogAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_STATUS_CHANGED"
  | "USER_ROLE_CHANGED"
  | "USER_ACTION"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_RESET_FAILED"

interface LogContext {
  userId: string
  targetUserId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: UserLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class UserLogService {
  /**
   * Registra una acción en el log de usuarios
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

      const logEntry = await prisma.userLog.create({
        data: {
          action: data.action,
          description: data.description,
          targetUserId: context.targetUserId,
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
          targetUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return logEntry

    } catch (error) {
      console.error('❌ Error creating user log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de usuario
   */
  static async logUserCreated(context: LogContext, userData: any) {
    return this.log(context, {
      action: "USER_CREATED",
      description: `"${userData.name || userData.email}"`,
      newData: this.sanitizeUserData(userData),
      metadata: {
        role: userData.role,
        status: userData.status,
        email: userData.email
      }
    })
  }

  /**
   * Log específico para actualización de usuario
   */
  static async logUserUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)

    return this.log(context, {
      action: "USER_UPDATED",
      description: `"${newData.name || newData.email}"`,
      oldData: this.sanitizeUserData(oldData),
      newData: this.sanitizeUserData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes
      }
    })
  }

  /**
   * Log específico para eliminación de usuario
   */
  static async logUserDeleted(context: LogContext, userData: any) {
    return this.log(context, {
      action: "USER_DELETED",
      description: `"${userData.name || userData.email}"`,
      oldData: this.sanitizeUserData(userData),
      metadata: {
        role: userData.role,
        status: userData.status,
        email: userData.email
      }
    })
  }

  /**
   * Log específico para cambio de estado de usuario
   */
  static async logUserStatusChanged(
    context: LogContext,
    userData: any,
    oldStatus: string,
    newStatus: string
  ) {
    return this.log(context, {
      action: "USER_STATUS_CHANGED",
      description: `"${userData.name || userData.email}" (${oldStatus} → ${newStatus})`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        userName: userData.name,
        userEmail: userData.email,
        statusTransition: `${oldStatus} → ${newStatus}`
      }
    })
  }

  /**
   * Log específico para cambio de rol de usuario
   */
  static async logUserRoleChanged(
    context: LogContext,
    userData: any,
    oldRole: string,
    newRole: string
  ) {
    return this.log(context, {
      action: "USER_ROLE_CHANGED",
      description: `"${userData.name || userData.email}" (${oldRole} → ${newRole})`,
      oldData: { role: oldRole },
      newData: { role: newRole },
      metadata: {
        userName: userData.name,
        userEmail: userData.email,
        roleTransition: `${oldRole} → ${newRole}`
      }
    })
  }

  /**
   * Log específico para solicitud de reset de contraseña
   */
  static async logPasswordResetRequested(
    context: LogContext,
    userData: any
  ) {
    return this.log(context, {
      action: "PASSWORD_RESET_REQUESTED",
      description: `Solicitud de recuperación de contraseña: "${userData.email}"`,
      metadata: {
        email: userData.email,
        userName: userData.name,
      }
    })
  }

  /**
   * Log específico para reset de contraseña completado
   */
  static async logPasswordResetCompleted(
    context: LogContext,
    userData: any
  ) {
    return this.log(context, {
      action: "PASSWORD_RESET_COMPLETED",
      description: `Contraseña restablecida exitosamente: "${userData.email}"`,
      metadata: {
        email: userData.email,
        userName: userData.name,
      }
    })
  }

  /**
   * Log específico para intento fallido de reset de contraseña
   */
  static async logPasswordResetFailed(
    context: LogContext,
    email: string,
    reason: string
  ) {
    return this.log(context, {
      action: "PASSWORD_RESET_FAILED",
      description: `Intento fallido de reset de contraseña: "${email}" - ${reason}`,
      metadata: {
        email,
        reason,
      }
    })
  }

  /**
   * Obtener logs de un usuario específico
   */
  static async getUserLogs(targetUserId: string, limit: number = 50) {
    return prisma.userLog.findMany({
      where: { targetUserId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Obtener logs recientes (para dashboard de admin)
   */
  static async getRecentLogs(limit: number = 100) {
    return prisma.userLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        targetUser: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Obtener estadísticas de logs
   */
  static async getLogStats(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await prisma.userLog.groupBy({
      by: ['action'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })

    const totalLogs = await prisma.userLog.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })

    return {
      stats: stats.map(stat => ({
        action: stat.action,
        count: stat._count.id
      })),
      total: totalLogs,
      period: `${days} días`
    }
  }

  /**
   * Sanitizar datos del usuario para el log (remover campos sensibles)
   */
  private static sanitizeUserData(data: any) {
    if (!data) return null

    const { password, ...sanitized } = data
    return sanitized
  }

  /**
   * Comparar dos objetos y obtener los cambios
   */
  private static getChanges(oldData: any, newData: any) {
    const changes: Record<string, { from: any; to: any }> = {}

    // Campos importantes a trackear
    const importantFields = [
      'name', 'email', 'role', 'status', 'image', 'emailVerified'
    ]

    importantFields.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes[field] = {
          from: oldData[field],
          to: newData[field]
        }
      }
    })

    return changes
  }
}
