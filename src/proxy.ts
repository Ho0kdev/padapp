// src/proxy.ts
import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { checkRoleAccess } from "@/lib/navigation"
import { getToken } from 'next-auth/jwt'

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
 * Middleware para modo mantenimiento
 *
 * Cuando MAINTENANCE_MODE=true:
 * - Usuarios no logueados → Página de mantenimiento
 * - Usuarios con rol PLAYER/CLUB_ADMIN/REFEREE → Página de mantenimiento
 * - Usuarios con rol ADMIN → Acceso completo al sistema
 */
async function checkMaintenanceMode(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

  // DEBUG: Log para verificar que el proxy se ejecuta
  console.log('[PROXY DEBUG] Pathname:', pathname)
  console.log('[PROXY DEBUG] NEXT_PUBLIC_MAINTENANCE_MODE:', process.env.NEXT_PUBLIC_MAINTENANCE_MODE)
  console.log('[PROXY DEBUG] isMaintenanceMode:', isMaintenanceMode)

  // Si no está en modo mantenimiento, continuar normalmente
  if (!isMaintenanceMode) {
    console.log('[PROXY DEBUG] Maintenance mode OFF - continuing normally')
    return null
  }

  console.log('[PROXY DEBUG] Maintenance mode ON - checking access')

  // Rutas que siempre deben estar accesibles (incluso en modo mantenimiento)
  const publicPaths = [
    '/maintenance',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/api/auth', // NextAuth routes
  ]

  // Si la ruta es pública, permitir acceso
  if (publicPaths.some(path => pathname.startsWith(path))) {
    console.log('[PROXY DEBUG] ✅ Public path - allowing access')
    return null
  }

  // Rutas estáticas (CSS, JS, imágenes, fuentes, etc.)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    console.log('[PROXY DEBUG] ✅ Static resource - allowing access')
    return null
  }

  // Obtener el token de sesión
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  console.log('[PROXY DEBUG] Token:', token ? `EXISTS (role: ${token.role})` : 'NULL')

  // Si no hay token (usuario no logueado), redirigir a mantenimiento
  if (!token) {
    console.log('[PROXY DEBUG] 🚫 No token → REDIRECTING to /maintenance')
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // Si el usuario NO es ADMIN, redirigir a mantenimiento
  if (token.role !== 'ADMIN') {
    console.log('[PROXY DEBUG] 🚫 Non-ADMIN (role:', token.role, ') → REDIRECTING to /maintenance')
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // Si es ADMIN, continuar con el flujo normal
  console.log('[PROXY DEBUG] ✅ ADMIN user - allowing full access')
  return null
}

/**
 * Proxy mejorado con separación de autenticación y autorización
 * Usa el nuevo sistema RBAC para verificar permisos
 * Incluye headers de seguridad HTTP y modo mantenimiento
 */
export default withAuth(
  async function proxy(req: any) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // PRIMERO: Verificar modo mantenimiento
    const maintenanceResponse = await checkMaintenanceMode(req)
    if (maintenanceResponse) {
      return addSecurityHeaders(maintenanceResponse)
    }

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
  matcher: [
    /*
     * Interceptar todas las rutas excepto:
     * - api/webhooks (webhooks de MercadoPago)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - maintenance (página de mantenimiento)
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
}
