import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-brand-gradient">
      {/* Contenido principal */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12 text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative w-40 h-40 md:w-64 md:h-64">
                <Image
                  src="/images/logo.svg"
                  alt="PadelShot Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Ícono de mantenimiento */}
            {/* <div className="flex justify-center">
              <div className="bg-yellow-100 rounded-full p-3">
                <Wrench className="h-6 w-6 md:h-12 md:w-12 text-yellow-600 animate-pulse" />
              </div>
            </div> */}

            {/* Título y mensaje */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Estamos en Mantenimiento
              </h1>
              <p className="text-lg md:text-xl text-slate-600">
                Estamos trabajando para mejorar tu experiencia.
              </p>
              <p className="text-base text-slate-500">
                Volveremos pronto con nuevas mejoras y funcionalidades.
              </p>
            </div>

            {/* Información adicional */}
            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                ¿Necesitas ayuda urgente?{' '}
                <a
                  href="mailto:soporte@padelshot.app"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Contáctanos
                </a>
              </p>
            </div>

            {/* Footer con acceso admin */}
            <div className="pt-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-600">
                  Acceso para administradores →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="relative p-6 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} PadelShot. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
