import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type RegistrationLogAction =
  | "REGISTRATION_CREATED"
  | "REGISTRATION_UPDATED"
  | "REGISTRATION_DELETED"
  | "REGISTRATION_STATUS_CHANGED"
  | "REGISTRATION_PAYMENT_UPDATED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  registrationId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: RegistrationLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class RegistrationLogService {
  /**
   * Registra una acción en el log de inscripciones
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

      const logEntry = await prisma.registrationLog.create({
        data: {
          action: data.action,
          description: data.description,
          registrationId: context.registrationId,
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
          registration: {
            select: {
              id: true,
              registrationStatus: true,
              player: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              tournament: {
                select: {
                  name: true
                }
              },
              category: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      return logEntry

    } catch (error) {
      console.error('❌ Error creating registration log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de inscripción
   */
  static async logRegistrationCreated(context: LogContext, registrationData: any) {
    const playerName = registrationData.player
      ? `${registrationData.player.firstName} ${registrationData.player.lastName}`
      : 'Jugador'
    const tournamentName = registrationData.tournament?.name || 'Torneo'
    const categoryName = registrationData.category?.name || 'Categoría'

    return this.log(context, {
      action: "REGISTRATION_CREATED",
      description: `${playerName} inscrito en ${tournamentName} - ${categoryName}`,
      newData: this.sanitizeRegistrationData(registrationData),
      metadata: {
        tournamentId: registrationData.tournamentId,
        categoryId: registrationData.categoryId,
        playerId: registrationData.playerId,
        status: registrationData.registrationStatus,
        tournamentName,
        categoryName,
        playerName
      }
    })
  }

  /**
   * Log específico para actualización de inscripción
   */
  static async logRegistrationUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)
    const playerName = newData.player
      ? `${newData.player.firstName} ${newData.player.lastName}`
      : 'Jugador'

    return this.log(context, {
      action: "REGISTRATION_UPDATED",
      description: `Inscripción de ${playerName} actualizada`,
      oldData: this.sanitizeRegistrationData(oldData),
      newData: this.sanitizeRegistrationData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes,
        playerName
      }
    })
  }

  /**
   * Log específico para eliminación de inscripción
   */
  static async logRegistrationDeleted(context: LogContext, registrationData: any) {
    const playerName = registrationData.player
      ? `${registrationData.player.firstName} ${registrationData.player.lastName}`
      : 'Jugador'
    const tournamentName = registrationData.tournament?.name || 'Torneo'

    return this.log(context, {
      action: "REGISTRATION_DELETED",
      description: `Inscripción de ${playerName} en ${tournamentName} eliminada`,
      oldData: this.sanitizeRegistrationData(registrationData),
      metadata: {
        tournamentId: registrationData.tournamentId,
        categoryId: registrationData.categoryId,
        playerId: registrationData.playerId,
        playerName,
        tournamentName
      }
    })
  }

  /**
   * Log específico para cambio de estado de inscripción
   */
  static async logRegistrationStatusChanged(
    context: LogContext,
    registrationData: any,
    oldStatus: string,
    newStatus: string
  ) {
    const playerName = registrationData.player
      ? `${registrationData.player.firstName} ${registrationData.player.lastName}`
      : 'Jugador'

    return this.log(context, {
      action: "REGISTRATION_STATUS_CHANGED",
      description: `Inscripción de ${playerName}: ${oldStatus} → ${newStatus}`,
      oldData: { registrationStatus: oldStatus },
      newData: { registrationStatus: newStatus },
      metadata: {
        playerName,
        statusTransition: `${oldStatus} → ${newStatus}`,
        tournamentId: registrationData.tournamentId,
        categoryId: registrationData.categoryId
      }
    })
  }

  /**
   * Log específico para actualización de pago de inscripción
   */
  static async logRegistrationPaymentUpdated(
    context: LogContext,
    registrationData: any,
    paymentData: any
  ) {
    const playerName = registrationData.player
      ? `${registrationData.player.firstName} ${registrationData.player.lastName}`
      : 'Jugador'

    return this.log(context, {
      action: "REGISTRATION_PAYMENT_UPDATED",
      description: `Pago de inscripción de ${playerName}: ${paymentData.paymentStatus}`,
      newData: paymentData,
      metadata: {
        playerName,
        paymentStatus: paymentData.paymentStatus,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod
      }
    })
  }

  /**
   * Obtener logs de una inscripción específica
   */
  static async getRegistrationLogs(registrationId: string, limit: number = 50) {
    return prisma.registrationLog.findMany({
      where: { registrationId },
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
    return prisma.registrationLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        registration: {
          select: {
            id: true,
            registrationStatus: true,
            player: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            tournament: {
              select: {
                name: true
              }
            }
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

    const stats = await prisma.registrationLog.groupBy({
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

    const totalLogs = await prisma.registrationLog.count({
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
   * Sanitizar datos de la inscripción para el log (remover campos sensibles)
   */
  private static sanitizeRegistrationData(data: any) {
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
      'registrationStatus', 'notes', 'playerId', 'categoryId', 'tournamentId'
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
