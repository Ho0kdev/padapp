import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationForm } from "@/components/registrations/registration-form"

export default async function NewRegistrationPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Obtener información del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      player: {
        select: {
          id: true
        }
      }
    }
  })

  if (!user) {
    redirect("/dashboard")
  }

  // Los admins pueden inscribir a cualquier jugador
  // Los jugadores solo pueden inscribirse a sí mismos
  const isAdmin = user.role === "ADMIN" || user.role === "CLUB_ADMIN"
  const currentPlayerId = user.player?.id || null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Inscripción</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Inscribir un jugador en un torneo. Para torneos convencionales, después podrás formar equipos."
              : "Inscribite en un torneo. Para torneos convencionales, después podrás formar equipo con otro jugador."}
          </p>
        </div>

        <RegistrationForm isAdmin={isAdmin} currentPlayerId={currentPlayerId} />
      </div>
    </DashboardLayout>
  )
}