import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubForm } from "@/components/clubs/club-form"

interface EditClubPageProps {
  params: Promise<{ id: string }>
}

async function getClub(id: string, userId: string) {
  try {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        courts: true,
        tournaments: true,
        _count: {
          select: {
            courts: true,
            tournaments: true,
            tournamentClubs: true
          }
        }
      }
    })

    if (!club) {
      return null
    }

    // Verificar permisos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return null
    }

    return club
  } catch (error) {
    console.error('Error fetching club:', error)
    return null
  }
}

export default async function EditClubPage({ params }: EditClubPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const club = await getClub(id, session.user.id)

  if (!club) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Club</h1>
          <p className="text-muted-foreground">
            Modifica la información del club &quot;{club.name}&quot;
          </p>
        </div>

        <ClubForm initialData={club} clubId={club.id} />
      </div>
    </DashboardLayout>
  )
}