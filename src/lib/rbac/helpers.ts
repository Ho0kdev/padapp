// src/lib/rbac/helpers.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCachedAbility } from './cache'
import { Action, Resource, AuthorizationContext } from './types'
import { UnauthorizedError, ForbiddenError } from './policies/BasePolicy'
import { UserPolicy } from './policies/UserPolicy'
import { TournamentPolicy } from './policies/TournamentPolicy'
import { SecurityLogService } from '@/lib/services/security-log-service'
import { checkRateLimit, RateLimitError, RateLimitType } from './rate-limit'

/**
 * Obtener la sesión del usuario actual
 */
export async function getCurrentSession(): Promise<Session | null> {
  return await getServerSession(authOptions)
}

/**
 * Verificar si el usuario está autenticado
 * Opcionalmente aplica rate limiting si se proporciona un request
 */
export async function requireAuth(
  request?: NextRequest,
  rateLimitType: RateLimitType = 'read'
): Promise<Session> {
  // Aplicar rate limiting si se proporciona request
  if (request) {
    await checkRateLimit(request, rateLimitType)
  }

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
 * Opcionalmente aplica rate limiting si se proporciona un request
 */
export async function authorize(
  action: Action,
  resource: Resource,
  subject?: any,
  request?: NextRequest
): Promise<Session> {
  // Aplicar rate limiting basado en el tipo de acción
  if (request) {
    const rateLimitType = [Action.CREATE, Action.UPDATE, Action.DELETE].includes(action)
      ? 'write'
      : 'read'
    await checkRateLimit(request, rateLimitType)
  }

  const session = await requireAuth()

  if (!(await checkPermission(session, action, resource, subject))) {
    // Crear error con contexto para logging
    const error: any = new ForbiddenError(
      `No tienes permiso para realizar esta acción`
    )
    error.context = {
      userId: session.user.id,
      resource,
      action,
    }
    throw error
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
  const ability = getCachedAbility(context)
  return ability.check(action, resource, subject)
}

/**
 * Obtener habilidades del usuario actual
 */
export async function getCurrentAbility() {
  const session = await requireAuth()
  const context = createAuthContext(session)
  return getCachedAbility(context)
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
  handler: (request: NextRequest, context: T, session: Session) => Promise<Response>,
  rateLimitType: RateLimitType = 'read'
) {
  return async (request: NextRequest, context: T) => {
    try {
      const session = await requireAuth(request, rateLimitType)
      return await handler(request, context, session)
    } catch (error) {
      return handleAuthError(error, request)
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

      const session = await authorize(action, resource, subject, request)
      return await handler(request, context, session)
    } catch (error) {
      return handleAuthError(error, request)
    }
  }
}

/**
 * Manejar errores de autorización
 * Registra automáticamente accesos denegados y rate limits excedidos
 */
export function handleAuthError(error: unknown, request?: NextRequest): NextResponse {
  console.error('Authorization error:', error)

  const ip = request?.headers.get('x-forwarded-for') || undefined
  const userAgent = request?.headers.get('user-agent') || undefined

  // Error 429 - Rate limit excedido
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, retryAfter: error.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': error.retryAfter.toString(),
        },
      }
    )
  }

  // Error 401 - No autenticado
  if (error instanceof UnauthorizedError) {
    // Registrar token inválido
    SecurityLogService.logInvalidToken({
      ip,
      userAgent,
      reason: error.message,
    }).catch(err => console.error('Failed to log security event:', err))

    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Error 403 - Sin permisos
  if (error instanceof ForbiddenError) {
    // Extraer contexto si está disponible
    const errorData = (error as any).context || {}

    // Registrar acceso denegado
    SecurityLogService.logAccessDenied({
      userId: errorData.userId,
      resource: errorData.resource || 'unknown',
      action: errorData.action || 'unknown',
      ip,
      userAgent,
      reason: error.message,
    }).catch(err => console.error('Failed to log security event:', err))

    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Otros errores - 500
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