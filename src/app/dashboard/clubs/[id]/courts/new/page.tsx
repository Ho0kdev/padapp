import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CourtForm } from "@/components/courts/court-form"
import { Card, CardContent } from "@/components/ui/card"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getClub(id: string) {
  try {
    const club = await prisma.club.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true
      }
    })

    return club
  } catch (error) {
    console.error("Error fetching club:", error)
    return null
  }
}

export default async function NewCourtPage({ params }: PageProps) {
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
    redirect("/dashboard")
  }

  const { id: clubId } = await params
  const club = await getClub(clubId)

  if (!club) {
    redirect("/dashboard/clubs")
  }

  if (club.status !== "ACTIVE") {
    redirect(`/dashboard/clubs/${clubId}`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Cancha</h1>
          <p className="text-muted-foreground">
            Crear una nueva cancha para {club.name}
          </p>
        </div>

        <Suspense fallback={
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Cargando formulario...</span>
              </div>
            </CardContent>
          </Card>
        }>
          <CourtForm
            clubId={club.id}
            clubName={club.name}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}