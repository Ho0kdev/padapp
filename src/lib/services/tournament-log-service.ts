import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type LogAction =
  | "TOURNAMENT_CREATED"
  | "TOURNAMENT_UPDATED"
  | "TOURNAMENT_DELETED"
  | "TOURNAMENT_STATUS_CHANGED"
  | "TEAM_REGISTERED"
  | "TEAM_UNREGISTERED"
  | "MATCH_CREATED"
  | "MATCH_UPDATED"
  | "MATCH_RESULT_ADDED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  tournamentId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: LogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class TournamentLogService {
  /**
   * Registra una acción en el log de torneos
   */
  static async log(context: LogContext, data: LogData) {
    console.log('🔍 TournamentLogService.log called:', { action: data.action, userId: context.userId, tournamentId: context.tournamentId })
    try {
      // Obtener información del request si está disponible
      let ipAddress = context.ipAddress
      let userAgent = context.userAgent

      if (!ipAddress || !userAgent) {
        try {
          const headersList = headers()
          ipAddress = ipAddress || headersList.get('x-forwarded-for')?.split(',')[0] ||
                     headersList.get('x-real-ip') || 'unknown'
          userAgent = userAgent || headersList.get('user-agent') || 'unknown'
        } catch (error) {
          // Si no podemos obtener headers (ej: en contexto de servidor), usar valores por defecto
          ipAddress = ipAddress || 'server'
          userAgent = userAgent || 'server'
        }
      }

      const logEntry = await prisma.tournamentLog.create({
        data: {
          action: data.action,
          description: data.description,
          tournamentId: context.tournamentId,
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
          tournament: {
            select: {
              name: true
            }
          }
        }
      })

      console.log(`📝 Log created: ${data.action} by ${logEntry.user.name} (${logEntry.user.email})`)
      return logEntry

    } catch (error) {
      console.error('❌ Error creating tournament log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de torneo
   */
  static async logTournamentCreated(context: LogContext, tournamentData: any) {
    return this.log(context, {
      action: "TOURNAMENT_CREATED",
      description: `"${tournamentData.name}"`,
      newData: this.sanitizeTournamentData(tournamentData),
      metadata: {
        type: tournamentData.type,
        status: tournamentData.status,
        visibility: tournamentData.visibility
      }
    })
  }

  /**
   * Log específico para actualización de torneo
   */
  static async logTournamentUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)

    return this.log(context, {
      action: "TOURNAMENT_UPDATED",
      description: `"${newData.name}"`,
      oldData: this.sanitizeTournamentData(oldData),
      newData: this.sanitizeTournamentData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes
      }
    })
  }

  /**
   * Log específico para eliminación de torneo
   */
  static async logTournamentDeleted(context: LogContext, tournamentData: any) {
    return this.log(context, {
      action: "TOURNAMENT_DELETED",
      description: `"${tournamentData.name}"`,
      oldData: this.sanitizeTournamentData(tournamentData),
      metadata: {
        type: tournamentData.type,
        status: tournamentData.status,
        teamsCount: tournamentData._count?.teams || 0
      }
    })
  }

  /**
   * Log específico para cambio de estado de torneo
   */
  static async logTournamentStatusChanged(
    context: LogContext,
    tournamentData: any,
    oldStatus: string,
    newStatus: string
  ) {
    return this.log(context, {
      action: "TOURNAMENT_STATUS_CHANGED",
      description: `"${tournamentData.name}" (${oldStatus} -> ${newStatus})`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        tournamentName: tournamentData.name,
        statusTransition: `${oldStatus} → ${newStatus}`,
        automatic: context.metadata?.automatic || false
      }
    })
  }

  /**
   * Obtener logs de un torneo específico
   */
  static async getTournamentLogs(tournamentId: string, limit: number = 50) {
    return prisma.tournamentLog.findMany({
      where: { tournamentId },
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
    return prisma.tournamentLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        tournament: {
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

    const stats = await prisma.tournamentLog.groupBy({
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

    const totalLogs = await prisma.tournamentLog.count({
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
   * Sanitizar datos del torneo para el log (remover campos sensibles)
   */
  private static sanitizeTournamentData(data: any) {
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
      'name', 'description', 'type', 'status', 'visibility',
      'registrationStart', 'registrationEnd', 'tournamentStart', 'tournamentEnd',
      'maxParticipants', 'minParticipants', 'registrationFee', 'prizePool',
      'mainClubId', 'rules', 'prizesDescription'
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