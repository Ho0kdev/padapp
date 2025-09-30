// src/lib/rbac/policies/TournamentPolicy.ts
import { BasePolicy } from './BasePolicy'
import { Action, Resource } from '../types'

/**
 * Política para el recurso Tournament
 */
export class TournamentPolicy extends BasePolicy {
  canViewList(): boolean {
    return this.canListResource(Resource.TOURNAMENT)
  }

  canView(tournament?: any): boolean {
    return this.canReadResource(Resource.TOURNAMENT, tournament)
  }

  canCreate(): boolean {
    return this.canCreateResource(Resource.TOURNAMENT)
  }

  canUpdate(tournament?: any): boolean {
    return this.canUpdateResource(Resource.TOURNAMENT, tournament)
  }

  canDelete(tournament?: any): boolean {
    return this.canDeleteResource(Resource.TOURNAMENT, tournament)
  }

  canPublish(tournament?: any): boolean {
    return this.canUpdateResource(Resource.TOURNAMENT, tournament)
  }

  canManageRegistrations(tournament?: any): boolean {
    return this.can(Action.APPROVE, Resource.REGISTRATION, tournament)
  }
}