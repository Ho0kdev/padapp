import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type CourtLogAction =
  | "COURT_CREATED"
  | "COURT_UPDATED"
  | "COURT_DELETED"
  | "COURT_STATUS_CHANGED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  courtId?: string
  clubId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: CourtLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class CourtLogService {
  /**
   * Registra una acción en el log de canchas
   */
  static async log(context: LogContext, data: LogData) {
    console.log('🔍 CourtLogService.log called:', { action: data.action, userId: context.userId, courtId: context.courtId })
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

      const logEntry = await prisma.courtLog.create({
        data: {
          action: data.action,
          description: data.description,
          courtId: context.courtId,
          clubId: context.clubId,
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
          court: {
            select: {
              name: true
            }
          },
          club: {
            select: {
              name: true
            }
          }
        }
      })

      console.log(`📝 Court log created: ${data.action} by ${logEntry.user.name} (${logEntry.user.email})`)
      return logEntry

    } catch (error) {
      console.error('❌ Error creating court log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de cancha
   */
  static async logCourtCreated(context: LogContext, courtData: any) {
    return this.log(context, {
      action: "COURT_CREATED",
      description: `"${courtData.name}"`,
      newData: this.sanitizeCourtData(courtData),
      metadata: {
        surface: courtData.surface,
        status: courtData.status,
        clubName: courtData.club?.name
      }
    })
  }

  /**
   * Log específico para actualización de cancha
   */
  static async logCourtUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)

    return this.log(context, {
      action: "COURT_UPDATED",
      description: `"${newData.name}"`,
      oldData: this.sanitizeCourtData(oldData),
      newData: this.sanitizeCourtData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes
      }
    })
  }

  /**
   * Log específico para eliminación de cancha
   */
  static async logCourtDeleted(context: LogContext, courtData: any) {
    return this.log(context, {
      action: "COURT_DELETED",
      description: `"${courtData.name}"`,
      oldData: this.sanitizeCourtData(courtData),
      metadata: {
        surface: courtData.surface,
        status: courtData.status,
        clubName: courtData.club?.name
      }
    })
  }

  /**
   * Log específico para cambio de estado de cancha
   */
  static async logCourtStatusChanged(
    context: LogContext,
    courtData: any,
    oldStatus: string,
    newStatus: string
  ) {
    return this.log(context, {
      action: "COURT_STATUS_CHANGED",
      description: `"${courtData.name}" (${oldStatus} → ${newStatus})`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        courtName: courtData.name,
        statusTransition: `${oldStatus} → ${newStatus}`,
        clubName: courtData.club?.name
      }
    })
  }

  /**
   * Obtener logs de una cancha específica
   */
  static async getCourtLogs(courtId: string, limit: number = 50) {
    return prisma.courtLog.findMany({
      where: { courtId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        club: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Obtener logs de un club específico
   */
  static async getClubCourtLogs(clubId: string, limit: number = 100) {
    return prisma.courtLog.findMany({
      where: { clubId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        court: {
          select: {
            name: true
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
    return prisma.courtLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        court: {
          select: {
            name: true
          }
        },
        club: {
          select: {
            name: true
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

    const stats = await prisma.courtLog.groupBy({
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

    const totalLogs = await prisma.courtLog.count({
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
   * Sanitizar datos de la cancha para el log (remover campos sensibles)
   */
  private static sanitizeCourtData(data: any) {
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
      'name', 'surface', 'hasLighting', 'hasRoof', 'isOutdoor',
      'hasPanoramicGlass', 'hasConcreteWall', 'hasNet4m', 'status',
      'hourlyRate', 'notes'
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