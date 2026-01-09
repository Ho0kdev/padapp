import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubForm } from "@/components/clubs/club-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

export default async function NewClubPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth/login")
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
          title="No puedes crear clubes"
          message="Solo los administradores pueden crear nuevos clubes en la plataforma."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nuevo Club</h1>
          <p className="text-muted-foreground">
            Registra un nuevo club de pádel en la plataforma
          </p>
        </div>

        <ClubForm />
      </div>
    </DashboardLayout>
  )
}