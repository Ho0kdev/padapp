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
  UsersRound,
  FileText,
} from "lucide-react"

export type UserRole = "ADMIN" | "ORGANIZER" | "PLAYER" | "REFEREE"

export interface NavigationItem {
  name: string
  href: string
  icon: any
  roles?: UserRole[] // Si no se especifica, visible para todos los usuarios autenticados
  quickAccess?: boolean // Si es true, aparece en los accesos directos del menú móvil
}

/**
 * Sistema de Control de Acceso para el Sidebar
 *
 * Este sistema permite controlar qué opciones del menú ve cada usuario según su rol:
 *
 * ROLES DISPONIBLES:
 * - ADMIN: Administrador del sistema (acceso total)
 * - ORGANIZER: Administrador de club (gestión de su club)
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
    roles: ["ADMIN"], // Solo administradores pueden gestionar usuarios
    quickAccess: true // Aparece en accesos directos como "Inicio"
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
    roles: ["ADMIN", "ORGANIZER"] // Admins y administradores de club
  },
  {
    name: "Categorías",
    href: "/dashboard/categories",
    icon: Tag,
    roles: ["ADMIN", "ORGANIZER"] // Admins y administradores de club
  },
  {
    name: "Torneos",
    href: "/dashboard/tournaments",
    icon: Trophy,
    roles: ["ADMIN", "ORGANIZER", "PLAYER", "REFEREE"], // Todos pueden ver torneos, solo admins/organizers pueden crear/gestionar
    quickAccess: true // Aparece en accesos directos
  },
  {
    name: "Inscripciones",
    href: "/dashboard/registrations",
    icon: UserPlus,
    // Sin roles = todos pueden ver inscripciones (jugadores para inscribirse, admins para gestionar)
    quickAccess: true // Aparece en accesos directos
  },
  {
    name: "Equipos",
    href: "/dashboard/teams",
    icon: UsersRound
    // Sin roles = todos pueden ver equipos (jugadores ven sus equipos, admins gestionan todos)
  },
  {
    name: "Partidos",
    href: "/dashboard/matches",
    icon: FileText,
    roles: ["ADMIN", "ORGANIZER", "REFEREE", "PLAYER"], // Todos pueden ver partidos, solo admins/organizers/referees pueden gestionarlos
    quickAccess: true // Aparece en accesos directos
  },
  {
    name: "Rankings",
    href: "/dashboard/rankings",
    icon: Medal,
    // Sin roles = todos pueden ver rankings públicos
    quickAccess: true // Aparece en accesos directos
  },
  {
    name: "Panel de Admin",
    href: "/dashboard/admin",
    icon: Shield,
    roles: ["ADMIN"] // Solo administradores del sistema
  },

  // Opciones para futuro desarrollo con roles ya definidos:
  // { name: "Partidos", href: "/dashboard/matches", icon: Calendar, roles: ["ADMIN", "ORGANIZER", "REFEREE"] },
  // { name: "Pagos", href: "/dashboard/payments", icon: CreditCard, roles: ["ADMIN", "ORGANIZER"] },
  // { name: "Reportes", href: "/dashboard/reports", icon: BarChart3, roles: ["ADMIN", "ORGANIZER"] },
  // { name: "Notificaciones", href: "/dashboard/notifications", icon: Bell }, // Sin roles = todos
  // { name: "Configuración", href: "/dashboard/settings", icon: Settings }, // Sin roles = todos
]

/**
 * Función utilitaria para verificar si un usuario tiene acceso a una ruta específica
 * basándose en la configuración de navegación
 */
export function checkRoleAccess(pathname: string, userRole?: string, userId?: string): boolean {
  // Excepción especial: Los jugadores pueden acceder a su propio perfil (lectura y edición)
  if (userRole === 'PLAYER' && userId) {
    if (pathname === `/dashboard/users/${userId}` || pathname === `/dashboard/users/${userId}/edit`) {
      return true
    }

    // Excepción especial: Los jugadores pueden ver equipos específicos (la validación de que sea SU equipo se hace en la página)
    if (pathname.match(/^\/dashboard\/teams\/[a-zA-Z0-9]+$/)) {
      return true
    }
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