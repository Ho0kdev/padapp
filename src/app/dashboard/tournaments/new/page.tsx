import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentForm } from "@/components/tournaments/tournament-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

export default async function NewTournamentPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar que sea admin u organizador
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (user?.role !== "ADMIN" && user?.role !== "ORGANIZER") {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes crear torneos"
          message="Solo los administradores y organizadores pueden crear nuevos torneos."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Crear Torneo</h1>
          <p className="text-muted-foreground">
            Configure un nuevo torneo con todas sus características
          </p>
        </div>

        <TournamentForm />
      </div>
    </DashboardLayout>
  )
}