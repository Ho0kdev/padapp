import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubForm } from "@/components/clubs/club-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

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
      return { club: null, canEdit: false, reason: 'not_found' }
    }

    // Verificar permisos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canEdit = user?.role === "ADMIN"

    return {
      club: canEdit ? club : null,
      canEdit,
      reason: canEdit ? null : 'insufficient_permissions'
    }
  } catch (error) {
    console.error('Error fetching club:', error)
    return { club: null, canEdit: false, reason: 'error' }
  }
}

export default async function EditClubPage({ params }: EditClubPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const { club, canEdit, reason } = await getClub(id, session.user.id)

  if (!club && reason === 'not_found') {
    notFound()
  }

  if (!canEdit) {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes editar este club"
          message="Solo los administradores pueden modificar la información de clubes."
        />
      </DashboardLayout>
    )
  }

  // TypeScript guard - nunca debería llegar aquí si canEdit es true
  if (!club) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Club</h1>
          <p className="text-muted-foreground">
            Modifica la información del club &quot;{club.name}&quot;
          </p>
        </div>

        <ClubForm initialData={club as any} clubId={club.id} />
      </div>
    </DashboardLayout>
  )
}