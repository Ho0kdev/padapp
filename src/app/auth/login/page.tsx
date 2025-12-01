// src/app/auth/login/page.tsx
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">PadApp</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sistema de Gestión de Torneos de Pádel</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}