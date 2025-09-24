import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type RankingsLogAction =
  | "RANKING_CREATED"
  | "RANKING_UPDATED"
  | "RANKING_DELETED"
  | "POINTS_UPDATED"
  | "POINTS_CALCULATED"
  | "SEASON_UPDATED"
  | "MANUAL_ADJUSTMENT"
  | "USER_ACTION"

interface LogContext {
  userId: string
  rankingId?: string
  playerId?: string
  categoryId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: RankingsLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class RankingsLogService {
  /**
   * Registra una acción en el log de rankings
   */
  static async log(context: LogContext, data: LogData) {
    console.log('🔍 RankingsLogService.log called:', { action: data.action, userId: context.userId, rankingId: context.rankingId })
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

      const logEntry = await prisma.rankingLog.create({
        data: {
          action: data.action,
          description: data.description,
          rankingId: context.rankingId,
          userId: context.userId,
          playerId: context.playerId,
          categoryId: context.categoryId,
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
          player: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          category: {
            select: {
              name: true
            }
          }
        }
      })

      console.log(`📝 Ranking log created: ${data.action} by ${logEntry.user.name} (${logEntry.user.email})`)
      return logEntry

    } catch (error) {
      console.error('❌ Error creating ranking log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de ranking
   */
  static async logRankingCreated(context: LogContext, rankingData: any) {
    return this.log(context, {
      action: "RANKING_CREATED",
      description: `Ranking creado para ${rankingData.player?.firstName} ${rankingData.player?.lastName} en ${rankingData.category?.name}`,
      newData: this.sanitizeRankingData(rankingData),
      metadata: {
        seasonYear: rankingData.seasonYear,
        currentPoints: rankingData.currentPoints,
        categoryName: rankingData.category?.name,
        playerName: `${rankingData.player?.firstName} ${rankingData.player?.lastName}`
      }
    })
  }

  /**
   * Log específico para eliminación de ranking
   */
  static async logRankingDeleted(context: LogContext, rankingData: any) {
    return this.log(context, {
      action: "RANKING_DELETED",
      description: `Ranking eliminado: ${rankingData.player?.firstName} ${rankingData.player?.lastName} removido de ${rankingData.category?.name}`,
      oldData: this.sanitizeRankingData(rankingData),
      metadata: {
        seasonYear: rankingData.seasonYear,
        deletedPoints: rankingData.currentPoints,
        categoryName: rankingData.category?.name,
        playerName: `${rankingData.player?.firstName} ${rankingData.player?.lastName}`,
        reason: 'Eliminación manual desde dashboard'
      }
    })
  }

  /**
   * Log específico para actualización de puntos
   */
  static async logPointsUpdated(context: LogContext, oldData: any, newData: any, reason?: string) {
    const pointsDifference = newData.currentPoints - oldData.currentPoints

    return this.log(context, {
      action: "POINTS_UPDATED",
      description: `Puntos actualizados de ${oldData.currentPoints} a ${newData.currentPoints} (${pointsDifference >= 0 ? '+' : ''}${pointsDifference})`,
      oldData: this.sanitizeRankingData(oldData),
      newData: this.sanitizeRankingData(newData),
      metadata: {
        pointsChange: pointsDifference,
        previousPoints: oldData.currentPoints,
        newPoints: newData.currentPoints,
        reason: reason || 'Manual adjustment',
        seasonYear: newData.seasonYear,
        categoryName: newData.category?.name,
        playerName: `${newData.player?.firstName} ${newData.player?.lastName}`
      }
    })
  }

  /**
   * Log específico para cálculo automático de puntos
   */
  static async logPointsCalculated(context: LogContext, tournamentId: string, calculatedRankings: any[]) {
    const totalPointsAwarded = calculatedRankings.reduce((sum, ranking) => sum + ranking.pointsEarned, 0)
    const playersAffected = calculatedRankings.length

    return this.log(context, {
      action: "POINTS_CALCULATED",
      description: `Puntos calculados automáticamente para ${playersAffected} jugadores (${totalPointsAwarded} puntos totales)`,
      metadata: {
        tournamentId,
        playersAffected,
        totalPointsAwarded,
        calculationDate: new Date(),
        rankings: calculatedRankings.map(r => ({
          playerId: r.playerId,
          playerName: `${r.player?.firstName} ${r.player?.lastName}`,
          categoryId: r.categoryId,
          categoryName: r.category?.name,
          pointsEarned: r.pointsEarned,
          newTotal: r.currentPoints
        }))
      }
    })
  }

  /**
   * Log específico para ajuste manual de puntos
   */
  static async logManualAdjustment(
    context: LogContext,
    rankingData: any,
    oldPoints: number,
    newPoints: number,
    reason: string
  ) {
    const pointsDifference = newPoints - oldPoints

    return this.log(context, {
      action: "MANUAL_ADJUSTMENT",
      description: `Ajuste manual: ${rankingData.player?.firstName} ${rankingData.player?.lastName} de ${oldPoints} a ${newPoints} puntos`,
      oldData: { currentPoints: oldPoints },
      newData: { currentPoints: newPoints },
      metadata: {
        pointsChange: pointsDifference,
        previousPoints: oldPoints,
        newPoints: newPoints,
        reason,
        seasonYear: rankingData.seasonYear,
        categoryName: rankingData.category?.name,
        playerName: `${rankingData.player?.firstName} ${rankingData.player?.lastName}`,
        adjustmentType: pointsDifference >= 0 ? 'increase' : 'decrease'
      }
    })
  }

  /**
   * Log específico para actualización de temporada
   */
  static async logSeasonUpdated(context: LogContext, playerId: string, categoryId: string, oldSeason: number, newSeason: number) {
    return this.log(context, {
      action: "SEASON_UPDATED",
      description: `Temporada actualizada de ${oldSeason} a ${newSeason}`,
      oldData: { seasonYear: oldSeason },
      newData: { seasonYear: newSeason },
      metadata: {
        seasonTransition: `${oldSeason} → ${newSeason}`,
        playerId,
        categoryId
      }
    })
  }

  /**
   * Obtener logs de un ranking específico
   */
  static async getRankingLogs(rankingId: string, limit: number = 50) {
    return prisma.rankingLog.findMany({
      where: { rankingId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        category: {
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
   * Obtener logs de un jugador específico
   */
  static async getPlayerRankingLogs(playerId: string, categoryId?: string, limit: number = 50) {
    return prisma.rankingLog.findMany({
      where: {
        playerId,
        ...(categoryId && { categoryId })
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        category: {
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
    return prisma.rankingLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        category: {
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

    const stats = await prisma.rankingLog.groupBy({
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

    const totalLogs = await prisma.rankingLog.count({
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
   * Obtener estadísticas de puntos por categoría
   */
  static async getPointsStatsByCategory(seasonYear?: number) {
    const currentYear = seasonYear || new Date().getFullYear()

    const stats = await prisma.rankingLog.groupBy({
      by: ['categoryId'],
      _sum: {
        metadata: true // This would need custom aggregation for points from metadata
      },
      where: {
        action: { in: ['POINTS_CALCULATED', 'POINTS_UPDATED', 'MANUAL_ADJUSTMENT'] },
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1)
        }
      }
    })

    return stats
  }

  /**
   * Sanitizar datos del ranking para el log (remover campos sensibles)
   */
  private static sanitizeRankingData(data: any) {
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
      'currentPoints', 'seasonYear', 'playerId', 'categoryId', 'lastUpdated'
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