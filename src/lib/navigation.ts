// src/lib/navigation.ts
import {
  Trophy,
  Users,
  Building,
  Home,
  Medal,
  Shield,
  Tag,
  UserPlus,
} from "lucide-react"

export type UserRole = "ADMIN" | "CLUB_ADMIN" | "PLAYER" | "REFEREE"

export interface NavigationItem {
  name: string
  href: string
  icon: any
  roles?: UserRole[] // Si no se especifica, visible para todos los usuarios autenticados
}

/**
 * Sistema de Control de Acceso para el Sidebar
 *
 * Este sistema permite controlar qué opciones del menú ve cada usuario según su rol:
 *
 * ROLES DISPONIBLES:
 * - ADMIN: Administrador del sistema (acceso total)
 * - CLUB_ADMIN: Administrador de club (gestión de su club)
 * - PLAYER: Jugador (inscripciones, ver rankings)
 * - REFEREE: Árbitro (gestión de partidos)
 *
 * COMO FUNCIONA:
 * - Si una opción NO tiene 'roles' definidos = visible para TODOS
 * - Si una opción SÍ tiene 'roles' = solo visible para esos roles
 * - El filtro se aplica automáticamente al renderizar el sidebar
 * - El middleware usa esta misma configuración para proteger rutas
 */

export const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["ADMIN"] // Solo administradores pueden gestionar usuarios
  },
  {
    name: "Usuarios",
    href: "/dashboard/users",
    icon: Users,
    roles: ["ADMIN"] // Solo administradores pueden gestionar usuarios
  },
  {
    name: "Clubes",
    href: "/dashboard/clubs",
    icon: Building,
    roles: ["ADMIN", "CLUB_ADMIN"] // Admins y administradores de club
  },
  {
    name: "Categorías",
    href: "/dashboard/categories",
    icon: Tag,
    roles: ["ADMIN", "CLUB_ADMIN"] // Admins y administradores de club
  },
  {
    name: "Torneos",
    href: "/dashboard/tournaments",
    icon: Trophy,
    roles: ["ADMIN", "CLUB_ADMIN"] // Admins y administradores de club pueden crear/gestionar torneos
  },
  {
    name: "Inscripciones",
    href: "/dashboard/registrations",
    icon: UserPlus
    // Sin roles = todos pueden ver inscripciones (jugadores para inscribirse, admins para gestionar)
  },
  {
    name: "Rankings",
    href: "/dashboard/rankings",
    icon: Medal
    // Sin roles = todos pueden ver rankings públicos
  },
  {
    name: "Panel de Admin",
    href: "/dashboard/admin",
    icon: Shield,
    roles: ["ADMIN"] // Solo administradores del sistema
  },

  // Opciones para futuro desarrollo con roles ya definidos:
  // { name: "Partidos", href: "/dashboard/matches", icon: Calendar, roles: ["ADMIN", "CLUB_ADMIN", "REFEREE"] },
  // { name: "Pagos", href: "/dashboard/payments", icon: CreditCard, roles: ["ADMIN", "CLUB_ADMIN"] },
  // { name: "Reportes", href: "/dashboard/reports", icon: BarChart3, roles: ["ADMIN", "CLUB_ADMIN"] },
  // { name: "Notificaciones", href: "/dashboard/notifications", icon: Bell }, // Sin roles = todos
  // { name: "Configuración", href: "/dashboard/settings", icon: Settings }, // Sin roles = todos
]

/**
 * Función utilitaria para verificar si un usuario tiene acceso a una ruta específica
 * basándose en la configuración de navegación
 */
export function checkRoleAccess(pathname: string, userRole?: string, userId?: string): boolean {
  // Excepción especial: Los jugadores pueden acceder a su propio perfil (solo lectura)
  if (userRole === 'PLAYER' && userId && pathname === `/dashboard/users/${userId}`) {
    return true
  }

  // Buscar la ruta en la configuración de navegación
  let matchingRoute = navigation.find(item =>
    pathname === item.href
  )

  // Si no se encuentra la ruta exacta, buscar por prefijo (para subrutas)
  if (!matchingRoute) {
    matchingRoute = navigation.find(item =>
      item.href !== '/dashboard' && pathname.startsWith(item.href + '/')
    )
  }

  if (matchingRoute) {
    // Si no tiene roles definidos, es accesible para todos los usuarios autenticados
    if (!matchingRoute.roles || matchingRoute.roles.length === 0) {
      return true
    }
    // Verificar si el rol del usuario está en la lista de roles permitidos
    return matchingRoute.roles.includes(userRole as UserRole)
  }

  // Si no se encuentra en la configuración, permitir acceso por defecto
  // (esto incluye rutas como /dashboard que no están en la configuración específica)
  return true
}