// src/proxy.ts
import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { checkRoleAccess } from "@/lib/navigation"

/**
 * Agregar headers de seguridad HTTP a la respuesta
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevenir MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevenir clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Protección XSS para navegadores legacy
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Controlar información de referrer
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Deshabilitar APIs del navegador no utilizadas
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // HSTS: Forzar HTTPS en producción
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Content Security Policy básico
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

/**
 * Proxy mejorado con separación de autenticación y autorización
 * Usa el nuevo sistema RBAC para verificar permisos
 * Incluye headers de seguridad HTTP
 */
export default withAuth(
  function proxy(req: any) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (!token) {
      const response = NextResponse.next()
      return addSecurityHeaders(response)
    }

    const userId = token.sub as string
    const userRole = token.role as string

    // Manejo especial para PLAYER - redirigir a su perfil
    if (userRole === 'PLAYER') {
      if (pathname === '/dashboard') {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${userId}`
        const response = NextResponse.redirect(url)
        return addSecurityHeaders(response)
      }

      // Verificar acceso usando el sistema de navegación
      if (
        pathname !== `/dashboard/users/${userId}` &&
        !checkRoleAccess(pathname, userRole, userId)
      ) {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${userId}`
        const response = NextResponse.redirect(url)
        return addSecurityHeaders(response)
      }
    }

    // Para otros roles, verificar permisos usando checkRoleAccess
    if (userRole !== 'PLAYER' && pathname.startsWith('/dashboard') && pathname !== '/dashboard') {
      const hasAccess = checkRoleAccess(pathname, userRole)

      if (!hasAccess) {
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        const response = NextResponse.redirect(url)
        return addSecurityHeaders(response)
      }
    }

    const response = NextResponse.next()
    return addSecurityHeaders(response)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Permitir rutas de auth sin token
        if (pathname.startsWith('/auth/')) {
          return true
        }

        // Para rutas del dashboard, requerir autenticación
        if (pathname.startsWith('/dashboard')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}
