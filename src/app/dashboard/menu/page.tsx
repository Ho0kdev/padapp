"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { navigation, NavigationItem, UserRole } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight, LogOut, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function MenuPage() {
    const { user } = useAuth()

    // Función para verificar si el usuario tiene acceso a una opción del menú
    const hasAccess = (item: NavigationItem): boolean => {
        if (!item.roles || item.roles.length === 0) {
            return true
        }
        if (!user?.role) {
            return false
        }
        return item.roles.includes(user.role as UserRole)
    }

    const navigationItems = navigation.filter(hasAccess)

    const userInitials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
        : user?.email?.[0]?.toUpperCase() || "U"

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border shadow-sm">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-xl font-bold">{user?.name}</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-primary font-medium mt-1 capitalize">{user?.role}</p>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="px-2 text-sm font-medium text-muted-foreground">Navegación</h3>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    {navigationItems.map((item, index) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between p-4 hover:bg-accent transition-colors",
                                index !== navigationItems.length - 1 && "border-b"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <item.icon className="h-5 w-5 text-primary" />
                                <span className="font-medium">{item.name}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </Link>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="px-2 text-sm font-medium text-muted-foreground">Cuenta</h3>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    <Link
                        href={`/dashboard/users/${user?.id}`}
                        className="flex items-center justify-between p-4 border-b hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-primary" />
                            <span className="font-medium">Perfil</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Link
                        href={`/dashboard/users/${user?.id}/edit`}
                        className="flex items-center justify-between p-4 border-b hover:bg-accent transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <Settings className="h-5 w-5 text-primary" />
                            <span className="font-medium">Configuración</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <div className="p-4">
                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                            onClick={() => signOut({ callbackUrl: "/auth/login" })}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar sesión
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
