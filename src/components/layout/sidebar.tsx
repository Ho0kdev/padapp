// src/components/layout/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Trophy } from "lucide-react"
import { navigation, NavigationItem, UserRole } from "@/lib/navigation"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

interface SidebarProps {
  mobile?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Sidebar({ mobile = false, open = false, onOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Función para verificar si el usuario tiene acceso a una opción del menú
  const hasAccess = (item: NavigationItem): boolean => {
    // Si no se especifican roles, la opción es visible para todos
    if (!item.roles || item.roles.length === 0) {
      return true
    }

    // Si el usuario no está autenticado, no tiene acceso
    if (!user?.role) {
      return false
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    return item.roles.includes(user.role as UserRole)
  }

  // Filtrar opciones de navegación según rol del usuario
  const navigationItems = navigation.filter(hasAccess)

  // Contenido del sidebar (reutilizable para desktop y mobile)
  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2"
          onClick={onLinkClick}
        >
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
              onClick={onLinkClick}
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
    </>
  )

  // Mobile: Render como Sheet
  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 bg-gray-900 border-gray-800">
          <VisuallyHidden>
            <SheetTitle>Menú de navegación</SheetTitle>
          </VisuallyHidden>
          <div className="flex h-full flex-col">
            <SidebarContent onLinkClick={() => onOpenChange?.(false)} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Render normal
  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <SidebarContent />
    </div>
  )
}