import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from "@/components/providers/session-provider"
import { MobileNav } from "@/components/ui/mobile-nav"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PadApp - Sistema de Torneos de Pádel',
  description: 'Gestión completa de torneos de pádel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen pb-16 md:pb-0">
            {children}
          </div>
          <MobileNav />
        </Providers>
      </body>
    </html>
  )
}