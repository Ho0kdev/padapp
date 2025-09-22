// src/components/providers/session-provider.tsx
"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="top-right" />
    </SessionProvider>
  )
}