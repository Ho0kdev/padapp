import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Revierte las estadísticas del pool cuando se revierte un resultado
 */
async function revertAmericanoPoolStats(matchId: string) {
  const match = await prisma.americanoPoolMatch.findUnique({
    where: { id: matchId },
    include: {
      player1: true,
      player2: true,
      player3: true,
      player4: true
    }
  })

  if (!match || !match.winnerTeam || match.teamAScore === null || match.teamBScore === null) {
    return
  }

  const team1Won = match.winnerTeam === "A"
  const gamesWon = team1Won ? match.teamAScore : match.teamBScore
  const gamesLost = team1Won ? match.teamBScore : match.teamAScore

  // Jugadores del equipo ganador (A o B)
  const winnerPlayers = team1Won
    ? [match.player1.id, match.player2.id]
    : [match.player3.id, match.player4.id]

  // Jugadores del equipo perdedor
  const loserPlayers = team1Won
    ? [match.player3.id, match.player4.id]
    : [match.player1.id, match.player2.id]

  // Revertir stats para jugadores ganadores
  for (const playerId of winnerPlayers) {
    const poolPlayer = await prisma.americanoPoolPlayer.findUnique({
      where: {
        poolId_playerId: {
          poolId: match.poolId,
          playerId
        }
      }
    })

    if (poolPlayer) {
      await prisma.americanoPoolPlayer.update({
        where: { id: poolPlayer.id },
        data: {
          gamesWon: Math.max(0, poolPlayer.gamesWon - gamesWon),
          gamesLost: Math.max(0, poolPlayer.gamesLost - gamesLost),
          matchesWon: Math.max(0, poolPlayer.matchesWon - 1),
          points: Math.max(0, poolPlayer.points - 3) // Restar 3 puntos por victoria
        }
      })
    }
  }

  // Revertir stats para jugadores perdedores
  for (const playerId of loserPlayers) {
    const poolPlayer = await prisma.americanoPoolPlayer.findUnique({
      where: {
        poolId_playerId: {
          poolId: match.poolId,
          playerId
        }
      }
    })

    if (poolPlayer) {
      await prisma.americanoPoolPlayer.update({
        where: { id: poolPlayer.id },
        data: {
          gamesWon: Math.max(0, poolPlayer.gamesWon - gamesLost),
          gamesLost: Math.max(0, poolPlayer.gamesLost - gamesWon),
          // No se restan matches won porque perdieron (ya era 0 adicional)
        }
      })
    }
  }

  console.log(`✅ Estadísticas del pool revertidas para 4 jugadores`)
}

/**
 * Revierte el ranking global cuando se revierte un resultado
 */
async function revertAmericanoGlobalRanking(matchId: string) {
  const match = await prisma.americanoPoolMatch.findUnique({
    where: { id: matchId }
  })

  if (!match || !match.winnerTeam || match.teamAScore === null || match.teamBScore === null) {
    return
  }

  const team1Won = match.winnerTeam === "A"
  const gamesWon = team1Won ? match.teamAScore : match.teamBScore
  const gamesLost = team1Won ? match.teamBScore : match.teamAScore

  // IDs de jugadores ganadores y perdedores
  const winnerPlayers = team1Won
    ? [match.player1Id, match.player2Id]
    : [match.player3Id, match.player4Id]

  const loserPlayers = team1Won
    ? [match.player3Id, match.player4Id]
    : [match.player1Id, match.player2Id]

  // Revertir ranking global para ganadores
  for (const playerId of winnerPlayers) {
    const ranking = await prisma.americanoGlobalRanking.findUnique({
      where: {
        tournamentId_categoryId_playerId: {
          tournamentId: match.tournamentId,
          categoryId: match.categoryId,
          playerId
        }
      }
    })

    if (ranking) {
      await prisma.americanoGlobalRanking.update({
        where: { id: ranking.id },
        data: {
          totalGamesWon: Math.max(0, ranking.totalGamesWon - gamesWon),
          totalGamesLost: Math.max(0, ranking.totalGamesLost - gamesLost),
          totalMatchesWon: Math.max(0, ranking.totalMatchesWon - 1),
          totalPoints: Math.max(0, ranking.totalPoints - 3)
        }
      })
    }
  }

  // Revertir ranking global para perdedores
  for (const playerId of loserPlayers) {
    const ranking = await prisma.americanoGlobalRanking.findUnique({
      where: {
        tournamentId_categoryId_playerId: {
          tournamentId: match.tournamentId,
          categoryId: match.categoryId,
          playerId
        }
      }
    })

    if (ranking) {
      await prisma.americanoGlobalRanking.update({
        where: { id: ranking.id },
        data: {
          totalGamesWon: Math.max(0, ranking.totalGamesWon - gamesLost),
          totalGamesLost: Math.max(0, ranking.totalGamesLost - gamesWon)
        }
      })
    }
  }

  console.log(`✅ Ranking global revertido para 4 jugadores`)
}

