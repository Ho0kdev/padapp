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
    courtId: string
  }>
}

async function getCourt(clubId: string, courtId: string) {
  try {
    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId,
        deleted: false
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    return court
  } catch (error) {
    console.error("Error fetching court:", error)
    return null
  }
}

export default async function EditCourtPage({ params }: PageProps) {
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

  const { id: clubId, courtId } = await params
  const court = await getCourt(clubId, courtId)

  if (!court || !court.club) {
    redirect("/dashboard/clubs")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Cancha</h1>
          <p className="text-muted-foreground">
            Editar {court.name} de {court.club.name}
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
            initialData={{
              name: court.name,
              surface: court.surface,
              hasLighting: court.hasLighting,
              hasRoof: court.hasRoof,
              isOutdoor: court.isOutdoor,
              hasPanoramicGlass: court.hasPanoramicGlass,
              hasConcreteWall: court.hasConcreteWall,
              hasNet4m: court.hasNet4m,
              status: court.status,
              hourlyRate: court.hourlyRate ?? undefined,
              notes: court.notes ?? undefined,
              clubId: court.clubId
            }}
            courtId={court.id}
            clubId={court.club.id}
            clubName={court.club.name}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}