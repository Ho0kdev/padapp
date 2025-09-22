import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminTournamentsDashboard } from "@/components/admin/tournaments-dashboard"

async function getAdminStats(userId: string) {
  try {
    // Obtener estadísticas directamente desde la base de datos
    // (más eficiente que hacer fetch interno)

    // Estadísticas por estado
    const statusStats = await prisma.tournament.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    // Estadísticas por tipo
    const typeStats = await prisma.tournament.groupBy({
      by: ['type'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    // Estadísticas por visibilidad
    const visibilityStats = await prisma.tournament.groupBy({
      by: ['visibility'],
      _count: { id: true }
    })

    // Estadísticas generales
    const totalTournaments = await prisma.tournament.count()
    const activeTournaments = await prisma.tournament.count({
      where: { status: { in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"] } }
    })
    const completedTournaments = await prisma.tournament.count({
      where: { status: "COMPLETED" }
    })
    const cancelledTournaments = await prisma.tournament.count({
      where: { status: "CANCELLED" }
    })

    // Promedio de equipos por torneo
    const tournamentsWithTeams = await prisma.tournament.findMany({
      select: { _count: { select: { teams: true } } }
    })
    const avgTeamsPerTournament = tournamentsWithTeams.length > 0
      ? tournamentsWithTeams.reduce((acc, t) => acc + t._count.teams, 0) / tournamentsWithTeams.length
      : 0

    // Top organizadores
    const topOrganizers = await prisma.tournament.groupBy({
      by: ['organizerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })

    const organizersWithDetails = await Promise.all(
      topOrganizers.map(async (org) => {
        const user = await prisma.user.findUnique({
          where: { id: org.organizerId },
          select: { name: true, email: true }
        })
        return { ...org, organizer: user }
      })
    )

    // Torneos que necesitan actualización
    const now = new Date()
    const tournamentsNeedingUpdate = await prisma.tournament.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", registrationStart: { lte: now }, registrationEnd: { gte: now } },
          { status: "REGISTRATION_OPEN", registrationEnd: { lt: now } },
          { status: "REGISTRATION_CLOSED", tournamentStart: { lte: now } }
        ]
      },
      select: {
        id: true, name: true, status: true,
        registrationStart: true, registrationEnd: true, tournamentStart: true,
        _count: { select: { teams: true } }
      }
    })

    return {
      overview: {
        total: totalTournaments,
        active: activeTournaments,
        completed: completedTournaments,
        cancelled: cancelledTournaments,
        avgTeamsPerTournament: Math.round(avgTeamsPerTournament * 100) / 100
      },
      statusStats: statusStats.map(stat => ({ status: stat.status, count: stat._count.id })),
      typeStats: typeStats.map(stat => ({ type: stat.type, count: stat._count.id })),
      visibilityStats: visibilityStats.map(stat => ({ visibility: stat.visibility, count: stat._count.id })),
      monthlyStats: {}, // Simplificado por ahora
      topOrganizers: organizersWithDetails,
      tournamentsNeedingUpdate: tournamentsNeedingUpdate.map(tournament => {
        let suggestedStatus = tournament.status
        let reason = ""

        if (tournament.status === "PUBLISHED" && tournament.registrationStart <= now && tournament.registrationEnd >= now) {
          suggestedStatus = "REGISTRATION_OPEN"
          reason = "Fecha de inicio de inscripciones alcanzada"
        } else if (tournament.status === "REGISTRATION_OPEN" && tournament.registrationEnd < now) {
          suggestedStatus = "REGISTRATION_CLOSED"
          reason = "Fecha de fin de inscripciones alcanzada"
        } else if (tournament.status === "REGISTRATION_CLOSED" && tournament.tournamentStart <= now && tournament._count.teams > 0) {
          suggestedStatus = "IN_PROGRESS"
          reason = "Fecha de inicio del torneo alcanzada"
        }

        return { ...tournament, suggestedStatus, reason }
      })
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return null
  }
}

export default async function AdminTournamentsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  // Verificar que sea admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (user?.role !== "ADMIN") {
    notFound()
  }

  const stats = await getAdminStats(session.user.id)

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administrador</h1>
            <p className="text-muted-foreground">
              Error al cargar las estadísticas
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administrador</h1>
          <p className="text-muted-foreground">
            Estadísticas y métricas de todos los torneos
          </p>
        </div>

        <AdminTournamentsDashboard stats={stats} />
      </div>
    </DashboardLayout>
  )
}