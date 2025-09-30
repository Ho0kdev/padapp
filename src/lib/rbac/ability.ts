// src/lib/rbac/ability.ts
import { UserRole } from '@prisma/client'
import { Action, Resource, PermissionRule, AuthorizationContext } from './types'

/**
 * Motor de habilidades (Ability) - inspirado en CASL
 * Determina qué acciones puede realizar un usuario sobre recursos
 */
export class Ability {
  private rules: PermissionRule[] = []

  constructor(private context: AuthorizationContext) {}

  /**
   * Agregar regla de permiso (can)
   */
  can(action: Action | Action[], resource: Resource | Resource[], conditions?: any): this {
    const actions = Array.isArray(action) ? action : [action]
    const resources = Array.isArray(resource) ? resource : [resource]

    actions.forEach(act => {
      resources.forEach(res => {
        this.rules.push({
          action: act,
          resource: res,
          conditions,
          inverted: false,
        })
      })
    })

    return this
  }

  /**
   * Agregar regla de denegación (cannot)
   */
  cannot(action: Action | Action[], resource: Resource | Resource[], conditions?: any): this {
    const actions = Array.isArray(action) ? action : [action]
    const resources = Array.isArray(resource) ? resource : [resource]

    actions.forEach(act => {
      resources.forEach(res => {
        this.rules.push({
          action: act,
          resource: res,
          conditions,
          inverted: true,
        })
      })
    })

    return this
  }

  /**
   * Verificar si el usuario puede realizar una acción sobre un recurso
   */
  check(action: Action, resource: Resource, subject?: any): boolean {
    const applicableRules = this.findApplicableRules(action, resource)

    if (applicableRules.length === 0) {
      return false
    }

    return this.evaluateRules(applicableRules, subject)
  }

  /**
   * Encontrar reglas aplicables (separación de responsabilidades)
   */
  private findApplicableRules(action: Action, resource: Resource): PermissionRule[] {
    return this.rules.filter(rule =>
      this.matchesAction(rule, action) && this.matchesResource(rule, resource)
    )
  }

  /**
   * Verificar si la acción coincide con la regla
   */
  private matchesAction(rule: PermissionRule, action: Action): boolean {
    return (
      rule.action === action ||
      rule.action === Action.MANAGE ||
      (Array.isArray(rule.action) && rule.action.includes(action))
    )
  }

  /**
   * Verificar si el recurso coincide con la regla
   */
  private matchesResource(rule: PermissionRule, resource: Resource): boolean {
    return (
      rule.resource === resource ||
      (Array.isArray(rule.resource) && rule.resource.includes(resource))
    )
  }

  /**
   * Evaluar reglas en orden (las últimas tienen prioridad)
   */
  private evaluateRules(rules: PermissionRule[], subject?: any): boolean {
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i]

      if (rule.conditions && subject) {
        const conditionsMet = this.evaluateConditions(rule.conditions, subject)
        if (conditionsMet) {
          return !rule.inverted
        }
      } else if (!rule.conditions) {
        return !rule.inverted
      }
    }

    return false
  }

  /**
   * Evaluar condiciones de una regla
   */
  private evaluateConditions(conditions: any, subject: any): boolean {
    // Si las condiciones son una función, ejecutarla
    if (typeof conditions === 'function') {
      return conditions(subject, this.context)
    }

    // Si las condiciones son un objeto con campos
    if (typeof conditions === 'object') {
      return Object.entries(conditions).every(([field, value]) => {
        const subjectValue = this.getNestedValue(subject, field)

        if (typeof value === 'function') {
          return value(subjectValue, this.context)
        }

        return subjectValue === value
      })
    }

    return true
  }

  /**
   * Obtener valor anidado de un objeto (ej: "user.id")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Obtener todas las reglas
   */
  getRules(): PermissionRule[] {
    return this.rules
  }
}

/**
 * Definir habilidades según el rol del usuario
 */
