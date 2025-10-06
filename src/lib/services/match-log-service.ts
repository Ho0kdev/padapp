import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { LogAction } from "@prisma/client"

interface LogContext {
  userId: string
  matchId?: string
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

/**
 * Servicio de logging para Matches
 * Registra todas las acciones sobre partidos con auditoría completa
 */
export class MatchLogService {
  /**
   * Crea un log genérico
   */
  private static async log(context: LogContext, data: LogData) {
    // Obtener IP y user agent si no están provistos
    let ipAddress = context.ipAddress
    let userAgent = context.userAgent

    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers()
        ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        userAgent = headersList.get('user-agent') || 'unknown'
      } catch {
        ipAddress = ipAddress || 'server'
        userAgent = userAgent || 'server'
      }
    }

    return await prisma.matchLog.create({
      data: {
        action: data.action,
        description: data.description,
        matchId: context.matchId,
        userId: context.userId,
        ipAddress,
        userAgent,
        oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : null,
        newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      }
    })
  }

  /**
   * Log: Match creado
   */
  static async logMatchCreated(context: LogContext, matchData: any) {
    const team1Name = matchData.team1?.name || 'TBD'
    const team2Name = matchData.team2?.name || 'TBD'

    return this.log(context, {
      action: "MATCH_CREATED",
      description: `Partido creado: ${team1Name} vs ${team2Name}`,
      newData: matchData,
      metadata: {
        tournamentId: matchData.tournamentId,
        categoryId: matchData.categoryId,
        phaseType: matchData.phaseType,
        roundNumber: matchData.roundNumber
      }
    })
  }

  /**
   * Log: Match actualizado
   */
  static async logMatchUpdated(context: LogContext, oldData: any, newData: any) {
    const changes: string[] = []

    // Detectar cambios importantes
    if (oldData.scheduledAt !== newData.scheduledAt) {
      changes.push('horario')
    }
    if (oldData.courtId !== newData.courtId) {
      changes.push('cancha')
    }
    if (oldData.refereeId !== newData.refereeId) {
      changes.push('árbitro')
    }
    if (oldData.team1Id !== newData.team1Id || oldData.team2Id !== newData.team2Id) {
      changes.push('equipos')
    }

    const team1Name = newData.team1?.name || 'TBD'
    const team2Name = newData.team2?.name || 'TBD'

    return this.log(context, {
      action: "MATCH_UPDATED",
      description: `Partido actualizado: ${team1Name} vs ${team2Name}${changes.length > 0 ? ` (${changes.join(', ')})` : ''}`,
      oldData,
      newData,
      metadata: {
        changes,
        tournamentId: newData.tournamentId
      }
    })
  }

  /**
   * Log: Resultado cargado
   */
  static async logMatchResultAdded(context: LogContext, matchData: any, resultData: any) {
    const team1Name = matchData.team1?.name || 'Team 1'
    const team2Name = matchData.team2?.name || 'Team 2'
    const winnerName = resultData.winnerTeamId === matchData.team1Id ? team1Name : team2Name
    const score = `${matchData.team1SetsWon}-${matchData.team2SetsWon}`

    return this.log(context, {
      action: "MATCH_RESULT_ADDED",
      description: `Resultado cargado: ${team1Name} vs ${team2Name} (${score}) - Ganador: ${winnerName}`,
      oldData: { status: 'SCHEDULED' },
      newData: matchData,
      metadata: {
        winnerTeamId: resultData.winnerTeamId,
        score,
        sets: resultData.sets,
        durationMinutes: resultData.durationMinutes,
        tournamentId: matchData.tournamentId
      }
    })
  }

  /**
   * Log: Match eliminado
   */
  static async logMatchDeleted(context: LogContext, matchData: any) {
    const team1Name = matchData.team1?.name || 'TBD'
    const team2Name = matchData.team2?.name || 'TBD'

    return this.log(context, {
      action: "MATCH_DELETED",
      description: `Partido eliminado: ${team1Name} vs ${team2Name}`,
      oldData: matchData,
      metadata: {
        tournamentId: matchData.tournamentId,
        phaseType: matchData.phaseType
      }
    })
  }

  /**
   * Log: Estado del match cambiado
   */
  static async logMatchStatusChanged(
    context: LogContext,
    matchData: any,
    oldStatus: string,
    newStatus: string
  ) {
    const team1Name = matchData.team1?.name || 'TBD'
    const team2Name = matchData.team2?.name || 'TBD'

    return this.log(context, {
      action: "MATCH_STATUS_CHANGED",
      description: `Estado de partido cambiado: ${team1Name} vs ${team2Name} (${oldStatus} → ${newStatus})`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        oldStatus,
        newStatus,
        matchId: context.matchId,
        tournamentId: matchData.tournamentId
      }
    })
  }

  /**
   * Obtener logs de un match específico
   */
  static async getMatchLogs(matchId: string, limit = 50) {
    return await prisma.matchLog.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        match: {
          select: {
            matchNumber: true,
            phaseType: true,
            tournament: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
  }

  /**
   * Obtener logs recientes de todos los matches
   */
  static async getRecentLogs(limit = 100) {
    return await prisma.matchLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        match: {
          select: {
            matchNumber: true,
            phaseType: true,
            team1: {
              select: {
                name: true
              }
            },
            team2: {
              select: {
                name: true
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
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
  }

  /**
   * Obtener estadísticas de logs
   */
  static async getLogStats(days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const stats = await prisma.matchLog.groupBy({
      by: ['action'],
      _count: {
        action: true
      },
      where: {
        createdAt: {
          gte: since
        }
      }
    })

    const total = stats.reduce((sum, stat) => sum + stat._count.action, 0)

    return {
      stats,
      total,
      period: `${days} días`
    }
  }
}
