import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type TeamLogAction =
  | "TEAM_CREATED"
  | "TEAM_UPDATED"
  | "TEAM_DELETED"
  | "TEAM_STATUS_CHANGED"
  | "TEAM_CONFIRMED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  teamId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: TeamLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class TeamLogService {
  /**
   * Registra una acción en el log de equipos
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

      const logEntry = await prisma.teamLog.create({
        data: {
          action: data.action,
          description: data.description,
          teamId: context.teamId,
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
          team: {
            select: {
              id: true,
              name: true,
              status: true,
              tournament: {
                select: {
                  name: true
                }
              },
              category: {
                select: {
                  name: true
                }
              },
              registration1: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return logEntry

    } catch (error) {
      console.error('❌ Error creating team log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de equipo
   */
  static async logTeamCreated(context: LogContext, teamData: any) {
    const player1Name = teamData.registration1?.player
      ? `${teamData.registration1.player.firstName} ${teamData.registration1.player.lastName}`
      : 'Jugador 1'
    const player2Name = teamData.registration2?.player
      ? `${teamData.registration2.player.firstName} ${teamData.registration2.player.lastName}`
      : 'Jugador 2'
    const teamName = teamData.name || `${player1Name} / ${player2Name}`
    const tournamentName = teamData.tournament?.name || 'Torneo'
    const categoryName = teamData.category?.name || 'Categoría'

    return this.log(context, {
      action: "TEAM_CREATED",
      description: `Equipo "${teamName}" creado en ${tournamentName} - ${categoryName}`,
      newData: this.sanitizeTeamData(teamData),
      metadata: {
        tournamentId: teamData.tournamentId,
        categoryId: teamData.categoryId,
        teamName,
        player1Name,
        player2Name,
        tournamentName,
        categoryName,
        status: teamData.status
      }
    })
  }

  /**
   * Log específico para actualización de equipo
   */
  static async logTeamUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)
    const teamName = newData.name || 'Equipo'

    return this.log(context, {
      action: "TEAM_UPDATED",
      description: `Equipo "${teamName}" actualizado`,
      oldData: this.sanitizeTeamData(oldData),
      newData: this.sanitizeTeamData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes,
        teamName
      }
    })
  }

  /**
   * Log específico para eliminación de equipo
   */
  static async logTeamDeleted(context: LogContext, teamData: any) {
    const teamName = teamData.name || 'Equipo'
    const tournamentName = teamData.tournament?.name || 'Torneo'

    return this.log(context, {
      action: "TEAM_DELETED",
      description: `Equipo "${teamName}" eliminado de ${tournamentName}`,
      oldData: this.sanitizeTeamData(teamData),
      metadata: {
        tournamentId: teamData.tournamentId,
        categoryId: teamData.categoryId,
        teamName,
        tournamentName
      }
    })
  }

  /**
   * Log específico para cambio de estado de equipo
   */
  static async logTeamStatusChanged(
    context: LogContext,
    teamData: any,
    oldStatus: string,
    newStatus: string
  ) {
    const teamName = teamData.name || 'Equipo'

    return this.log(context, {
      action: "TEAM_STATUS_CHANGED",
      description: `Equipo "${teamName}": ${oldStatus} → ${newStatus}`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        teamName,
        statusTransition: `${oldStatus} → ${newStatus}`,
        tournamentId: teamData.tournamentId,
        categoryId: teamData.categoryId
      }
    })
  }

  /**
   * Log específico para confirmación de equipo
   */
  static async logTeamConfirmed(context: LogContext, teamData: any) {
    const teamName = teamData.name || 'Equipo'
    const tournamentName = teamData.tournament?.name || 'Torneo'

    return this.log(context, {
      action: "TEAM_CONFIRMED",
      description: `Equipo "${teamName}" confirmado en ${tournamentName}`,
      newData: { status: teamData.status, confirmedAt: teamData.confirmedAt },
      metadata: {
        teamName,
        tournamentName,
        tournamentId: teamData.tournamentId,
        categoryId: teamData.categoryId,
        confirmedAt: teamData.confirmedAt
      }
    })
  }

  /**
   * Obtener logs de un equipo específico
   */
  static async getTeamLogs(teamId: string, limit: number = 50) {
    return prisma.teamLog.findMany({
      where: { teamId },
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
    return prisma.teamLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            status: true,
            tournament: {
              select: {
                name: true
              }
            },
            registration1: {
              select: {
                player: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
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

    const stats = await prisma.teamLog.groupBy({
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

    const totalLogs = await prisma.teamLog.count({
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
   * Sanitizar datos del equipo para el log (remover campos sensibles)
   */
  private static sanitizeTeamData(data: any) {
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
      'name', 'status', 'seed', 'notes', 'confirmedAt'
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
