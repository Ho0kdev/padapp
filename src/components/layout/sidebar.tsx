// src/components/layout/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import {
  Trophy,
  Users,
  Calendar,
  Building,
  BarChart3,
  Settings,
  Home,
  Medal,
  CreditCard,
  Bell,
  Shield,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Torneos", href: "/dashboard/tournaments", icon: Trophy },
  { name: "Clubes", href: "/dashboard/clubs", icon: Building },
  { name: "Jugadores", href: "/dashboard/players", icon: Users },
  { name: "Partidos", href: "/dashboard/matches", icon: Calendar },
  { name: "Rankings", href: "/dashboard/rankings", icon: Medal },
  { name: "Pagos", href: "/dashboard/payments", icon: CreditCard },
  { name: "Reportes", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Notificaciones", href: "/dashboard/notifications", icon: Bell },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Agregar enlace de admin si el usuario es administrador
  const navigationItems = [
    ...navigation,
    ...(user?.role === "ADMIN" ? [
      { name: "Admin Dashboard", href: "/dashboard/admin/tournaments", icon: Shield }
    ] : [])
  ]

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold text-white">PadApp</span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white",
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
              )}
            >
              <item.icon
                className={cn(
                  isActive ? "text-white" : "text-gray-400 group-hover:text-white",
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors"
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}