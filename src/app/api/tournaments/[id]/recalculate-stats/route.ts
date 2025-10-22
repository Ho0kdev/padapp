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

    // 1. Borrar todas las estadísticas existentes del torneo
    await prisma.tournamentStats.deleteMany({
      where: { tournamentId }
    })
    console.log(`✅ Estadísticas anteriores eliminadas`)

    // 2. Obtener todos los partidos completados del torneo
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

    // 3. Procesar cada partido y actualizar estadísticas
    let playersUpdated = 0

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

      // Actualizar estadísticas para jugadores del equipo 1
      for (const playerId of team1Players) {
        await prisma.tournamentStats.upsert({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId
            }
          },
          create: {
            tournamentId,
            playerId,
            matchesPlayed: 1,
            matchesWon: team1Won ? 1 : 0,
            setsWon: team1SetsWon,
            setsLost: team2SetsWon,
            gamesWon: team1GamesWon,
            gamesLost: team2GamesWon
          },
          update: {
            matchesPlayed: { increment: 1 },
            matchesWon: { increment: team1Won ? 1 : 0 },
            setsWon: { increment: team1SetsWon },
            setsLost: { increment: team2SetsWon },
            gamesWon: { increment: team1GamesWon },
            gamesLost: { increment: team2GamesWon }
          }
        })
        playersUpdated++
      }

      // Actualizar estadísticas para jugadores del equipo 2
      for (const playerId of team2Players) {
        await prisma.tournamentStats.upsert({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId
            }
          },
          create: {
            tournamentId,
            playerId,
            matchesPlayed: 1,
            matchesWon: !team1Won ? 1 : 0,
            setsWon: team2SetsWon,
            setsLost: team1SetsWon,
            gamesWon: team2GamesWon,
            gamesLost: team1GamesWon
          },
          update: {
            matchesPlayed: { increment: 1 },
            matchesWon: { increment: !team1Won ? 1 : 0 },
            setsWon: { increment: team2SetsWon },
            setsLost: { increment: team1SetsWon },
            gamesWon: { increment: team2GamesWon },
            gamesLost: { increment: team1GamesWon }
          }
        })
        playersUpdated++
      }
    }

    console.log(`✅ Estadísticas recalculadas: ${playersUpdated} actualizaciones de jugadores`)

    return NextResponse.json({
      success: true,
      message: "Estadísticas recalculadas exitosamente",
      data: {
        tournamentId,
        tournamentName: tournament.name,
        matchesProcessed: completedMatches.length,
        playerStatsUpdated: playersUpdated
      }
    })

  } catch (error) {
    console.error("Error recalculando estadísticas:", error)
    return handleAuthError(error)
  }
}
