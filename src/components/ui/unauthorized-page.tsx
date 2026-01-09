import { ShieldAlert, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface UnauthorizedPageProps {
  title?: string
  message?: string
  showBackButton?: boolean
}

export function UnauthorizedPage({
  title = "Acceso No Autorizado",
  message = "No tienes permisos para acceder a esta página o realizar esta acción.",
  showBackButton = true
}: UnauthorizedPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-lg">{message}</p>
        </div>

        {/* Additional Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
          )}
        </div>

        {/* Error Code */}
        <div className="pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            Código de error: <span className="font-mono">403 - Forbidden</span>
          </p>
        </div>
      </div>
    </div>
  )
}
