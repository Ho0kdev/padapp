import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TeamEditForm } from "@/components/teams/team-edit-form"

interface EditTeamPageProps {
  params: Promise<{ id: string }>
}

async function getTeam(id: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"
  if (!isAdminOrClubAdmin) {
    return null
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
        }
      },
      registration1: {
        select: {
          player: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      },
      registration2: {
        select: {
          player: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  })

  return team
}

export default async function EditTeamPage({ params }: EditTeamPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const { id } = await params
  const team = await getTeam(id, session.user.id)

  if (!team) {
    notFound()
  }

  const initialData = {
    name: team.name || undefined,
    seed: team.seed || undefined,
    notes: team.notes || undefined,
    status: team.status,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Equipo</h1>
          <p className="text-muted-foreground">
            {team.tournament.name} - {team.category.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {team.tournament.type === 'AMERICANO_SOCIAL'
              ? `${team.registration1.player.lastName}, ${team.registration1.player.firstName} / ${team.registration2.player.lastName}, ${team.registration2.player.firstName}`
              : `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
            }
          </p>
        </div>

        <TeamEditForm
          initialData={initialData}
          teamId={team.id}
          tournamentStatus={team.tournament.status}
        />
      </div>
    </DashboardLayout>
  )
}
