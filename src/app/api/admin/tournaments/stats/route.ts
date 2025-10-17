import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/tournaments/stats - Estadísticas de torneos para admins
export async function GET(request: NextRequest) {
  try {
    // Solo admins pueden ver estadísticas de torneos
    await authorize(Action.READ, Resource.DASHBOARD, undefined, request)

    // Obtener estadísticas por estado
    const statusStats = await prisma.tournament.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Obtener estadísticas por tipo
    const typeStats = await prisma.tournament.groupBy({
      by: ['type'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Obtener estadísticas por visibilidad
    const visibilityStats = await prisma.tournament.groupBy({
      by: ['visibility'],
      _count: {
        id: true
      }
    })

    // Obtener estadísticas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyStats = await prisma.tournament.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        createdAt: true,
        status: true
      }
    })

    // Procesar estadísticas mensuales
    const monthlyStatsProcessed = monthlyStats.reduce((acc: Record<string, Record<string, number>>, tournament) => {
      const month = tournament.createdAt.toISOString().slice(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = {}
      }
      if (!acc[month][tournament.status]) {
        acc[month][tournament.status] = 0
      }
      acc[month][tournament.status]++
      return acc
    }, {})

    // Obtener torneos que necesitan atención (actualizaciones automáticas)
    const now = new Date()
    const tournamentsNeedingUpdate = await prisma.tournament.findMany({
      where: {
        OR: [
          // PUBLISHED que debería ser REGISTRATION_OPEN
          {
            status: "PUBLISHED",
            registrationStart: { lte: now },
            registrationEnd: { gte: now }
          },
          // REGISTRATION_OPEN que debería ser REGISTRATION_CLOSED
          {
            status: "REGISTRATION_OPEN",
            registrationEnd: { lt: now }
          },
          // REGISTRATION_CLOSED que debería ser IN_PROGRESS
          {
            status: "REGISTRATION_CLOSED",
            tournamentStart: { lte: now }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        status: true,
        registrationStart: true,
        registrationEnd: true,
        tournamentStart: true,
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    // Obtener estadísticas generales
    const totalTournaments = await prisma.tournament.count()
    const activeTournaments = await prisma.tournament.count({
      where: {
        status: {
          in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
        }
      }
    })

    const completedTournaments = await prisma.tournament.count({
      where: { status: "COMPLETED" }
    })

    const cancelledTournaments = await prisma.tournament.count({
      where: { status: "CANCELLED" }
    })

    // Obtener top organizadores
    const topOrganizers = await prisma.tournament.groupBy({
      by: ['organizerId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    const organizersWithDetails = await Promise.all(
      topOrganizers.map(async (org) => {
        const user = await prisma.user.findUnique({
          where: { id: org.organizerId },
          select: { name: true, email: true }
        })
        return {
          ...org,
          organizer: user
        }
      })
    )

    // Estadísticas de equipos por torneo promedio
    const tournamentsWithTeams = await prisma.tournament.findMany({
      select: {
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    const avgTeamsPerTournament = tournamentsWithTeams.length > 0
      ? tournamentsWithTeams.reduce((acc, t) => acc + t._count.teams, 0) / tournamentsWithTeams.length
      : 0

    return NextResponse.json({
      overview: {
        total: totalTournaments,
        active: activeTournaments,
        completed: completedTournaments,
        cancelled: cancelledTournaments,
        avgTeamsPerTournament: Math.round(avgTeamsPerTournament * 100) / 100
      },
      statusStats: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.id
      })),
      typeStats: typeStats.map(stat => ({
        type: stat.type,
        count: stat._count.id
      })),
      visibilityStats: visibilityStats.map(stat => ({
        visibility: stat.visibility,
        count: stat._count.id
      })),
      monthlyStats: monthlyStatsProcessed,
      topOrganizers: organizersWithDetails,
      tournamentsNeedingUpdate: tournamentsNeedingUpdate.map(tournament => {
        let suggestedStatus = tournament.status
        let reason = ""

        if (tournament.status === "PUBLISHED" &&
            tournament.registrationStart && tournament.registrationStart <= now &&
            tournament.registrationEnd && tournament.registrationEnd >= now) {
          suggestedStatus = "REGISTRATION_OPEN"
          reason = "Fecha de inicio de inscripciones alcanzada"
        } else if (tournament.status === "REGISTRATION_OPEN" &&
                   tournament.registrationEnd && tournament.registrationEnd < now) {
          suggestedStatus = "REGISTRATION_CLOSED"
          reason = "Fecha de fin de inscripciones alcanzada"
        } else if (tournament.status === "REGISTRATION_CLOSED" &&
                   tournament.tournamentStart <= now &&
                   tournament._count.teams > 0) {
          suggestedStatus = "IN_PROGRESS"
          reason = "Fecha de inicio del torneo alcanzada"
        }

        return {
          ...tournament,
          suggestedStatus,
          reason
        }
      })
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}