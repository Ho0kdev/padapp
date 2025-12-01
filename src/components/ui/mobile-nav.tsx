"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, Users, Calendar, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const links = [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: Home,
    },
    {
      href: "/dashboard/tournaments",
      label: "Torneos",
      icon: Trophy,
    },
    {
      href: "/dashboard/matches",
      label: "Partidos",
      icon: Calendar,
    },
    {
      href: "/dashboard/players",
      label: "Jugadores",
      icon: Users,
    },
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
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/80 backdrop-blur-lg md:hidden">
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
