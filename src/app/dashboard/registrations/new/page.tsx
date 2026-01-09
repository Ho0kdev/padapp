import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationForm } from "@/components/registrations/registration-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

export default async function NewRegistrationPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    console.error("No session or user ID found")
    redirect("/login")
  }

  console.log("Session user ID:", session.user.id)
  console.log("Session user email:", session.user.email)

  // Obtener información del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      player: {
        select: {
          id: true
        }
      }
    }
  })

  console.log("User found:", user ? `Yes (${user.email})` : "No")
  console.log("Player ID:", user?.player?.id || "No player profile")

  if (!user) {
    console.error(`❌ User not found in database for session ID: ${session.user.id}`)
    console.error("This might indicate a session/database mismatch. Try logging out and logging back in.")
    redirect("/dashboard")
  }

  // Solo ADMIN y PLAYER pueden crear inscripciones
  if (user.role !== "ADMIN" && user.role !== "PLAYER") {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes crear inscripciones"
          message="Solo los administradores y jugadores pueden crear inscripciones en torneos."
        />
      </DashboardLayout>
    )
  }

  // Los admins pueden inscribir a cualquier jugador
  // Los jugadores solo pueden inscribirse a sí mismos
  const isAdmin = user.role === "ADMIN"
  const currentPlayerId = user.player?.id || null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nueva Inscripción</h1>
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