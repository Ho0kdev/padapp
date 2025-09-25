import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type ClubLogAction =
  | "CLUB_CREATED"
  | "CLUB_UPDATED"
  | "CLUB_DELETED"
  | "CLUB_STATUS_CHANGED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  clubId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: ClubLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class ClubLogService {
  /**
   * Registra una acción en el log de clubes
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

      const logEntry = await prisma.clubLog.create({
        data: {
          action: data.action,
          description: data.description,
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
          club: {
            select: {
              name: true
            }
          }
        }
      })

      return logEntry

    } catch (error) {
      console.error('❌ Error creating club log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de club
   */
  static async logClubCreated(context: LogContext, clubData: any) {
    return this.log(context, {
      action: "CLUB_CREATED",
      description: `"${clubData.name}" creado`,
      newData: this.sanitizeClubData(clubData),
      metadata: {
        status: clubData.status,
        city: clubData.city,
        country: clubData.country
      }
    })
  }

  /**
   * Log específico para actualización de club
   */
  static async logClubUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)

    return this.log(context, {
      action: "CLUB_UPDATED",
      description: `"${newData.name}" actualizado`,
      oldData: this.sanitizeClubData(oldData),
      newData: this.sanitizeClubData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes
      }
    })
  }

  /**
   * Log específico para eliminación de club
   */
  static async logClubDeleted(context: LogContext, clubData: any) {
    return this.log(context, {
      action: "CLUB_DELETED",
      description: `"${clubData.name}" eliminado`,
      oldData: this.sanitizeClubData(clubData),
      metadata: {
        status: clubData.status,
        courtsCount: clubData._count?.courts || 0
      }
    })
  }

  /**
   * Log específico para cambio de estado de club
   */
  static async logClubStatusChanged(
    context: LogContext,
    clubData: any,
    oldStatus: string,
    newStatus: string
  ) {

    return this.log(context, {
      action: "CLUB_STATUS_CHANGED",
      description: `"${clubData.name}" cambió de ${oldStatus} a ${newStatus}`,
      oldData: { status: oldStatus },
      newData: { status: newStatus },
      metadata: {
        clubName: clubData.name,
        statusTransition: `${oldStatus} → ${newStatus}`
      }
    })
  }

  /**
   * Obtener logs de un club específico
   */
  static async getClubLogs(clubId: string, limit: number = 50) {
    return prisma.clubLog.findMany({
      where: { clubId },
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
    return prisma.clubLog.findMany({
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
   * Obtener estadísticas de logs
   */
  static async getLogStats(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await prisma.clubLog.groupBy({
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

    const totalLogs = await prisma.clubLog.count({
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
   * Sanitizar datos del club para el log (remover campos sensibles)
   */
  private static sanitizeClubData(data: any) {
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
      'name', 'description', 'address', 'city', 'state', 'country',
      'postalCode', 'phone', 'email', 'website', 'status', 'logoUrl'
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