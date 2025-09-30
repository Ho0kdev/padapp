// src/lib/rbac/helpers.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilitiesFor } from './ability'
import { Action, Resource, AuthorizationContext } from './types'
import { UnauthorizedError } from './policies/BasePolicy'
import { UserPolicy } from './policies/UserPolicy'
import { TournamentPolicy } from './policies/TournamentPolicy'

/**
 * Obtener la sesión del usuario actual
 */
export async function getCurrentSession(): Promise<Session | null> {
  return await getServerSession(authOptions)
}

/**
 * Verificar si el usuario está autenticado
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession()

  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión para acceder a este recurso')
  }

  return session
}

/**
 * Crear contexto de autorización desde la sesión
 */
export function createAuthContext(session: Session): AuthorizationContext {
  return {
    userId: session.user.id,
    userRole: session.user.role,
    userStatus: session.user.status,
  }
}

/**
 * Verificar permisos del usuario
 */
export async function authorize(
  action: Action,
  resource: Resource,
  subject?: any
): Promise<Session> {
  const session = await requireAuth()

  if (!(await checkPermission(session, action, resource, subject))) {
    throw new UnauthorizedError(
      `No tienes permiso para realizar esta acción`
    )
  }

  return session
}

/**
 * Verificar permiso sin lanzar error (helper interno)
 */
async function checkPermission(
  session: Session,
  action: Action,
  resource: Resource,
  subject?: any
): Promise<boolean> {
  const context = createAuthContext(session)
  const ability = defineAbilitiesFor(context)
  return ability.check(action, resource, subject)
}

/**
 * Obtener habilidades del usuario actual
 */
export async function getCurrentAbility() {
  const session = await requireAuth()
  const context = createAuthContext(session)
  return defineAbilitiesFor(context)
}

/**
 * Obtener políticas para el usuario actual
 */
export async function getPolicies() {
  const ability = await getCurrentAbility()

  return {
    user: new UserPolicy(ability),
    tournament: new TournamentPolicy(ability),
  }
}

/**
 * Wrapper para handlers de API con autorización automática
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, context: T, session: Session) => Promise<Response>
) {
  return async (request: NextRequest, context: T) => {
    try {
      const session = await requireAuth()
      return await handler(request, context, session)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}

/**
 * Wrapper para handlers de API con autorización y verificación de permisos
 */
export function withPermission<T = any>(
  action: Action,
  resource: Resource,
  handler: (request: NextRequest, context: T, session: Session) => Promise<Response>,
  options?: {
    getSubject?: (request: NextRequest, context: T) => Promise<any>
  }
) {
  return async (request: NextRequest, context: T) => {
    try {
      const subject = options?.getSubject
        ? await options.getSubject(request, context)
        : undefined

      const session = await authorize(action, resource, subject)
      return await handler(request, context, session)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}

/**
 * Manejar errores de autorización
 */
export function handleAuthError(error: unknown): NextResponse {
  console.error('Authorization error:', error)

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  )
}

/**
 * Verificar si el usuario actual puede realizar una acción
 */
export async function can(
  action: Action,
  resource: Resource,
  subject?: any
): Promise<boolean> {
  try {
    const session = await getCurrentSession()
    if (!session?.user) return false

    return await checkPermission(session, action, resource, subject)
  } catch {
    return false
  }
}

/**
 * Filtrar lista de items según permisos del usuario
 */
export async function filterByPermission<T>(
  items: T[],
  action: Action,
  resource: Resource,
  getSubject: (item: T) => any = (item) => item
): Promise<T[]> {
  const ability = await getCurrentAbility()

  return items.filter(item => {
    const subject = getSubject(item)
    return ability.check(action, resource, subject)
  })
}