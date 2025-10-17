// src/lib/rbac/roles.ts
import { UserRole } from '@prisma/client'

/**
 * Gestión de jerarquía de roles
 *
 * Jerarquía:
 * ADMIN > CLUB_ADMIN > REFEREE > PLAYER
 *
 * Un rol hereda todos los permisos de los roles inferiores en la jerarquía.
 */
export class RoleHierarchy {
  /**
   * Definición de la jerarquía de roles
   * Cada rol contiene los roles de los que hereda permisos
   */
  private static hierarchy: Map<UserRole, UserRole[]> = new Map([
    // ADMIN hereda de todos los demás roles
    [UserRole.ADMIN, [UserRole.CLUB_ADMIN, UserRole.REFEREE, UserRole.PLAYER]],

    // CLUB_ADMIN hereda de PLAYER
    [UserRole.CLUB_ADMIN, [UserRole.PLAYER]],

    // REFEREE hereda de PLAYER
    [UserRole.REFEREE, [UserRole.PLAYER]],

    // PLAYER no hereda de ningún rol
    [UserRole.PLAYER, []],
  ])

  /**
   * Verificar si un rol hereda de otro rol
   *
   * @param role - El rol a verificar
   * @param parentRole - El rol del que potencialmente hereda
   * @returns true si role hereda de parentRole (directa o indirectamente)
   */
  static inheritsFrom(role: UserRole, parentRole: UserRole): boolean {
    const parents = this.hierarchy.get(role) || []

    // Verificar herencia directa
    if (parents.includes(parentRole)) {
      return true
    }

    // Verificar herencia indirecta (recursiva)
    return parents.some(parent => this.inheritsFrom(parent, parentRole))
  }

  /**
   * Obtener todos los roles de los que hereda un rol dado
   * Incluye herencia directa e indirecta
   *
   * @param role - El rol del que obtener la herencia
   * @returns Array de roles de los que hereda (sin duplicados)
   */
  static getAllInheritedRoles(role: UserRole): UserRole[] {
    const inherited = this.hierarchy.get(role) || []
    const all: UserRole[] = [...inherited]

    // Obtener herencia indirecta de cada padre
    inherited.forEach(parent => {
      all.push(...this.getAllInheritedRoles(parent))
    })

    // Eliminar duplicados
    return [...new Set(all)]
  }

  /**
   * Obtener todos los roles en orden jerárquico (de mayor a menor privilegio)
   *
   * @returns Array de roles ordenados
   */
  static getAllRolesInHierarchy(): UserRole[] {
    return [
      UserRole.ADMIN,
      UserRole.CLUB_ADMIN,
      UserRole.REFEREE,
      UserRole.PLAYER,
    ]
  }

  /**
   * Verificar si un rol tiene mayor o igual privilegio que otro
   *
   * @param role1 - Primer rol
   * @param role2 - Segundo rol
   * @returns true si role1 >= role2 en la jerarquía
   */
  static hasEqualOrGreaterPrivilege(role1: UserRole, role2: UserRole): boolean {
    if (role1 === role2) return true
    return this.inheritsFrom(role1, role2)
  }

  /**
   * Obtener el rol de mayor privilegio de una lista
   *
   * @param roles - Lista de roles
   * @returns El rol con mayor privilegio
   */
  static getHighestRole(roles: UserRole[]): UserRole | null {
    const hierarchy = this.getAllRolesInHierarchy()

    for (const role of hierarchy) {
      if (roles.includes(role)) {
        return role
      }
    }

    return null
  }

  /**
   * Verificar si un rol puede gestionar (asignar/modificar) otro rol
   * Un rol solo puede gestionar roles de menor privilegio
   *
   * @param managerRole - Rol del usuario que gestiona
   * @param targetRole - Rol objetivo a gestionar
   * @returns true si puede gestionar
   */
  static canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    // ADMIN puede gestionar cualquier rol
    if (managerRole === UserRole.ADMIN) {
      return true
    }

    // CLUB_ADMIN puede gestionar PLAYER y REFEREE
    if (managerRole === UserRole.CLUB_ADMIN) {
      return targetRole === UserRole.PLAYER || targetRole === UserRole.REFEREE
    }

    // Otros roles no pueden gestionar roles
    return false
  }
}
