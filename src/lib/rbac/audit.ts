// src/lib/rbac/audit.ts
import { NextRequest } from 'next/server'
import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { LogAction } from '@prisma/client'
import { Action, Resource } from './types'

/**
 * Mapeo de acciones RBAC a LogAction de Prisma
 */
const ACTION_TO_LOG_ACTION: Record<string, LogAction> = {
  // Users
  'create:User': LogAction.USER_ACTION,
  'read:User': LogAction.USER_ACTION,
  'update:User': LogAction.USER_ACTION,
  'delete:User': LogAction.USER_ACTION,

  // Tournaments
  'create:Tournament': LogAction.TOURNAMENT_CREATED,
  'update:Tournament': LogAction.TOURNAMENT_UPDATED,
  'delete:Tournament': LogAction.TOURNAMENT_DELETED,

  // Teams
  'create:Team': LogAction.TEAM_REGISTERED,
  'delete:Team': LogAction.TEAM_UNREGISTERED,

  // Matches
  'create:Match': LogAction.MATCH_CREATED,
  'update:Match': LogAction.MATCH_UPDATED,

  // Clubs
  'create:Club': LogAction.CLUB_CREATED,
  'update:Club': LogAction.CLUB_UPDATED,
  'delete:Club': LogAction.CLUB_DELETED,

  // Courts
  'create:Court': LogAction.COURT_CREATED,
  'update:Court': LogAction.COURT_UPDATED,
  'delete:Court': LogAction.COURT_DELETED,

  // Categories
  'create:Category': LogAction.CATEGORY_CREATED,
  'update:Category': LogAction.CATEGORY_UPDATED,
  'delete:Category': LogAction.CATEGORY_DELETED,

  // Rankings
  'create:Ranking': LogAction.RANKING_CREATED,
  'update:Ranking': LogAction.RANKING_UPDATED,
  'delete:Ranking': LogAction.RANKING_DELETED,
}

/**
 * Opciones para el logger de auditoría
 */
export interface AuditLogOptions {
  action: Action
  resource: Resource
  resourceId?: string
  description?: string
  oldData?: any
  newData?: any
  metadata?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Estrategia para crear logs específicos por recurso
 */
interface LogStrategy {
  createLog(data: LogData): Promise<void>
}

interface LogData {
  logAction: LogAction
  description: string
  userId: string
  resourceId?: string
  oldData?: any
  newData?: any
  metadata?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Registro de estrategias de logging por recurso
 */
class LogStrategyRegistry {
  private static strategies = new Map<Resource, LogStrategy>()

  static register(resource: Resource, strategy: LogStrategy): void {
    this.strategies.set(resource, strategy)
  }

  static get(resource: Resource): LogStrategy | undefined {
    return this.strategies.get(resource)
  }
}

// Estrategias concretas
class TournamentLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    await prisma.tournamentLog.create({
      data: {
        action: data.logAction,
        description: data.description,
        userId: data.userId,
        tournamentId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      },
    })
  }
}

class ClubLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    await prisma.clubLog.create({
      data: {
        action: data.logAction,
        description: data.description,
        userId: data.userId,
        clubId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      },
    })
  }
}

class CourtLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    await prisma.courtLog.create({
      data: {
        action: data.logAction,
        description: data.description,
        userId: data.userId,
        courtId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      },
    })
  }
}

class CategoryLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    await prisma.categoryLog.create({
      data: {
        action: data.logAction,
        description: data.description,
        userId: data.userId,
        categoryId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      },
    })
  }
}

class RankingLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    await prisma.rankingLog.create({
      data: {
        action: data.logAction,
        description: data.description,
        userId: data.userId,
        rankingId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      },
    })
  }
}

class DefaultLogStrategy implements LogStrategy {
  async createLog(data: LogData): Promise<void> {
    console.log(`[AUDIT] ${data.logAction}:`, {
      userId: data.userId,
      resourceId: data.resourceId,
      description: data.description,
      timestamp: new Date().toISOString(),
    })
  }
}

