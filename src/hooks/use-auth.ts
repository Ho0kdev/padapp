// src/hooks/use-auth.ts
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { UserRole } from "@prisma/client"

/**
 * Hook para manejar autenticación y obtener información del usuario
 */
export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router, requireAuth])

  // Helpers de roles
  const isAdmin = useMemo(
    () => session?.user?.role === UserRole.ADMIN,
    [session]
  )

  const isClubAdmin = useMemo(
    () => session?.user?.role === UserRole.CLUB_ADMIN,
    [session]
  )

  const isPlayer = useMemo(
    () => session?.user?.role === UserRole.PLAYER,
    [session]
  )

  const isReferee = useMemo(
    () => session?.user?.role === UserRole.REFEREE,
    [session]
  )

  const hasRole = useMemo(
    () => (roles: UserRole[]) => {
      if (!session?.user?.role) return false
      return roles.includes(session.user.role)
    },
    [session]
  )

  // Helper combinado para Admin o ClubAdmin (para permisos de gestión)
  const isAdminOrClubAdmin = useMemo(
    () => isAdmin || isClubAdmin,
    [isAdmin, isClubAdmin]
  )

  return {
    user: session?.user,
    loading: status === "loading",
    authenticated: status === "authenticated",
    // Helpers de roles
    isAdmin,
    isClubAdmin,
    isPlayer,
    isReferee,
    isAdminOrClubAdmin,
    hasRole,
  }
}

/**
 * Hook que requiere autenticación obligatoria
 */
export function useRequireAuth() {
  return useAuth(true)
}

/**
 * Hook que requiere un rol específico
 */
export function useRequireRole(roles: UserRole[]) {
  const auth = useAuth(true)
  const router = useRouter()

  const hasRequiredRole = useMemo(() => auth.hasRole(roles), [auth.hasRole, roles])

  useEffect(() => {
    if (auth.authenticated && !hasRequiredRole) {
      // Redirigir si no tiene el rol correcto
      router.push("/dashboard")
    }
  }, [auth.authenticated, hasRequiredRole, router])

  return auth
}