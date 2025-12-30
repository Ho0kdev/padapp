"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { navigation, NavigationItem, UserRole } from "@/lib/navigation"
import { useEffect, useRef } from "react"

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth(false) // ← NO requiere autenticación
  const navRef = useRef<HTMLDivElement>(null)

  // Fix iOS Safari address bar hiding issue
  useEffect(() => {
    const updatePosition = () => {
      if (navRef.current && typeof window !== 'undefined') {
        // Calculate position using window.innerHeight
        // This automatically accounts for browser chrome changes
        const windowHeight = window.innerHeight
        const navHeight = navRef.current.offsetHeight || 64

        navRef.current.style.top = `${windowHeight - navHeight}px`
      }
    }

    // Initial position
    updatePosition()

    // Update on resize and scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, { passive: true })

    // Cleanup
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [])

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

  // Filtrar opciones que tienen quickAccess y que el usuario puede ver
  const quickAccessItems = navigation
    .filter(item => item.quickAccess && hasAccess(item))
    .map(item => ({
      href: item.href,
      label: item.name === "Dashboard" ? "Inicio" : item.name, // Cambiar "Dashboard" por "Inicio"
      icon: item.icon
    }))

  // Agregar el botón "Menú" al final
  const links = [
    ...quickAccessItems,
    {
      href: "/dashboard/menu",
      label: "Menú",
      icon: Menu,
    },
  ]

  if (pathname?.startsWith("/auth") || pathname === "/") {
    return null
  }

  return (
    <div
      ref={navRef}
      className="fixed left-0 z-50 w-full border-t bg-background/80 backdrop-blur-lg lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transition: 'top 0.2s ease-out',
      }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
