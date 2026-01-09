import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TeamFormationForm } from "@/components/teams/team-formation-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

export default async function NewTeamPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar que sea admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (user?.role !== "ADMIN") {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes crear equipos"
          message="Solo los administradores pueden crear equipos manualmente en el sistema."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Formar Equipo</h1>
          <p className="text-muted-foreground">
            Vincula dos inscripciones confirmadas para crear un equipo en un torneo convencional.
          </p>
        </div>

        <TeamFormationForm />
      </div>
    </DashboardLayout>
  )
}
