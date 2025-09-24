import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sistema de puntos por posición en torneo
const POSITION_POINTS = {
  1: 1000,  // 1er lugar
  2: 700,   // 2do lugar
  3: 500,   // 3er lugar
  4: 400,   // 4to lugar
  5: 300,   // Cuartos de final
  6: 300,
  7: 300,
  8: 300,
  9: 200,   // Octavos de final
  10: 200,
  11: 200,
  12: 200,
  13: 200,
  14: 200,
  15: 200,
  16: 200,
  17: 100,  // Primera ronda
} as const

// Puntos por participación base
const PARTICIPATION_POINTS = 50

// Multiplicadores por tipo de torneo
const TOURNAMENT_TYPE_MULTIPLIER = {
  SINGLE_ELIMINATION: 1.2,
  DOUBLE_ELIMINATION: 1.3,
  ROUND_ROBIN: 1.1,
  SWISS: 1.1,
  GROUP_STAGE_ELIMINATION: 1.4,
  AMERICANO: 1.0
} as const

// Multiplicadores por número de participantes
function getParticipantMultiplier(participantCount: number): number {
  if (participantCount >= 32) return 1.5
  if (participantCount >= 16) return 1.3
  if (participantCount >= 8) return 1.1
  return 1.0
}

interface TournamentResult {
  tournamentId: string
  playerId: string
  categoryId: string
  finalPosition: number | null
  matchesPlayed: number
  matchesWon: number
  setsWon: number
  setsLost: number
  participantCount: number
  tournamentType: string
}

export class PointsCalculationService {
  /**
   * Calcular puntos para un jugador específico en un torneo
   */
  static calculatePlayerTournamentPoints(result: TournamentResult): number {
    let points = PARTICIPATION_POINTS

    // Puntos por posición final
    if (result.finalPosition && result.finalPosition <= 17) {
      const positionPoints = POSITION_POINTS[result.finalPosition as keyof typeof POSITION_POINTS] || 0
      points += positionPoints
    }

    // Bonus por victorias
    points += result.matchesWon * 25

    // Bonus por sets ganados
    points += result.setsWon * 5

    // Aplicar multiplicador por tipo de torneo
    const tournamentMultiplier = TOURNAMENT_TYPE_MULTIPLIER[result.tournamentType as keyof typeof TOURNAMENT_TYPE_MULTIPLIER] || 1.0
    points *= tournamentMultiplier

    // Aplicar multiplicador por número de participantes
    const participantMultiplier = getParticipantMultiplier(result.participantCount)
    points *= participantMultiplier

    return Math.round(points)
  }

