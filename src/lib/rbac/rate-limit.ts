// src/lib/rbac/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest } from 'next/server'
import { SecurityLogService } from '@/lib/services/security-log-service'

/**
 * Configuraciones de rate limiting por tipo de endpoint
 */
const RATE_LIMITS = {
  // Autenticación: muy estricto
  auth: {
    points: 5,           // 5 intentos
    duration: 60,        // por minuto
    blockDuration: 900,  // bloqueo de 15 minutos
  },
  // Escritura: estricto
  write: {
    points: 30,          // 30 operaciones
    duration: 60,        // por minuto
    blockDuration: 300,  // bloqueo de 5 minutos
  },
  // Lectura: moderado
  read: {
    points: 100,         // 100 consultas
    duration: 60,        // por minuto
    blockDuration: 60,   // bloqueo de 1 minuto
  },
}

/**
 * Limitadores por tipo
 */
const authLimiter = new RateLimiterMemory(RATE_LIMITS.auth)
const writeLimiter = new RateLimiterMemory(RATE_LIMITS.write)
const readLimiter = new RateLimiterMemory(RATE_LIMITS.read)

/**
 * Tipos de rate limiting disponibles
 */
export type RateLimitType = 'auth' | 'write' | 'read'

/**
 * Error personalizado para rate limiting
 */
export class RateLimitError extends Error {
  statusCode = 429
  retryAfter: number

  constructor(message: string, retryAfter: number = 60) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Obtener IP del request
 */
function getIpAddress(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Verificar rate limit para una petición
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'read',
  identifier?: string
): Promise<void> {
  // Usar IP como identificador por defecto
  const ip = identifier || getIpAddress(request)

  // Seleccionar limiter según tipo
  const limiter = type === 'auth' ? authLimiter :
                  type === 'write' ? writeLimiter :
                  readLimiter

  try {
    await limiter.consume(ip)
  } catch (error) {
    // Log del evento
    await SecurityLogService.logRateLimitExceeded({
      ip,
      endpoint: request.nextUrl.pathname,
      limit: RATE_LIMITS[type].points,
    })

    const retryAfter = RATE_LIMITS[type].blockDuration

    throw new RateLimitError(
      `Demasiadas peticiones. Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minutos.`,
      retryAfter
    )
  }
}

/**
 * Wrapper para aplicar rate limiting a rutas
 */
export function withRateLimit(type: RateLimitType = 'read') {
  return function <T = any>(
    handler: (request: NextRequest, context: T) => Promise<Response>
  ) {
    return async (request: NextRequest, context: T) => {
      try {
        await checkRateLimit(request, type)
        return await handler(request, context)
      } catch (error) {
        if (error instanceof RateLimitError) {
          return new Response(
            JSON.stringify({
              error: error.message,
              retryAfter: error.retryAfter,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': error.retryAfter.toString(),
                'X-RateLimit-Limit': RATE_LIMITS[type].points.toString(),
                'X-RateLimit-Reset': new Date(Date.now() + error.retryAfter * 1000).toISOString(),
              },
            }
          )
        }
        throw error
      }
    }
  }
}

/**
 * Obtener información de rate limit restante
 */
export async function getRateLimitInfo(
  request: NextRequest,
  type: RateLimitType = 'read'
): Promise<{ remaining: number; total: number; resetAt: Date }> {
  const ip = getIpAddress(request)
  const limiter = type === 'auth' ? authLimiter :
                  type === 'write' ? writeLimiter :
                  readLimiter

  try {
    const res = await limiter.get(ip)
    const remaining = res ? RATE_LIMITS[type].points - res.consumedPoints : RATE_LIMITS[type].points
    const resetAt = res ? new Date((res.msBeforeNext || 0) + Date.now()) : new Date()

    return {
      remaining: Math.max(0, remaining),
      total: RATE_LIMITS[type].points,
      resetAt,
    }
  } catch {
    return {
      remaining: RATE_LIMITS[type].points,
      total: RATE_LIMITS[type].points,
      resetAt: new Date(Date.now() + RATE_LIMITS[type].duration * 1000),
    }
  }
}

/**
 * Resetear rate limit para un IP específico (solo para testing o admin)
 */
export async function resetRateLimit(
  ip: string,
  type?: RateLimitType
): Promise<void> {
  if (type) {
    const limiter = type === 'auth' ? authLimiter :
                    type === 'write' ? writeLimiter :
                    readLimiter
    await limiter.delete(ip)
  } else {
    // Resetear todos los tipos
    await Promise.all([
      authLimiter.delete(ip),
      writeLimiter.delete(ip),
      readLimiter.delete(ip),
    ])
  }
}

/**
 * Presets de configuración (mantenidos por compatibilidad)
 * @deprecated Use RateLimitType instead
 */
export const RateLimitPresets = {
  STRICT: RATE_LIMITS.auth,
  MODERATE: RATE_LIMITS.write,
  LENIENT: RATE_LIMITS.read,
  API: RATE_LIMITS.read,
} as const