/**
 * DELETE /api/americano-matches/[id]/result
 *
 * Revierte el resultado de un partido Americano Social.
 * Limpia el marcador, sets, y restaura el estado a SCHEDULED.
 * También revierte las estadísticas del pool y el ranking global.
 *
 * **Permisos requeridos:** ADMIN o CLUB_ADMIN
 *
 * **Validaciones:**
 * - El partido debe existir
 * - El partido debe tener resultado cargado (status COMPLETED o WALKOVER)
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Resultado revertido exitosamente",
 *   "data": { ...match }
 * }
 * ```
 *
 * **Errores posibles:**
 * - 404: Partido no encontrado
 * - 400: Partido sin resultado cargado
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN y CLUB_ADMIN pueden revertir resultados
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Obtener el partido con todas las relaciones necesarias
    const match = await prisma.americanoPoolMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true
          }
        },
        pool: {
          select: {
            id: true,
            name: true
          }
        },
        sets: true
      }
    })

    // Validación: Partido debe existir
    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    // Validación: Partido debe tener resultado cargado
    if (match.status !== "COMPLETED" && match.status !== "WALKOVER") {
      return NextResponse.json({
        error: "El partido no tiene resultado cargado para revertir"
      }, { status: 400 })
    }

    // Guardar datos del match antes de revertir (para logging)
    const oldMatchData = {
      winnerTeam: match.winnerTeam,
      status: match.status,
      teamAScore: match.teamAScore,
      teamBScore: match.teamBScore,
      sets: match.sets
    }

    // PASO 1: Revertir estadísticas del pool
    try {
      await revertAmericanoPoolStats(matchId)
      console.log(`✅ Estadísticas del pool revertidas`)
    } catch (statsError) {
      console.error(`⚠️ No se pudieron revertir las estadísticas del pool:`, statsError)
      // Continuar de todas formas con la reversión del resultado
    }

    // PASO 2: Revertir ranking global
    try {
      await revertAmericanoGlobalRanking(matchId)
      console.log(`✅ Ranking global revertido`)
    } catch (rankingError) {
      console.error(`⚠️ No se pudo revertir el ranking global:`, rankingError)
      // Continuar de todas formas con la reversión del resultado
    }

    // PASO 3: Eliminar sets
    await prisma.americanoPoolMatchSet.deleteMany({
      where: { matchId }
    })

    // PASO 4: Limpiar resultado del partido
    const updatedMatch = await prisma.americanoPoolMatch.update({
      where: { id: matchId },
      data: {
        winnerTeam: null,
        status: "SCHEDULED",
        teamAScore: null,
        teamBScore: null,
        completedAt: null
      }
    })

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: match.tournament.id,
        description: `Resultado de partido Americano revertido: ${match.pool.name} - Ronda ${match.roundNumber}`,
        metadata: {
          matchId,
          oldData: oldMatchData,
          tournamentName: match.tournament.name,
          poolName: match.pool.name,
          roundNumber: match.roundNumber
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Resultado revertido exitosamente",
      data: updatedMatch
    }, { status: 200 })

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
