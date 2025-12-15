// src/app/auth/login/page.tsx
import Image from "next/image"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-center mb-6">
            <div className="transition-transform duration-500 ease-out hover:scale-110 hover:rotate-12">
              <Image
                src="/images/logo.svg"
                alt="PDLShot"
                width={140}
                height={140}
                priority
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Sistema de Gestión de Torneos de Pádel</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}