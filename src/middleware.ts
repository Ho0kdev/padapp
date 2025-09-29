// src/middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { checkRoleAccess } from "@/lib/navigation"

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Log para debugging (remover en producción)
    if (pathname.startsWith('/dashboard') && pathname !== '/dashboard') {
      console.log(`[Middleware] Checking access to: ${pathname}, User role: ${token?.role}`)
    }

    // Redirección especial para usuarios PLAYER
    if (token && token.role === 'PLAYER') {
      // Si un PLAYER intenta acceder al dashboard general, redirigir a su perfil
      if (pathname === '/dashboard') {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${token.sub}` // token.sub es el ID del usuario
        return NextResponse.redirect(url)
      }

      // Si un PLAYER intenta acceder a rutas administrativas, redirigir a su perfil
      // Solo permitir acceso a su perfil personal (solo lectura)
      if (pathname !== `/dashboard/users/${token.sub}` && !checkRoleAccess(pathname, token.role as string, token.sub as string)) {
        const url = req.nextUrl.clone()
        url.pathname = `/dashboard/users/${token.sub}`
        return NextResponse.redirect(url)
      }
    }

    // Para otros roles (ADMIN, CLUB_ADMIN, REFEREE), verificar permisos normalmente
    if (token && token.role !== 'PLAYER' && pathname.startsWith('/dashboard') && pathname !== '/dashboard') {
      const hasAccess = checkRoleAccess(pathname, token.role as string)

      if (!hasAccess) {
        // Redireccionar al dashboard para roles administrativos
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Permitir acceso a las rutas de auth sin token
        if (pathname.startsWith('/auth/')) {
          return true
        }

        // Para rutas del dashboard, solo verificar autenticación
        // (los permisos de rol se manejan en el middleware arriba)
        if (pathname.startsWith('/dashboard')) {
          return !!token // Solo requiere estar autenticado
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}