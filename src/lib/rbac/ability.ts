// src/lib/rbac/ability.ts
import { UserRole } from '@prisma/client'
import { Action, Resource, PermissionRule, AuthorizationContext } from './types'
import {
  ownsUser,
  ownsTeam,
  ownsRegistration,
  ownsMatch,
  ownsNotification,
} from './ownership'

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
  const { userRole, userId, userStatus } = context

  // Si el usuario está SUSPENDED o INACTIVE, no tiene permisos (excepto leer su propio perfil)
  if (userStatus === 'SUSPENDED' || userStatus === 'INACTIVE') {
    // Solo puede leer su propio perfil de usuario
    ability.can(Action.READ, Resource.USER, ownsUser(userId))
    // Denegar todo lo demás
    return ability
  }

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
        Resource.LOG,
      ])
      break

    case UserRole.CLUB_ADMIN:
      // CLUB_ADMIN - Principio de mínimo privilegio aplicado
      ability.can([Action.READ, Action.LIST], Resource.USER)
      ability.can([Action.READ, Action.UPDATE], Resource.USER, ownsUser(userId))

      // Puede crear, leer y actualizar (no DELETE global sin ownership)
      ability.can([Action.CREATE, Action.READ, Action.LIST, Action.UPDATE], [
        Resource.CLUB,
        Resource.COURT,
        Resource.TOURNAMENT,
        Resource.CATEGORY,
      ])

      // DELETE solo con ownership (torneos propios)
      ability.can(Action.DELETE, Resource.TOURNAMENT, (tournament: any) => {
        return tournament.organizerId === userId
      })

      // DELETE solo con ownership contextual (clubs, courts propios)
      ability.can(Action.DELETE, Resource.CLUB, (club: any) => {
        return club.adminId === userId
      })

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
      ability.can(Action.READ, Resource.USER, ownsUser(userId))
      ability.can(Action.UPDATE, Resource.USER, ownsUser(userId))

      ability.can([Action.READ, Action.LIST], [
        Resource.TOURNAMENT,
        Resource.CLUB,
        Resource.COURT,
        Resource.CATEGORY,
        Resource.RANKING,
      ])

      // Puede crear inscripciones y ver las propias
      ability.can([Action.CREATE, Action.READ, Action.LIST], Resource.REGISTRATION)
      ability.can([Action.READ, Action.UPDATE, Action.DELETE], Resource.REGISTRATION, ownsRegistration(userId))

      // Puede ver equipos donde es miembro
      ability.can([Action.READ, Action.LIST], Resource.TEAM, ownsTeam(userId))

      ability.can([Action.READ, Action.LIST], Resource.MATCH)
      ability.can([Action.READ, Action.LIST], Resource.NOTIFICATION, ownsNotification(userId))

      // No puede acceder al dashboard general
      ability.cannot(Action.READ, Resource.DASHBOARD)
      break

    case UserRole.REFEREE:
      // REFEREE puede gestionar partidos asignados
      ability.can(Action.READ, Resource.USER, ownsUser(userId))
      ability.can(Action.UPDATE, Resource.USER, ownsUser(userId))

      ability.can([Action.READ, Action.LIST], [
        Resource.TOURNAMENT,
        Resource.CLUB,
        Resource.COURT,
        Resource.CATEGORY,
        Resource.TEAM,
      ])

      // Solo puede actualizar partidos asignados a él
      ability.can([Action.READ, Action.LIST, Action.UPDATE], Resource.MATCH, ownsMatch(userId))

      ability.can([Action.READ, Action.LIST], Resource.NOTIFICATION, ownsNotification(userId))

      ability.can(Action.READ, Resource.DASHBOARD)
      break

    default:
      // Sin rol o rol desconocido - sin permisos
      break
  }

  return ability
}