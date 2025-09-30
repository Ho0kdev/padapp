// src/lib/rbac/policies/UserPolicy.ts
import { BasePolicy } from './BasePolicy'
import { Action, Resource } from '../types'

/**
 * Política para el recurso User
 */
export class UserPolicy extends BasePolicy {
  canViewList(): boolean {
    return this.canListResource(Resource.USER)
  }

  canView(user?: any): boolean {
    return this.canReadResource(Resource.USER, user)
  }

  canCreate(): boolean {
    return this.canCreateResource(Resource.USER)
  }

  canUpdate(user?: any): boolean {
    return this.canUpdateResource(Resource.USER, user)
  }

  canDelete(user?: any): boolean {
    return this.canDeleteResource(Resource.USER, user)
  }

  canChangeRole(user?: any): boolean {
    // Solo ADMIN puede cambiar roles
    return this.can(Action.MANAGE, Resource.USER, user)
  }

  canChangeStatus(user?: any): boolean {
    // Solo ADMIN puede cambiar status
    return this.can(Action.MANAGE, Resource.USER, user)
  }
}