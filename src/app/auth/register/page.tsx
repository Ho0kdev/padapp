// src/app/auth/register/page.tsx
import Image from "next/image"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
          <p className="text-sm text-gray-600">Sistema de Gestión de Torneos de Pádel</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}