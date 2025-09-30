// src/lib/rbac/ownership.ts

/**
 * Helpers para verificar ownership de recursos
 * Unifica la lógica de verificación de propiedad
 */

/**
 * Verificar si un usuario es dueño de un recurso por ID directo
 * @example isOwner(userId, user) // user.id === userId
 */
export function isOwner(userId: string, resource: any): boolean {
  if (!resource) return false
  return resource.id === userId || resource.userId === userId
}

/**
 * Verificar si un usuario es miembro de un equipo (player1 o player2)
 * @example isTeamMember(userId, team)
 */
export function isTeamMember(userId: string, team: any): boolean {
  if (!team) return false
  return team.player1Id === userId || team.player2Id === userId
}

/**
 * Verificar si un usuario es participante de una inscripción
 * Busca en el team relacionado
 * @example isRegistrationParticipant(userId, registration)
 */
export function isRegistrationParticipant(userId: string, registration: any): boolean {
  if (!registration) return false

  // Si tiene team directamente
  if (registration.team) {
    return isTeamMember(userId, registration.team)
  }

  // Si tiene player1Id/player2Id directamente (team embebido)
  if (registration.player1Id || registration.player2Id) {
    return registration.player1Id === userId || registration.player2Id === userId
  }

  return false
}

/**
 * Verificar si un usuario es árbitro asignado a un partido
 * @example isAssignedReferee(userId, match)
 */
export function isAssignedReferee(userId: string, match: any): boolean {
  if (!match) return false
  return match.refereeId === userId
}

/**
 * Verificar si un usuario es organizador de un torneo
 * @example isTournamentOrganizer(userId, tournament)
 */
export function isTournamentOrganizer(userId: string, tournament: any): boolean {
  if (!tournament) return false
  return tournament.organizerId === userId
}

/**
 * Verificar si un recurso pertenece a un club específico
 * @example belongsToClub(clubId, resource)
 */
export function belongsToClub(clubId: string, resource: any): boolean {
  if (!resource) return false
  return resource.clubId === clubId
}

/**
 * Condición de ownership para User resource
 */
export const ownsUser = (userId: string) => ({
  id: userId
})

/**
 * Condición de ownership para Team resource (función)
 */
export const ownsTeam = (userId: string) => (team: any) => {
  return isTeamMember(userId, team)
}

/**
 * Condición de ownership para Registration (función)
 */
export const ownsRegistration = (userId: string) => (registration: any) => {
  return isRegistrationParticipant(userId, registration)
}

/**
 * Condición de ownership para Match (referee)
 */
export const ownsMatch = (userId: string) => ({
  refereeId: userId
})

/**
 * Condición de ownership para Tournament (organizer)
 */
export const ownsTournament = (userId: string) => ({
  organizerId: userId
})

/**
 * Condición de ownership para Notification
 */
export const ownsNotification = (userId: string) => ({
  userId: userId
})

/**
 * Verificación genérica de ownership
 * Intenta múltiples estrategias para determinar ownership
 */
export function checkOwnership(userId: string, resource: any, context?: any): boolean {
  if (!resource) return false

  // Estrategia 1: ID directo
  if (resource.id === userId || resource.userId === userId) {
    return true
  }

  // Estrategia 2: Team member
  if (resource.player1Id || resource.player2Id) {
    return isTeamMember(userId, resource)
  }

  // Estrategia 3: Team anidado
  if (resource.team) {
    return isTeamMember(userId, resource.team)
  }

  // Estrategia 4: Organizador
  if (resource.organizerId) {
    return resource.organizerId === userId
  }

  // Estrategia 5: Árbitro
  if (resource.refereeId) {
    return resource.refereeId === userId
  }

  // Estrategia 6: Contexto adicional
  if (context) {
    if (typeof context === 'function') {
      return context(resource, userId)
    }
  }

  return false
}

/**
 * ============================================================================
 * DOCUMENTACIÓN: PATRÓN DE OWNERSHIP
 * ============================================================================
 *
 * El sistema de ownership permite verificar si un usuario tiene "propiedad"
 * sobre un recurso específico, lo cual le otorga permisos adicionales.
 *
 * ## CASOS DE USO
 *
 * ### 1. Ownership Simple (por ID)
 * ```typescript
 * // En ability.ts
 * ability.can(Action.UPDATE, Resource.USER, ownsUser(userId))
 *
 * // Permite actualizar solo su propio perfil
 * // user.id === userId
 * ```
 *
 * ### 2. Ownership por Relación (Team)
 * ```typescript
 * // En ability.ts
 * ability.can(Action.READ, Resource.TEAM, ownsTeam(userId))
 *
 * // Permite ver equipos donde es miembro
 * // team.player1Id === userId || team.player2Id === userId
 * ```
 *
 * ### 3. Ownership Anidado (Registration)
 * ```typescript
 * // En ability.ts
 * ability.can(Action.DELETE, Resource.REGISTRATION, ownsRegistration(userId))
 *
 * // Verifica ownership en el team relacionado
 * // registration.team.player1Id === userId || registration.team.player2Id === userId
 * ```
 *
 * ### 4. Ownership por Rol (Match/Referee)
 * ```typescript
 * // En ability.ts
 * ability.can(Action.UPDATE, Resource.MATCH, ownsMatch(userId))
 *
 * // Solo árbitros asignados pueden actualizar
 * // match.refereeId === userId
 * ```
 *
 * ## CÓMO USAR EN API ROUTES
 *
 * ```typescript
 * import { authorize, Action, Resource } from '@/lib/rbac'
 *
 * export async function PUT(request: NextRequest, { params }) {
 *   // Obtener recurso existente
 *   const team = await prisma.team.findUnique({
 *     where: { id: params.id }
 *   })
 *
 *   // Verificar permisos (incluye ownership automáticamente)
 *   await authorize(Action.UPDATE, Resource.TEAM, team)
 *
 *   // Si llega aquí, tiene permisos (es ADMIN o es owner)
 *   // ... actualizar recurso
 * }
 * ```
 *
 * ## VENTAJAS DE ESTE PATRÓN
 *
 * ✅ **Consistente**: Todas las verificaciones usan la misma estructura
 * ✅ **Type-safe**: TypeScript detecta errores en tiempo de desarrollo
 * ✅ **Reutilizable**: Helpers se pueden usar en múltiples lugares
 * ✅ **Testeable**: Funciones puras fáciles de testear
 * ✅ **Mantenible**: Un solo lugar para modificar lógica de ownership
 *
 * ## AGREGAR NUEVO TIPO DE OWNERSHIP
 *
 * 1. Crear función helper en este archivo:
 * ```typescript
 * export function isProjectMember(userId: string, project: any): boolean {
 *   if (!project) return false
 *   return project.members?.some(m => m.userId === userId)
 * }
 * ```
 *
 * 2. Crear condición en este archivo:
 * ```typescript
 * export const ownsProject = (userId: string) => (project: any) => {
 *   return isProjectMember(userId, project)
 * }
 * ```
 *
 * 3. Usar en ability.ts:
 * ```typescript
 * import { ownsProject } from './ownership'
 *
 * ability.can(Action.UPDATE, Resource.PROJECT, ownsProject(userId))
 * ```
 *
 * ============================================================================
 */