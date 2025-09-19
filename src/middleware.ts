// src/middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Middleware adicional si es necesario
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acceso a las rutas de auth sin token
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true
        }
        
        // Requerir token para rutas protegidas
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
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