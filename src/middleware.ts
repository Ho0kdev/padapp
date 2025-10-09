// src/middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { checkRoleAccess } from "@/lib/navigation"

/**
 * Middleware mejorado con separación de autenticación y autorización
 * Usa el nuevo sistema RBAC para verificar permisos
 */
export default withAuth(
  function middleware(req: any) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (!token) return NextResponse.next()

    const userId = token.sub as string
    const userRole = token.role as string

    // Manejo especial para PLAYER - redirigir a su perfil
    if (userRole === 'PLAYER') {
      if (pathname === '/dashboard') {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${userId}`
        return NextResponse.redirect(url)
      }

      // Verificar acceso usando el sistema de navegación
      if (
        pathname !== `/dashboard/users/${userId}` &&
        !checkRoleAccess(pathname, userRole, userId)
      ) {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${userId}`
        return NextResponse.redirect(url)
      }
    }

    // Para otros roles, verificar permisos usando checkRoleAccess
    if (userRole !== 'PLAYER' && pathname.startsWith('/dashboard') && pathname !== '/dashboard') {
      const hasAccess = checkRoleAccess(pathname, userRole)

      if (!hasAccess) {
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
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