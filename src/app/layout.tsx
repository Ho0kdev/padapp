import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from "@/components/providers/session-provider"
import { MobileNav } from "@/components/ui/mobile-nav"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PDLShot - Sistema de Torneos de Pádel',
  description: 'Gestión completa de torneos de pádel',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PDLShot',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#191f3a' },
  ],
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
          <div className="min-h-dvh pb-16 md:pb-0">
            {children}
          </div>
          <MobileNav />
        </Providers>
      </body>
    </html>
  )
}