// Registrar estrategias
LogStrategyRegistry.register(Resource.TOURNAMENT, new TournamentLogStrategy())
LogStrategyRegistry.register(Resource.CLUB, new ClubLogStrategy())
LogStrategyRegistry.register(Resource.COURT, new CourtLogStrategy())
LogStrategyRegistry.register(Resource.CATEGORY, new CategoryLogStrategy())
LogStrategyRegistry.register(Resource.RANKING, new RankingLogStrategy())

/**
 * Logger de auditoría
 * Implementa Strategy Pattern para extensibilidad
 */
export class AuditLogger {
  /**
   * Registrar una acción en los logs
   */
  static async log(
    session: Session,
    options: AuditLogOptions,
    request?: NextRequest
  ): Promise<void> {
    try {
      const {
        action,
        resource,
        resourceId,
        description,
        oldData,
        newData,
        metadata,
      } = options

      const logAction = this.getLogAction(action, resource)
      if (!logAction) {
        console.warn(`No log action mapping found for ${action}:${resource}`)
        return
      }

      const ipAddress = options.ipAddress || this.getIpAddress(request)
      const userAgent = options.userAgent || this.getUserAgent(request)

      // Determinar qué tipo de log crear basado en el recurso
      await this.createLog({
        resource,
        logAction,
        description: description || this.generateDescription(action, resource),
        userId: session.user.id,
        resourceId,
        oldData,
        newData,
        metadata,
        ipAddress,
        userAgent,
      })
    } catch (error) {
      console.error('Error logging audit:', error)
      // No lanzar error para no interrumpir la operación principal
    }
  }

  /**
   * Crear el log apropiado según el recurso (Strategy Pattern)
   */
  private static async createLog(data: {
    resource: Resource
    logAction: LogAction
    description: string
    userId: string
    resourceId?: string
    oldData?: any
    newData?: any
    metadata?: any
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    const strategy = LogStrategyRegistry.get(data.resource) || new DefaultLogStrategy()

    const logData: LogData = {
      logAction: data.logAction,
      description: data.description,
      userId: data.userId,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : null,
      newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : null,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
    }

    await strategy.createLog(logData)
  }

  /**
   * Obtener LogAction de Prisma desde Action y Resource
   */
  private static getLogAction(action: Action, resource: Resource): LogAction | null {
    const key = `${action}:${resource}`
    return ACTION_TO_LOG_ACTION[key] || null
  }

  /**
   * Generar descripción automática
   */
  private static generateDescription(action: Action, resource: Resource): string {
    const actionMap: Record<Action, string> = {
      [Action.CREATE]: 'creó',
      [Action.READ]: 'consultó',
      [Action.UPDATE]: 'actualizó',
      [Action.DELETE]: 'eliminó',
      [Action.MANAGE]: 'gestionó',
      [Action.LIST]: 'listó',
      [Action.APPROVE]: 'aprobó',
      [Action.REJECT]: 'rechazó',
    }

    return `${actionMap[action] || action} ${resource}`
  }

  /**
   * Obtener IP del request
   */
  private static getIpAddress(request?: NextRequest): string | undefined {
    if (!request) return undefined

    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined
    )
  }

  /**
   * Obtener User-Agent del request
   */
  private static getUserAgent(request?: NextRequest): string | undefined {
    if (!request) return undefined
    return request.headers.get('user-agent') || undefined
  }
}

/**
 * Decorador para logging automático en API routes
 */
export function withAudit(options: Omit<AuditLogOptions, 'oldData' | 'newData'>) {
  return function <T = any>(
    handler: (
      request: NextRequest,
      context: T,
      session: Session
    ) => Promise<Response>
  ) {
    return async (request: NextRequest, context: T, session: Session) => {
      const response = await handler(request, context, session)

      // Solo registrar si la operación fue exitosa (2xx)
      if (response.ok) {
        await AuditLogger.log(session, options, request)
      }

      return response
    }
  }
}