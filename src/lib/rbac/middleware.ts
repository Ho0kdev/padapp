// src/lib/rbac/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRoleAccess } from '@/lib/navigation'

/**
 * Middleware de autenticación
 * Verifica si el usuario está autenticado
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/auth/login', '/auth/register', '/api/auth']

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return null // Continuar sin restricciones
  }

  // Obtener token de autenticación
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Si no hay token y la ruta requiere autenticación, redirigir a login
  if (!token && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return null
}

/**
 * Middleware de autorización
 * Verifica permisos basados en roles
 */
export async function authorizationMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  // Solo aplicar a rutas del dashboard
  if (!pathname.startsWith('/dashboard')) {
    return null
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    return null // Ya manejado por authMiddleware
  }

  const userId = token.sub as string
  const userRole = token.role as string

  // Manejo especial para PLAYER - redirigir a su perfil
  if (userRole === 'PLAYER') {
    // Si intenta acceder al dashboard general, redirigir a su perfil
    if (pathname === '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/users/${userId}`
      return NextResponse.redirect(url)
    }

    // Si intenta acceder a rutas no permitidas, redirigir a su perfil
    if (
      pathname !== `/dashboard/users/${userId}` &&
      !checkRoleAccess(pathname, userRole, userId)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/users/${userId}`
      return NextResponse.redirect(url)
    }
  }

  // Para otros roles, verificar permisos normalmente
  if (userRole !== 'PLAYER' && pathname !== '/dashboard') {
    const hasAccess = checkRoleAccess(pathname, userRole)

    if (!hasAccess) {
      // Redirigir al dashboard si no tiene acceso
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return null
}

/**
 * Combinar todos los middlewares
 */
export async function rbacMiddleware(request: NextRequest): Promise<NextResponse> {
  // 1. Verificar autenticación
  const authResponse = await authMiddleware(request)
  if (authResponse) return authResponse

  // 2. Verificar autorización
  const authzResponse = await authorizationMiddleware(request)
  if (authzResponse) return authzResponse

  // Si todo está bien, continuar
  return NextResponse.next()
}