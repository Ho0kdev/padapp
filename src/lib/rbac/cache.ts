// src/lib/rbac/cache.ts
import { Ability, defineAbilitiesFor } from './ability'
import { AuthorizationContext } from './types'

/**
 * Entrada de caché para habilidades
 */
interface CacheEntry {
  ability: Ability
  timestamp: number
}

/**
 * Gestor de caché para habilidades del usuario
 * Reduce el overhead de recrear habilidades en cada request
 * Implementa patrón Singleton
 */
class AbilityCache {
  private static instance: AbilityCache
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL: number = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_SIZE: number = 1000
  private cleanupInterval?: NodeJS.Timeout

  private constructor() {}

  static getInstance(): AbilityCache {
    if (!AbilityCache.instance) {
      AbilityCache.instance = new AbilityCache()
    }
    return AbilityCache.instance
  }

  /**
   * Generar clave única para el contexto
   */
  private getCacheKey(context: AuthorizationContext): string {
    return `${context.userId}:${context.userRole}:${context.userStatus || ''}`
  }

  /**
   * Verificar si la entrada está expirada
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Limpiar caché si excede el tamaño máximo
   */
  private ensureSize(): void {
    if (this.cache.size >= this.MAX_SIZE) {
      // Eliminar las entradas más antiguas
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toDelete = Math.floor(this.MAX_SIZE * 0.2) // Eliminar 20% más antiguas
      for (let i = 0; i < toDelete; i++) {
        this.cache.delete(entries[i][0])
      }
    }
  }

  /**
   * Obtener habilidades del caché o crear nuevas
   */
  get(context: AuthorizationContext): Ability {
    const key = this.getCacheKey(context)
    const entry = this.cache.get(key)

    // Si existe y no está expirada, retornarla
    if (entry && !this.isExpired(entry)) {
      return entry.ability
    }

    // Crear nueva habilidad
    const ability = defineAbilitiesFor(context)

    // Guardar en caché
    this.set(context, ability)

    return ability
  }

  /**
   * Guardar habilidad en caché
   */
  set(context: AuthorizationContext, ability: Ability): void {
    const key = this.getCacheKey(context)

    this.cache.set(key, {
      ability,
      timestamp: Date.now(),
    })

    this.ensureSize()
  }

  /**
   * Invalidar caché para un usuario específico
   */
  invalidate(userId: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Invalidar todo el caché
   */
  invalidateAll(): void {
    this.cache.clear()
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL,
    }
  }

  /**
   * Ejecutar limpieza periódica
   */
  startPeriodicCleanup(interval: number = 60000): void {
    if (this.cleanupInterval) {
      return // Ya está corriendo
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, interval)
  }

  /**
   * Detener limpieza periódica
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Destruir instancia y liberar recursos
   */
  destroy(): void {
    this.stopPeriodicCleanup()
    this.cache.clear()
  }
}

// Instancia global del caché (Singleton)
export const abilityCache = AbilityCache.getInstance()

// Iniciar limpieza periódica (cada minuto) solo en el servidor
if (typeof window === 'undefined') {
  abilityCache.startPeriodicCleanup()

  // Cleanup al cerrar el proceso
  process.on('beforeExit', () => {
    abilityCache.destroy()
  })
}

/**
 * Obtener habilidades usando caché
 */
export function getCachedAbility(context: AuthorizationContext): Ability {
  return abilityCache.get(context)
}

/**
 * Invalidar caché de un usuario (útil cuando cambian sus permisos)
 */
export function invalidateUserCache(userId: string): void {
  abilityCache.invalidate(userId)
}