import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/tournaments/[id]/recalculate-stats
 *
 * Recalcula las estadísticas de todos los jugadores del torneo basándose en los partidos completados.
 * Útil para corregir estadísticas después de cambios en el sistema.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Solo ADMIN puede recalcular estadísticas
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: tournamentId } = await params

    // Verificar que el torneo existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json({
        error: "Torneo no encontrado"
      }, { status: 404 })
    }

    console.log(`🔄 Recalculando estadísticas para torneo: ${tournament.name}`)

    // 1. Obtener todos los partidos completados del torneo
    const completedMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        status: {
          in: ['COMPLETED', 'WALKOVER']
        }
      },
      include: {
        sets: true,
        team1: {
          include: {
            registration1: { select: { playerId: true } },
            registration2: { select: { playerId: true } }
          }
        },
        team2: {
          include: {
            registration1: { select: { playerId: true } },
            registration2: { select: { playerId: true } }
          }
        }
      }
    })

    console.log(`📊 Procesando ${completedMatches.length} partidos completados`)

    // 2. Calcular todas las estadísticas en memoria primero
    const playerStatsMap = new Map<string, {
      tournamentId: string
      playerId: string
      matchesPlayed: number
      matchesWon: number
      setsWon: number
      setsLost: number
      gamesWon: number
      gamesLost: number
    }>()

    for (const match of completedMatches) {
      if (!match.team1 || !match.team2 || !match.winnerTeamId) {
        console.log(`⚠️ Partido ${match.id} sin equipos o ganador, omitiendo`)
        continue
      }

      // Calcular estadísticas del partido
      let team1GamesWon = 0
      let team2GamesWon = 0
      let team1SetsWon = 0
      let team2SetsWon = 0

      for (const set of match.sets) {
        team1GamesWon += set.team1Games
        team2GamesWon += set.team2Games
        if (set.team1Games > set.team2Games) {
          team1SetsWon++
        } else {
          team2SetsWon++
        }
      }

      // Obtener IDs de los 4 jugadores
      const team1Players = [
        match.team1.registration1.playerId,
        match.team1.registration2.playerId
      ]
      const team2Players = [
        match.team2.registration1.playerId,
        match.team2.registration2.playerId
      ]

      const team1Won = match.winnerTeamId === match.team1.id

      // Acumular estadísticas para jugadores del equipo 1
      for (const playerId of team1Players) {
        const key = `${tournamentId}-${playerId}`
        const existing = playerStatsMap.get(key) || {
          tournamentId,
          playerId,
          matchesPlayed: 0,
          matchesWon: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0
        }

        existing.matchesPlayed++
        if (team1Won) existing.matchesWon++
        existing.setsWon += team1SetsWon
        existing.setsLost += team2SetsWon
        existing.gamesWon += team1GamesWon
        existing.gamesLost += team2GamesWon

        playerStatsMap.set(key, existing)
      }

      // Acumular estadísticas para jugadores del equipo 2
      for (const playerId of team2Players) {
        const key = `${tournamentId}-${playerId}`
        const existing = playerStatsMap.get(key) || {
          tournamentId,
          playerId,
          matchesPlayed: 0,
          matchesWon: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0
        }

        existing.matchesPlayed++
        if (!team1Won) existing.matchesWon++
        existing.setsWon += team2SetsWon
        existing.setsLost += team1SetsWon
        existing.gamesWon += team2GamesWon
        existing.gamesLost += team1GamesWon

        playerStatsMap.set(key, existing)
      }
    }

    // 3. Usar transacción para borrar y recrear todas las estadísticas
    const result = await prisma.$transaction(async (tx) => {
      // Borrar todas las estadísticas existentes del torneo
      const deleted = await tx.tournamentStats.deleteMany({
        where: { tournamentId }
      })
      console.log(`✅ ${deleted.count} estadísticas anteriores eliminadas`)

      // Crear todas las nuevas estadísticas
      const statsToCreate = Array.from(playerStatsMap.values())

      if (statsToCreate.length > 0) {
        await tx.tournamentStats.createMany({
          data: statsToCreate
        })
      }

      console.log(`✅ ${statsToCreate.length} estadísticas creadas`)

      return {
        matchesProcessed: completedMatches.length,
        playerStatsUpdated: statsToCreate.length
      }
    })

    return NextResponse.json({
      success: true,
      message: "Estadísticas recalculadas exitosamente",
      data: {
        tournamentId,
        tournamentName: tournament.name,
        matchesProcessed: result.matchesProcessed,
        playerStatsUpdated: result.playerStatsUpdated
      }
    })

  } catch (error) {
    console.error("Error recalculando estadísticas:", error)
    return handleAuthError(error)
  }
}
