import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from "@/components/providers/session-provider"

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
          {children}
        </Providers>
      </body>
    </html>
  )
}