export function defineAbilitiesFor(context: AuthorizationContext): Ability {
  const ability = new Ability(context)
  const { userRole, userId } = context

  switch (userRole) {
    case UserRole.ADMIN:
      // ADMIN tiene acceso total a todo
      ability.can(Action.MANAGE, [
        Resource.USER,
        Resource.PLAYER,
        Resource.TOURNAMENT,
        Resource.CLUB,
        Resource.COURT,
        Resource.CATEGORY,
        Resource.REGISTRATION,
        Resource.TEAM,
        Resource.MATCH,
        Resource.RANKING,
        Resource.PAYMENT,
        Resource.NOTIFICATION,
        Resource.REPORT,
        Resource.DASHBOARD,
      ])
      break

    case UserRole.CLUB_ADMIN:
      // CLUB_ADMIN puede gestionar su club y sus recursos
      ability.can([Action.READ, Action.LIST], Resource.USER)
      ability.can([Action.READ, Action.UPDATE], Resource.USER, {
        id: userId
      })

      ability.can(Action.MANAGE, [
        Resource.CLUB,
        Resource.COURT,
        Resource.TOURNAMENT,
        Resource.CATEGORY,
      ])

      ability.can([Action.READ, Action.LIST, Action.APPROVE, Action.REJECT], Resource.REGISTRATION)
      ability.can([Action.READ, Action.LIST, Action.UPDATE], Resource.TEAM)
      ability.can([Action.READ, Action.LIST, Action.UPDATE], Resource.MATCH)
      ability.can([Action.READ, Action.LIST], Resource.RANKING)
      ability.can([Action.READ, Action.LIST, Action.UPDATE], Resource.PAYMENT)
      ability.can([Action.READ, Action.LIST], Resource.REPORT)
      ability.can(Action.READ, Resource.DASHBOARD)
      break

    case UserRole.PLAYER:
      // PLAYER solo puede ver su perfil y participar en torneos
      ability.can(Action.READ, Resource.USER, {
        id: userId
      })
      ability.can(Action.UPDATE, Resource.USER, {
        id: userId
      })

      ability.can([Action.READ, Action.LIST], [
        Resource.TOURNAMENT,
        Resource.CLUB,
        Resource.COURT,
        Resource.CATEGORY,
        Resource.RANKING,
      ])

      ability.can([Action.CREATE, Action.READ, Action.LIST], Resource.REGISTRATION)
      ability.can(Action.READ, Resource.REGISTRATION, {
        'team.player1Id': userId
      })
      ability.can(Action.READ, Resource.REGISTRATION, {
        'team.player2Id': userId
      })

      ability.can([Action.READ, Action.LIST], Resource.TEAM, (team: any) => {
        return team.player1Id === userId || team.player2Id === userId
      })

      ability.can([Action.READ, Action.LIST], Resource.MATCH)
      ability.can([Action.READ, Action.LIST], Resource.NOTIFICATION, {
        userId: userId
      })

      // No puede acceder al dashboard general
      ability.cannot(Action.READ, Resource.DASHBOARD)
      break

    case UserRole.REFEREE:
      // REFEREE puede gestionar partidos asignados
      ability.can(Action.READ, Resource.USER, {
        id: userId
      })
      ability.can(Action.UPDATE, Resource.USER, {
        id: userId
      })

      ability.can([Action.READ, Action.LIST], [
        Resource.TOURNAMENT,
        Resource.CLUB,
        Resource.COURT,
        Resource.CATEGORY,
        Resource.TEAM,
      ])

      ability.can([Action.READ, Action.LIST, Action.UPDATE], Resource.MATCH, {
        refereeId: userId
      })

      ability.can([Action.READ, Action.LIST], Resource.NOTIFICATION, {
        userId: userId
      })

      ability.can(Action.READ, Resource.DASHBOARD)
      break

    default:
      // Sin rol o rol desconocido - sin permisos
      break
  }

  return ability
}