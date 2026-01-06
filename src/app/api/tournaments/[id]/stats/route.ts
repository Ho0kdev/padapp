import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { PointsCalculationService } from "@/lib/services/points-calculation-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tournaments/[id]/stats
 * Obtiene las estadísticas y puntos de todos los jugadores del torneo con desglose detallado
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAuth()

    const { id: tournamentId } = await params

    // Verificar que el torneo existe y obtener información necesaria
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        rankingPoints: true,
        teams: {
          select: {
            categoryId: true
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Obtener estadísticas
    const stats = await prisma.tournamentStats.findMany({
      where: { tournamentId },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { categoryId: 'asc' },
        { pointsEarned: 'desc' },
        { finalPosition: 'asc' }
      ]
    })

    // Calcular breakdown para cada jugador
    const statsWithBreakdown = stats.map(stat => {
      const categoryId = stat.categoryId || ''

      const participantCount = tournament.teams.filter(team =>
        team.categoryId === categoryId
      ).length * 2 // Multiplicar por 2 ya que son equipos de 2 jugadores

      // Calcular el breakdown de puntos
      const breakdown = PointsCalculationService.calculatePlayerTournamentPointsWithBreakdown({
        tournamentId,
        playerId: stat.playerId,
        categoryId,
        finalPosition: stat.finalPosition,
        matchesPlayed: stat.matchesPlayed,
        matchesWon: stat.matchesWon,
        setsWon: stat.setsWon,
        setsLost: stat.setsLost,
        participantCount,
        tournamentType: tournament.type,
        tournamentRankingPoints: tournament.rankingPoints
      })

      return {
        ...stat,
        pointsBreakdown: breakdown
      }
    })

    return NextResponse.json({
      tournamentId,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      tournamentRankingPoints: tournament.rankingPoints,
      stats: statsWithBreakdown
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}
