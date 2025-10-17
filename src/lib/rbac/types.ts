// src/lib/rbac/types.ts

/**
 * Acciones disponibles en el sistema RBAC
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Acceso total al recurso
  LIST = 'list',
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Recursos del sistema
 */
export enum Resource {
  USER = 'User',
  PLAYER = 'Player',
  TOURNAMENT = 'Tournament',
  CLUB = 'Club',
  COURT = 'Court',
  CATEGORY = 'Category',
  REGISTRATION = 'Registration',
  TEAM = 'Team',
  MATCH = 'Match',
  RANKING = 'Ranking',
  PAYMENT = 'Payment',
  NOTIFICATION = 'Notification',
  REPORT = 'Report',
  DASHBOARD = 'Dashboard',
  LOG = 'Log',
}

/**
 * Condiciones para permisos contextuales
 */
export interface PermissionCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains'
  value: any
}

/**
 * Definición de una regla de permiso
 */
export interface PermissionRule {
  action: Action | Action[]
  resource: Resource | Resource[]
  conditions?: PermissionCondition[]
  inverted?: boolean // Para negar permisos (cannot)
}

/**
 * Contexto de autorización
 */
export interface AuthorizationContext {
  userId: string
  userRole: string
  userStatus?: string
  resource?: any
  [key: string]: any
}