  /**
   * Calcular y actualizar puntos para todos los jugadores de un torneo completado
   */
  static async calculateTournamentPoints(tournamentId: string): Promise<void> {
    try {
      console.log(`🏆 Calculating points for tournament: ${tournamentId}`)

      // Obtener información del torneo
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          stats: {
            include: {
              player: {
                include: {
                  user: true
                }
              }
            }
          },
          teams: {
            select: {
              categoryId: true,
              player1Id: true,
              player2Id: true
            }
          },
          categories: {
            include: {
              category: true
            }
          }
        }
      })

      if (!tournament) {
        throw new Error('Tournament not found')
      }

      if (tournament.status !== 'COMPLETED') {
        throw new Error('Tournament must be completed to calculate points')
      }

      // Calcular puntos para cada jugador
      for (const stat of tournament.stats) {
        // Contar participantes en la categoría del jugador
        const playerTeam = tournament.teams.find(team =>
          team.player1Id === stat.playerId || team.player2Id === stat.playerId
        )

        if (!playerTeam) continue

        const participantCount = tournament.teams.filter(team =>
          team.categoryId === playerTeam.categoryId
        ).length * 2 // Multiplicar por 2 ya que son equipos de 2 jugadores

        const result: TournamentResult = {
          tournamentId,
          playerId: stat.playerId,
          categoryId: playerTeam.categoryId,
          finalPosition: stat.finalPosition,
          matchesPlayed: stat.matchesPlayed,
          matchesWon: stat.matchesWon,
          setsWon: stat.setsWon,
          setsLost: stat.setsLost,
          participantCount,
          tournamentType: tournament.type
        }

        const calculatedPoints = this.calculatePlayerTournamentPoints(result)

        // Actualizar puntos en TournamentStats
        await prisma.tournamentStats.update({
          where: {
            id: stat.id
          },
          data: {
            pointsEarned: calculatedPoints
          }
        })

        console.log(`  ✅ ${stat.player.firstName} ${stat.player.lastName}: ${calculatedPoints} points`)
      }

      console.log(`🎉 Points calculated successfully for tournament: ${tournament.name}`)

    } catch (error) {
      console.error('❌ Error calculating tournament points:', error)
      throw error
    }
  }

  /**
   * Actualizar ranking global después de calcular puntos de torneo
   */
  static async updatePlayerRankings(tournamentId: string): Promise<void> {
    try {
      console.log(`📊 Updating player rankings after tournament: ${tournamentId}`)

      const currentYear = new Date().getFullYear()

      // Obtener todas las stats del torneo
      const tournamentStats = await prisma.tournamentStats.findMany({
        where: { tournamentId },
        include: {
          player: true
        }
      })

      // Obtener información del torneo para saber la categoría
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          teams: true
        }
      })

      if (!tournament) {
        throw new Error('Tournament not found for ranking update')
      }

      // Para cada jugador del torneo, actualizar su ranking
      for (const stat of tournamentStats) {
        const playerId = stat.playerId

        // Encontrar la categoría del jugador en este torneo
        const playerTeam = tournament.teams.find(team =>
          team.player1Id === playerId || team.player2Id === playerId
        )

        if (!playerTeam) continue

        const categoryId = playerTeam.categoryId

        // Calcular el total de puntos del jugador para esta categoría este año
        // (sumando todos los torneos completados)
        const allPlayerStats = await prisma.tournamentStats.findMany({
          where: {
            playerId,
            tournament: {
              status: 'COMPLETED',
              tournamentEnd: {
                gte: new Date(currentYear, 0, 1),
                lt: new Date(currentYear + 1, 0, 1)
              },
              teams: {
                some: {
                  categoryId,
                  OR: [
                    { player1Id: playerId },
                    { player2Id: playerId }
                  ]
                }
              }
            }
          }
        })

        const totalPoints = allPlayerStats.reduce((sum, s) => sum + s.pointsEarned, 0)

        // Actualizar o crear el ranking
        await prisma.playerRanking.upsert({
          where: {
            playerId_categoryId_seasonYear: {
              playerId,
              categoryId,
              seasonYear: currentYear
            }
          },
          update: {
            currentPoints: totalPoints,
            lastUpdated: new Date()
          },
          create: {
            playerId,
            categoryId,
            currentPoints: totalPoints,
            seasonYear: currentYear
          }
        })

        console.log(`  📈 Updated ranking: Player ${stat.player.firstName} ${stat.player.lastName} in category ${categoryId} = ${totalPoints} points`)
      }

      console.log(`🏁 Player rankings updated successfully!`)

    } catch (error) {
      console.error('❌ Error updating player rankings:', error)
      throw error
    }
  }

  /**
   * Proceso completo: calcular puntos y actualizar rankings
   */
  static async processCompletedTournament(tournamentId: string): Promise<void> {
    console.log(`🚀 Starting complete points calculation process for tournament: ${tournamentId}`)

    try {
      // Paso 1: Calcular puntos del torneo
      await this.calculateTournamentPoints(tournamentId)

      // Paso 2: Actualizar rankings globales
      await this.updatePlayerRankings(tournamentId)

      console.log(`✨ Tournament points calculation completed successfully!`)

    } catch (error) {
      console.error('❌ Error in complete tournament processing:', error)
      throw error
    }
  }
}

export default PointsCalculationService