import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export type CategoryLogAction =
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "CATEGORY_STATUS_CHANGED"
  | "USER_ACTION"

interface LogContext {
  userId: string
  categoryId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogData {
  action: CategoryLogAction
  description: string
  oldData?: any
  newData?: any
  metadata?: any
}

export class CategoryLogService {
  /**
   * Registra una acción en el log de categorías
   */
  static async log(context: LogContext, data: LogData) {
    console.log('🔍 CategoryLogService.log called:', { action: data.action, userId: context.userId, categoryId: context.categoryId })
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

      const logEntry = await prisma.categoryLog.create({
        data: {
          action: data.action,
          description: data.description,
          categoryId: context.categoryId,
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
          category: {
            select: {
              name: true
            }
          }
        }
      })

      console.log(`📝 Category log created: ${data.action} by ${logEntry.user.name} (${logEntry.user.email})`)
      return logEntry

    } catch (error) {
      console.error('❌ Error creating category log:', error)
      // No lanzar error para evitar que falle la operación principal
      return null
    }
  }

  /**
   * Log específico para creación de categoría
   */
  static async logCategoryCreated(context: LogContext, categoryData: any) {
    return this.log(context, {
      action: "CATEGORY_CREATED",
      description: `"${categoryData.name}" creada`,
      newData: this.sanitizeCategoryData(categoryData),
      metadata: {
        type: categoryData.type,
        genderRestriction: categoryData.genderRestriction,
        ageRange: categoryData.minAge || categoryData.maxAge ?
          `${categoryData.minAge || 'Sin límite'} - ${categoryData.maxAge || 'Sin límite'}` : null,
        rankingRange: categoryData.minRankingPoints || categoryData.maxRankingPoints ?
          `${categoryData.minRankingPoints || 'Sin límite'} - ${categoryData.maxRankingPoints || 'Sin límite'}` : null
      }
    })
  }

  /**
   * Log específico para actualización de categoría
   */
  static async logCategoryUpdated(context: LogContext, oldData: any, newData: any) {
    const changes = this.getChanges(oldData, newData)

    return this.log(context, {
      action: "CATEGORY_UPDATED",
      description: `"${newData.name}" actualizada`,
      oldData: this.sanitizeCategoryData(oldData),
      newData: this.sanitizeCategoryData(newData),
      metadata: {
        changedFields: Object.keys(changes),
        changes
      }
    })
  }

  /**
   * Log específico para eliminación/desactivación de categoría
   */
  static async logCategoryDeleted(context: LogContext, categoryData: any) {
    return this.log(context, {
      action: "CATEGORY_DELETED",
      description: `"${categoryData.name}" desactivada`,
      oldData: this.sanitizeCategoryData(categoryData),
      metadata: {
        type: categoryData.type,
        tournamentsCount: categoryData._count?.tournamentCategories || 0
      }
    })
  }

  /**
   * Log específico para cambio de estado de categoría
   */
  static async logCategoryStatusChanged(
    context: LogContext,
    categoryData: any,
    oldStatus: boolean,
    newStatus: boolean
  ) {
    const statusText = (active: boolean) => active ? 'activa' : 'inactiva'

    return this.log(context, {
      action: "CATEGORY_STATUS_CHANGED",
      description: `"${categoryData.name}" cambió de ${statusText(oldStatus)} a ${statusText(newStatus)}`,
      oldData: { isActive: oldStatus },
      newData: { isActive: newStatus },
      metadata: {
        categoryName: categoryData.name,
        statusTransition: `${statusText(oldStatus)} → ${statusText(newStatus)}`
      }
    })
  }

  /**
   * Obtener logs de una categoría específica
   */
  static async getCategoryLogs(categoryId: string, limit: number = 50) {
    return prisma.categoryLog.findMany({
      where: { categoryId },
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
    return prisma.categoryLog.findMany({
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
   * Obtener estadísticas de logs
   */
  static async getLogStats(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await prisma.categoryLog.groupBy({
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

    const totalLogs = await prisma.categoryLog.count({
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
   * Sanitizar datos de la categoría para el log (remover campos sensibles)
   */
  private static sanitizeCategoryData(data: any) {
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
      'name', 'description', 'type', 'minAge', 'maxAge',
      'genderRestriction', 'minRankingPoints', 'maxRankingPoints', 'isActive'
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