// src/components/layout/header.tsx
"use client"

import Image from "next/image"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, LogOut, Settings, User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function Header() {
  const { user } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/login" })
  }

  const handleProfileClick = () => {
    if (user?.id) {
      router.push(`/dashboard/users/${user.id}`)
    }
  }

  const handleSettingsClick = () => {
    if (user?.id) {
      router.push(`/dashboard/users/${user.id}/edit`)
    }
  }

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U"

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-3 sm:px-6">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Logo en mobile, texto completo en desktop */}
        <div className="sm:hidden transition-transform duration-300 ease-in-out hover:scale-110 hover:rotate-6">
          <Image
            src={theme === 'dark' ? '/images/logo-white.svg' : '/images/logo.svg'}
            alt="PDLShot"
            width={64}
            height={64}
            priority
          />
        </div>
        <h1 className="hidden sm:block text-base sm:text-lg lg:text-xl font-semibold text-foreground">
          Sistema de Torneos de Pádel
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notificaciones */}
        <Button variant="ghost" size="sm" className="relative hidden sm:flex">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs"></span>
        </Button>

        {/* Menú de usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 max-w-[calc(100vw-2rem)]" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}