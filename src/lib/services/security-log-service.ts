// src/lib/services/security-log-service.ts
import { prisma } from '@/lib/prisma'

/**
 * Tipos de eventos de seguridad
 */
export type SecurityEventType =
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'

/**
 * Niveles de severidad
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Datos para crear un log de seguridad
 */
interface SecurityLogData {
  type: SecurityEventType
  severity: SecuritySeverity
  message: string
  userId?: string
  resource?: string
  action?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Servicio para registrar eventos de seguridad
 * Captura intentos de acceso no autorizado, rate limiting, y actividad sospechosa
 */
export class SecurityLogService {
  /**
   * Registrar un evento de seguridad genérico
   */
  static async logEvent(data: SecurityLogData): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: data.type,
          severity: data.severity,
          message: data.message,
          userId: data.userId,
          resource: data.resource,
          action: data.action,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
          timestamp: new Date(),
        },
      })
    } catch (error) {
      // No lanzar error para no interrumpir operación principal
      console.error('[SecurityLog] Failed to log event:', error)
    }
  }

  /**
   * Registrar acceso denegado (403)
   */
  static async logAccessDenied(data: {
    userId?: string
    resource: string
    action: string
    ip?: string
    userAgent?: string
    reason?: string
  }): Promise<void> {
    await this.logEvent({
      type: 'ACCESS_DENIED',
      severity: 'high',
      message: `Access denied to ${data.action} ${data.resource}${data.reason ? `: ${data.reason}` : ''}`,
      userId: data.userId,
      resource: data.resource,
      action: data.action,
      ipAddress: data.ip,
      userAgent: data.userAgent,
    })
  }

  /**
   * Registrar rate limit excedido (429)
   */
  static async logRateLimitExceeded(data: {
    ip: string
    userId?: string
    endpoint: string
    limit?: number
  }): Promise<void> {
    await this.logEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'medium',
      message: `Rate limit exceeded for ${data.endpoint}`,
      userId: data.userId,
      ipAddress: data.ip,
      resource: data.endpoint,
      metadata: { endpoint: data.endpoint, limit: data.limit },
    })
  }

  /**
   * Registrar token inválido o expirado (401)
   */
  static async logInvalidToken(data: {
    ip?: string
    userAgent?: string
    reason: string
  }): Promise<void> {
    await this.logEvent({
      type: 'INVALID_TOKEN',
      severity: 'medium',
      message: `Invalid or expired token: ${data.reason}`,
      ipAddress: data.ip,
      userAgent: data.userAgent,
    })
  }

  /**
   * Registrar intento de fuerza bruta detectado
   */
  static async logBruteForceAttempt(data: {
    ip: string
    userId?: string
    endpoint: string
    attempts: number
  }): Promise<void> {
    await this.logEvent({
      type: 'BRUTE_FORCE_ATTEMPT',
      severity: 'critical',
      message: `Brute force attempt detected from ${data.ip} (${data.attempts} attempts)`,
      userId: data.userId,
      ipAddress: data.ip,
      resource: data.endpoint,
      metadata: { endpoint: data.endpoint, attempts: data.attempts },
    })
  }

  /**
   * Registrar actividad sospechosa general
   */
  static async logSuspiciousActivity(data: {
    ip: string
    userId?: string
    description: string
    metadata?: Record<string, any>
  }): Promise<void> {
    await this.logEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'high',
      message: data.description,
      userId: data.userId,
      ipAddress: data.ip,
      metadata: data.metadata,
    })
  }

  /**
   * Obtener logs de seguridad recientes
   */
  static async getRecentLogs(options?: {
    limit?: number
    type?: SecurityEventType
    severity?: SecuritySeverity
    userId?: string
    ipAddress?: string
    since?: Date
  }) {
    const where: any = {}

    if (options?.type) where.type = options.type
    if (options?.severity) where.severity = options.severity
    if (options?.userId) where.userId = options.userId
    if (options?.ipAddress) where.ipAddress = options.ipAddress
    if (options?.since) where.timestamp = { gte: options.since }

    return await prisma.securityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  /**
   * Obtener estadísticas de seguridad
   */
  static async getStats(since?: Date) {
    const where = since ? { timestamp: { gte: since } } : {}

    const [
      totalLogs,
      byType,
      bySeverity,
      topIPs,
    ] = await Promise.all([
      // Total de logs
      prisma.securityLog.count({ where }),

      // Por tipo
      prisma.securityLog.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),

      // Por severidad
      prisma.securityLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),

      // IPs más frecuentes
      prisma.securityLog.groupBy({
        by: ['ipAddress'],
        where: { ...where, ipAddress: { not: null } },
        _count: true,
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10,
      }),
    ])

    return {
      total: totalLogs,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count
        return acc
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count
        return acc
      }, {} as Record<string, number>),
      topIPs: topIPs.map(item => ({
        ip: item.ipAddress,
        count: item._count,
      })),
    }
  }

  /**
   * Limpiar logs antiguos (mantener solo últimos N días)
   */
  static async cleanup(daysToKeep = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.securityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`[SecurityLog] Cleaned up ${result.count} old security logs`)
    return result.count
  }
}
