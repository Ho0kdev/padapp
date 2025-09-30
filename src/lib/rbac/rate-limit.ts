// src/lib/rbac/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Configuración de rate limit por endpoint
 */
export interface RateLimitConfig {
  /**
   * Número máximo de requests permitidos en el período
   */
  maxRequests: number

  /**
   * Ventana de tiempo en milisegundos
   */
  windowMs: number

  /**
   * Mensaje de error personalizado
   */
  message?: string

  /**
   * Clave para identificar al cliente (por defecto: IP)
   */
  keyGenerator?: (request: NextRequest) => string
}

/**
 * Entrada en el store de rate limiting
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Store en memoria para rate limiting
 * Para producción, considerar Redis o similar
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    // Limpiar entradas expiradas cada minuto
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 60000)
    }
  }

  /**
   * Incrementar contador para una clave
   */
  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    // Si no existe o expiró, crear nueva entrada
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      }
      this.store.set(key, newEntry)
      return newEntry
    }

    // Incrementar contador existente
    entry.count++
    this.store.set(key, entry)
    return entry
  }

  /**
   * Resetear contador para una clave
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Obtener estadísticas del store
   */
  getStats() {
    return {
      size: this.store.size,
      entries: Array.from(this.store.entries()),
    }
  }

  /**
   * Destruir el store y limpiar recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.store.clear()
  }
}

// Instancia global del store (Singleton)
const rateLimitStore = new RateLimitStore()

// Cleanup al cerrar el proceso
if (typeof window === 'undefined') {
  process.on('beforeExit', () => {
    rateLimitStore.destroy()
  })
}

/**
 * Obtener IP del cliente
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Generador de clave por defecto (IP + endpoint)
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIp(request)
  const pathname = request.nextUrl.pathname
  return `${ip}:${pathname}`
}

/**
 * Middleware de rate limiting
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await rateLimit(request, {
 *     maxRequests: 5,
 *     windowMs: 60000, // 5 requests por minuto
 *   })
 *
 *   if (rateLimitResponse) return rateLimitResponse
 *
 *   // Procesar request normalmente...
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const {
    maxRequests,
    windowMs,
    message = 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
    keyGenerator = defaultKeyGenerator,
  } = config

  const key = keyGenerator(request)
  const { count, resetTime } = rateLimitStore.increment(key, windowMs)

  // Agregar headers informativos
  const headers = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  }

  // Si excede el límite, retornar 429
  if (count > maxRequests) {
    return NextResponse.json(
      {
        error: message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers,
      }
    )
  }

  // No excede el límite, continuar
  return null
}

/**
 * Wrapper para handlers con rate limiting automático
 */
export function withRateLimit<T = any>(
  config: RateLimitConfig,
  handler: (request: NextRequest, context: T) => Promise<Response>
) {
  return async (request: NextRequest, context: T) => {
    const rateLimitResponse = await rateLimit(request, config)
    if (rateLimitResponse) return rateLimitResponse

    return await handler(request, context)
  }
}

/**
 * Presets de configuración comunes
 */
export const RateLimitPresets = {
  /**
   * Estricto - Para endpoints críticos como login, registro
   * 5 requests por minuto
   */
  STRICT: {
    maxRequests: 5,
    windowMs: 60000,
  },

  /**
   * Moderado - Para endpoints de escritura
   * 20 requests por minuto
   */
  MODERATE: {
    maxRequests: 20,
    windowMs: 60000,
  },

  /**
   * Permisivo - Para endpoints de lectura
   * 100 requests por minuto
   */
  LENIENT: {
    maxRequests: 100,
    windowMs: 60000,
  },

  /**
   * API - Para uso general de API
   * 1000 requests por hora
   */
  API: {
    maxRequests: 1000,
    windowMs: 3600000,
  },
} as const

/**
 * Resetear rate limit para una IP específica (útil para testing)
 */
export function resetRateLimit(ip: string, pathname?: string): void {
  const key = pathname ? `${ip}:${pathname}` : ip
  rateLimitStore.reset(key)
}

/**
 * Obtener estadísticas del rate limiter
 */
export function getRateLimitStats() {
  return rateLimitStore.getStats()
}