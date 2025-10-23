import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentForm } from "@/components/tournaments/tournament-form"

interface EditTournamentPageProps {
  params: Promise<{ id: string }>
}

async function getTournament(id: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: true
        }
      },
      clubs: {
        include: {
          club: true
        }
      }
    }
  })

  if (!tournament) {
    return null
  }

  // Verificar permisos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const isOwner = tournament.organizerId === userId
  const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

  if (!isOwner && !isAdminOrClubAdmin) {
    return null
  }

  return tournament
}

export default async function EditTournamentPage({ params }: EditTournamentPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const tournament = await getTournament(id, session.user.id)

  if (!tournament) {
    notFound()
  }

  // Transformar datos para el formulario
  const initialData = {
    name: tournament.name,
    description: tournament.description || undefined,
    type: tournament.type,
    visibility: tournament.visibility,
    registrationStart: tournament.registrationStart ? new Date(tournament.registrationStart) : new Date(),
    registrationEnd: tournament.registrationEnd ? new Date(tournament.registrationEnd) : new Date(),
    tournamentStart: new Date(tournament.tournamentStart),
    tournamentEnd: tournament.tournamentEnd ? new Date(tournament.tournamentEnd) : undefined,
    maxParticipants: tournament.maxParticipants || undefined,
    minParticipants: tournament.minParticipants,
    registrationFee: tournament.registrationFee,
    prizePool: tournament.prizePool,
    setsToWin: tournament.setsToWin,
    gamesToWinSet: tournament.gamesToWinSet,
    tiebreakAt: tournament.tiebreakAt,
    goldenPoint: tournament.goldenPoint,
    americanoRounds: tournament.americanoRounds,
    mainClubId: tournament.mainClubId || undefined,
    rules: tournament.rules || undefined,
    prizesDescription: tournament.prizesDescription || undefined,
    logoUrl: tournament.logoUrl || undefined,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Torneo</h1>
          <p className="text-muted-foreground">
            Modifica la configuración del torneo "{tournament.name}"
          </p>
        </div>

        <TournamentForm
          initialData={initialData}
          tournamentId={tournament.id}
          initialSelectedCategories={tournament.categories.map(c => c.categoryId)}
          initialSelectedClubs={tournament.clubs.map(c => c.clubId)}
        />
      </div>
    </DashboardLayout>
  )
}