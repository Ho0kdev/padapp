// src/lib/rbac/policies/BasePolicy.ts
import { Action, Resource } from '../types'
import { Ability } from '../ability'

/**
 * Política base para todos los recursos
 * Proporciona métodos comunes de autorización
 */
export abstract class BasePolicy {
  constructor(protected ability: Ability) {}

  /**
   * Verificar si el usuario puede realizar una acción
   */
  can(action: Action, resource: Resource, subject?: any): boolean {
    return this.ability.check(action, resource, subject)
  }

  /**
   * Verificar y lanzar error si no tiene permiso
   */
  authorize(action: Action, resource: Resource, subject?: any): void {
    if (!this.can(action, resource, subject)) {
      throw new UnauthorizedError(
        `No tienes permiso para ${action} en ${resource}`
      )
    }
  }

  /**
   * Métodos de conveniencia
   */
  protected canCreateResource(resource: Resource, subject?: any): boolean {
    return this.can(Action.CREATE, resource, subject)
  }

  protected canReadResource(resource: Resource, subject?: any): boolean {
    return this.can(Action.READ, resource, subject)
  }

  protected canUpdateResource(resource: Resource, subject?: any): boolean {
    return this.can(Action.UPDATE, resource, subject)
  }

  protected canDeleteResource(resource: Resource, subject?: any): boolean {
    return this.can(Action.DELETE, resource, subject)
  }

  protected canListResource(resource: Resource): boolean {
    return this.can(Action.LIST, resource)
  }
}

/**
 * Error de autorización personalizado
 */
export class UnauthorizedError extends Error {
  statusCode: number = 403

  constructor(message: string = 'No autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}