// src/components/layout/dashboard-layout.tsx
"use client"

import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-background max-w-full">
      {/* Sidebar Desktop - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col min-w-0 max-w-full">
        <Header />
        <main className="flex-1 p-3 sm:p-6 pb-20 lg:pb-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}