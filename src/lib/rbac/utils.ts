// src/lib/rbac/utils.ts

/**
 * Utilidades adicionales para el sistema RBAC
 */

import { invalidateUserCache } from './cache'
import { Action, Resource } from './types'

/**
 * Mapeo legible de acciones
 */
export const ACTION_LABELS: Record<Action, string> = {
  [Action.CREATE]: 'Crear',
  [Action.READ]: 'Ver',
  [Action.UPDATE]: 'Actualizar',
  [Action.DELETE]: 'Eliminar',
  [Action.MANAGE]: 'Gestionar',
  [Action.LIST]: 'Listar',
  [Action.APPROVE]: 'Aprobar',
  [Action.REJECT]: 'Rechazar',
}

/**
 * Mapeo legible de recursos
 */
export const RESOURCE_LABELS: Record<Resource, string> = {
  [Resource.USER]: 'Usuario',
  [Resource.PLAYER]: 'Jugador',
  [Resource.TOURNAMENT]: 'Torneo',
  [Resource.CLUB]: 'Club',
  [Resource.COURT]: 'Cancha',
  [Resource.CATEGORY]: 'Categoría',
  [Resource.REGISTRATION]: 'Inscripción',
  [Resource.TEAM]: 'Equipo',
  [Resource.MATCH]: 'Partido',
  [Resource.RANKING]: 'Ranking',
  [Resource.PAYMENT]: 'Pago',
  [Resource.NOTIFICATION]: 'Notificación',
  [Resource.REPORT]: 'Reporte',
  [Resource.DASHBOARD]: 'Panel de Control',
  [Resource.LOG]: 'Log del Sistema',
}

/**
 * Obtener etiqueta legible de una acción
 */
export function getActionLabel(action: Action): string {
  return ACTION_LABELS[action] || action
}

/**
 * Obtener etiqueta legible de un recurso
 */
export function getResourceLabel(resource: Resource): string {
  return RESOURCE_LABELS[resource] || resource
}

/**
 * Generar mensaje de permiso denegado
 */
export function getPermissionDeniedMessage(
  action: Action,
  resource: Resource
): string {
  return `No tienes permiso para ${getActionLabel(action).toLowerCase()} ${getResourceLabel(resource).toLowerCase()}`
}

/**
 * Callback para ejecutar después de cambios críticos
 * que requieren invalidación de caché
 */
export function afterRoleChange(userId: string): void {
  // Invalidar caché del usuario
  invalidateUserCache(userId)

  // Aquí puedes agregar otras acciones como:
  // - Enviar notificación al usuario
  // - Registrar en logs
  // - Refrescar sesión
  console.log(`[RBAC] Caché invalidado para usuario: ${userId}`)
}

/**
 * Verificar si un error es de autorización
 */
export function isAuthorizationError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'UnauthorizedError' ||
      error.message.includes('No autorizado') ||
      error.message.includes('No tienes permiso')
    )
  }
  return false
}

/**
 * Verificar si un error es de autenticación
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Debes iniciar sesión') ||
      error.message.includes('No autenticado')
    )
  }
  return false
}

/**
 * Helper para logging de auditoría en desarrollo
 */
export function debugAudit(
  action: Action,
  resource: Resource,
  userId: string,
  resourceId?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[RBAC Audit]', {
      action,
      resource,
      userId,
      resourceId,
      timestamp: new Date().toISOString(),
    })
  }
}