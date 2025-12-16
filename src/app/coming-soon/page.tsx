// src/app/coming-soon/page.tsx - Página de Próximamente
import Image from "next/image"

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-800 p-4">
      <div className="text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/logo-white.svg"
            alt="PadelShot Logo"
            width={300}
            height={100}
            className="w-64 sm:w-80 md:w-96 h-auto"
            priority
          />
        </div>

        {/* Mensaje */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
            Próximamente
          </h1>
          <p className="text-lg sm:text-xl text-cyan-100 max-w-2xl mx-auto">
            Estamos preparando algo increíble para gestionar tus torneos de pádel
          </p>
        </div>

        {/* Indicador de carga animado */}
        <div className="flex justify-center gap-2 pt-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}
