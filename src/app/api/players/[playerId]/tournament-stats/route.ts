import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { PointsCalculationService } from "@/lib/services/points-calculation-service"
import { ForbiddenError } from "@/lib/rbac/errors"

interface RouteContext {
  params: Promise<{ playerId: string }>
}

/**
 * GET /api/players/[playerId]/tournament-stats
 * Obtiene las estadísticas de torneos del jugador con desglose de puntos
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await requireAuth()

    const { playerId } = await params

    // Verificar ownership: solo el propio jugador o ADMIN/CLUB_ADMIN pueden ver las stats
    const isOwnStats = session.user.player?.id === playerId
    const isAdminOrClubAdmin = session.user.role === 'ADMIN' || session.user.role === 'CLUB_ADMIN'

    if (!isOwnStats && !isAdminOrClubAdmin) {
      throw new ForbiddenError('No tienes permiso para ver las estadísticas de este jugador')
    }

    // Obtener estadísticas de torneos del jugador
    const stats = await prisma.tournamentStats.findMany({
      where: { playerId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            type: true,
            rankingPoints: true,
            tournamentStart: true,
            tournamentEnd: true,
            teams: {
              select: {
                categoryId: true,
                registration1: {
                  select: {
                    playerId: true
                  }
                },
                registration2: {
                  select: {
                    playerId: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        tournament: {
          tournamentStart: 'desc'
        }
      }
    })

    // Calcular breakdown para cada torneo
    const statsWithBreakdown = stats.map(stat => {
      // Encontrar el equipo del jugador para obtener la categoría
      const playerTeam = stat.tournament.teams.find(team =>
        team.registration1.playerId === playerId ||
        team.registration2.playerId === playerId
      )

      const participantCount = stat.tournament.teams.filter(team =>
        team.categoryId === playerTeam?.categoryId
      ).length * 2 // Multiplicar por 2 ya que son equipos de 2 jugadores

      // Calcular el breakdown de puntos
      const breakdown = PointsCalculationService.calculatePlayerTournamentPointsWithBreakdown({
        tournamentId: stat.tournamentId,
        playerId: stat.playerId,
        categoryId: playerTeam?.categoryId || '',
        finalPosition: stat.finalPosition,
        matchesPlayed: stat.matchesPlayed,
        matchesWon: stat.matchesWon,
        setsWon: stat.setsWon,
        setsLost: stat.setsLost,
        participantCount,
        tournamentType: stat.tournament.type,
        tournamentRankingPoints: stat.tournament.rankingPoints
      })

      return {
        ...stat,
        pointsBreakdown: breakdown,
        // Quitar la información sensible de teams
        tournament: {
          ...stat.tournament,
          teams: undefined
        }
      }
    })

    return NextResponse.json({
      playerId,
      stats: statsWithBreakdown
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}
