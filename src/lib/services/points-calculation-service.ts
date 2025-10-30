import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sistema de puntos por posición en torneo (proporciones basadas en 1000 pts)
// Estos son porcentajes que se aplicarán a rankingPoints del torneo
const POSITION_PERCENTAGES = {
  1: 1.00,   // 100% - 1er lugar
  2: 0.70,   // 70% - 2do lugar
  3: 0.50,   // 50% - 3er lugar
  4: 0.40,   // 40% - 4to lugar
  5: 0.30,   // 30% - Cuartos de final
  6: 0.30,
  7: 0.30,
  8: 0.30,
  9: 0.20,   // 20% - Octavos de final
  10: 0.20,
  11: 0.20,
  12: 0.20,
  13: 0.20,
  14: 0.20,
  15: 0.20,
  16: 0.20,
  17: 0.10,  // 10% - Primera ronda
} as const

/**
 * Calcular puntos por posición basados en rankingPoints del torneo
 */
function calculatePositionPoints(position: number, tournamentRankingPoints: number): number {
  const percentage = POSITION_PERCENTAGES[position as keyof typeof POSITION_PERCENTAGES] || 0
  return Math.round(tournamentRankingPoints * percentage)
}

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
  tournamentRankingPoints: number
}

export interface PointsBreakdown {
  participationPoints: number
  positionPoints: number
  positionPercentage: number
  victoryBonus: number
  victoriesCount: number
  victoryBonusPerWin: number
  setBonus: number
  setsCount: number
  setBonusPerSet: number
  subtotal: number
  tournamentMultiplier: number
  tournamentMultiplierLabel: string
  afterTournamentMultiplier: number
  participantMultiplier: number
  participantMultiplierLabel: string
  finalTotal: number
}

export class PointsCalculationService {
  /**
   * Calcular puntos con desglose detallado para un jugador específico en un torneo
   */
  static calculatePlayerTournamentPointsWithBreakdown(result: TournamentResult): PointsBreakdown {
    // 1. Puntos base de participación
    const participationPoints = PARTICIPATION_POINTS

    // 2. Puntos por posición final
    let positionPoints = 0
    let positionPercentage = 0
    if (result.finalPosition && result.finalPosition <= 17) {
      positionPercentage = POSITION_PERCENTAGES[result.finalPosition as keyof typeof POSITION_PERCENTAGES] || 0
      positionPoints = calculatePositionPoints(result.finalPosition, result.tournamentRankingPoints)
    }

    // 3. Bonus por victorias
    const victoryBonusPerWin = Math.round((result.tournamentRankingPoints / 1000) * 25)
    const victoryBonus = result.matchesWon * victoryBonusPerWin

    // 4. Bonus por sets ganados
    const setBonusPerSet = Math.round((result.tournamentRankingPoints / 1000) * 5)
    const setBonus = result.setsWon * setBonusPerSet

    // Subtotal antes de multiplicadores
    const subtotal = participationPoints + positionPoints + victoryBonus + setBonus

    // 5. Multiplicador por tipo de torneo
//TODO: mp23530 se inhabilitan los multiplicadores de torneo
    // const tournamentMultiplier = TOURNAMENT_TYPE_MULTIPLIER[result.tournamentType as keyof typeof TOURNAMENT_TYPE_MULTIPLIER] || 1.0
    // const afterTournamentMultiplier = subtotal * tournamentMultiplier
    const tournamentMultiplier = 1.0
    const afterTournamentMultiplier = subtotal * 1.0

    // 6. Multiplicador por número de participantes
//TODO: mp23530 se inhabilitan los multiplicadores de torneo    
    // const participantMultiplier = getParticipantMultiplier(result.participantCount)
    // const finalTotal = Math.round(afterTournamentMultiplier * participantMultiplier)
    const participantMultiplier = 1.0
    const finalTotal = Math.round(afterTournamentMultiplier * participantMultiplier)

    return {
      participationPoints,
      positionPoints,
      positionPercentage: positionPercentage * 100, // Convertir a porcentaje
      victoryBonus,
      victoriesCount: result.matchesWon,
      victoryBonusPerWin,
      setBonus,
      setsCount: result.setsWon,
      setBonusPerSet,
      subtotal,
      tournamentMultiplier,
      tournamentMultiplierLabel: result.tournamentType,
      afterTournamentMultiplier: Math.round(afterTournamentMultiplier),
      participantMultiplier,
      participantMultiplierLabel: `${result.participantCount} jugadores`,
      finalTotal
    }
  }

  /**
   * Calcular puntos para un jugador específico en un torneo
   */
  static calculatePlayerTournamentPoints(result: TournamentResult): number {
    const breakdown = this.calculatePlayerTournamentPointsWithBreakdown(result)
    return breakdown.finalTotal
  }

  /**
   * Calcular posiciones finales automáticamente basándose en los resultados del torneo
   */
  static async calculateFinalPositions(tournamentId: string): Promise<void> {
    console.log(`📊 Calculating final positions for tournament: ${tournamentId}`)

    // Obtener información del torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { type: true, name: true }
    })

    if (!tournament) {
      console.error(`❌ Tournament ${tournamentId} not found`)
      return
    }

    console.log(`📊 Tournament: ${tournament.name}, Type: ${tournament.type}`)

    // Obtener todos los matches del torneo para determinar posiciones
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      include: {
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
        },
        winnerTeam: {
          include: {
            registration1: { select: { playerId: true } },
            registration2: { select: { playerId: true } }
          }
        }
      },
      orderBy: [
        { phaseType: 'desc' }, // FINAL primero
        { roundNumber: 'desc' }
      ]
    })

    console.log(`📊 Found ${matches.length} matches`)

    const playerPositions: Map<string, number> = new Map()

    // Asignar posiciones basándose en la fase en la que fueron eliminados
    for (const match of matches) {
      if (match.status === 'COMPLETED' || match.status === 'WALKOVER') {
        const winnerId = match.winnerTeamId

        // El perdedor obtiene posición basada en la fase
        const loserTeam = winnerId === match.team1?.id ? match.team2 : match.team1

        if (loserTeam) {
          let position = 2 // Default para perdedor en final

          // Determinar posición según la fase
          switch (match.phaseType) {
            case 'FINAL':
              position = 2 // Subcampeón
              break
            case 'THIRD_PLACE':
              // Este partido define 3er y 4to lugar
              position = winnerId === match.team1?.id ? 4 : 3
              break
            case 'SEMIFINALS':
              position = 3 // Perdedores de semi quedan 3-4
              break
            case 'QUARTERFINALS':
              position = 5 // Perdedores de cuartos quedan 5-8
              break
            case 'ROUND_OF_16':
              position = 9 // Perdedores de octavos quedan 9-16
              break
            case 'ROUND_OF_32':
              position = 17 // Perdedores de 1/16 quedan 17-32
              break
            default:
              position = 10 // Otros casos
          }

          // Asignar posición a ambos jugadores del equipo perdedor
          if (loserTeam.registration1) {
            const playerId = loserTeam.registration1.playerId
            if (!playerPositions.has(playerId) || playerPositions.get(playerId)! > position) {
              playerPositions.set(playerId, position)
            }
          }
          if (loserTeam.registration2) {
            const playerId = loserTeam.registration2.playerId
            if (!playerPositions.has(playerId) || playerPositions.get(playerId)! > position) {
              playerPositions.set(playerId, position)
            }
          }
        }

        // El ganador de la final es 1er lugar
        if (match.phaseType === 'FINAL' && match.winnerTeam) {
          if (match.winnerTeam.registration1) {
            playerPositions.set(match.winnerTeam.registration1.playerId, 1)
          }
          if (match.winnerTeam.registration2) {
            playerPositions.set(match.winnerTeam.registration2.playerId, 1)
          }
        }
      }
    }

    // Actualizar las posiciones en TournamentStats
    for (const [playerId, position] of playerPositions.entries()) {
      await prisma.tournamentStats.updateMany({
        where: {
          tournamentId,
          playerId
        },
        data: {
          finalPosition: position
        }
      })
      console.log(`  📌 Player ${playerId}: Position ${position}`)
    }

    console.log(`✅ Final positions calculated for ${playerPositions.size} players`)
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
              registration1Id: true,
              registration2Id: true,
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
          team.registration1.playerId === stat.playerId || team.registration2.playerId === stat.playerId
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
          tournamentType: tournament.type,
          tournamentRankingPoints: tournament.rankingPoints
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
      })

      if (!tournament) {
        throw new Error('Tournament not found for ranking update')
      }

      // Para cada jugador del torneo, actualizar su ranking
      for (const stat of tournamentStats) {
        const playerId = stat.playerId

        // Encontrar la categoría del jugador en este torneo
        const playerTeam = tournament.teams.find(team =>
          team.registration1.playerId === playerId || team.registration2.playerId === playerId
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
                    {
                      registration1: {
                        playerId: playerId
                      }
                    },
                    {
                      registration2: {
                        playerId: playerId
                      }
                    }
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
   * Proceso completo: calcular posiciones, puntos y actualizar rankings
   */
  static async processCompletedTournament(tournamentId: string): Promise<void> {
    console.log(`🚀 Starting complete points calculation process for tournament: ${tournamentId}`)

    try {
      // Paso 0: Calcular posiciones finales automáticamente
      await this.calculateFinalPositions(tournamentId)

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

  /**
   * Recalcular rankings cuando un torneo vuelve de COMPLETED a IN_PROGRESS
   * Excluye los puntos del torneo especificado del cálculo de rankings
   */
  static async recalculatePlayerRankingsAfterTournamentReversion(tournamentId: string): Promise<void> {
    try {
      // Paso 1: Resetear los TournamentStats del torneo (poner puntos en 0 y posiciones en null)
      await prisma.tournamentStats.updateMany({
        where: { tournamentId },
        data: {
          pointsEarned: 0,
          finalPosition: null
        }
      })

      const currentYear = new Date().getFullYear()

      // Obtener información del torneo y todos los jugadores que participaron
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
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
      })

      if (!tournament) {
        throw new Error('Tournament not found for ranking recalculation')
      }

      // Extraer todos los jugadores únicos del torneo agrupados por categoría
      const playersByCategory = new Map<string, Set<string>>()

      for (const team of tournament.teams) {
        if (!playersByCategory.has(team.categoryId)) {
          playersByCategory.set(team.categoryId, new Set())
        }

        const categoryPlayers = playersByCategory.get(team.categoryId)!
        if (team.registration1?.playerId) {
          categoryPlayers.add(team.registration1.playerId)
        }
        if (team.registration2?.playerId) {
          categoryPlayers.add(team.registration2.playerId)
        }
      }

      // Para cada categoría y sus jugadores, recalcular puntos
      for (const [categoryId, playerIds] of playersByCategory.entries()) {
        for (const playerId of playerIds) {
          // Calcular el total de puntos del jugador para esta categoría este año
          // EXCLUYENDO el torneo que volvió a IN_PROGRESS
          const allPlayerStats = await prisma.tournamentStats.findMany({
            where: {
              playerId,
              tournament: {
                status: 'COMPLETED', // Solo torneos completados
                tournamentEnd: {
                  gte: new Date(currentYear, 0, 1),
                  lt: new Date(currentYear + 1, 0, 1)
                },
                teams: {
                  some: {
                    categoryId,
                    OR: [
                      {
                        registration1: {
                          playerId: playerId
                        }
                      },
                      {
                        registration2: {
                          playerId: playerId
                        }
                      }
                    ]
                  }
                }
              }
            }
          })

          const totalPoints = allPlayerStats.reduce((sum, s) => sum + s.pointsEarned, 0)

          // Actualizar el ranking
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
        }
      }

    } catch (error) {
      console.error('❌ Error recalculating player rankings after reversion:', error)
      throw error
    }
  }
}

export default PointsCalculationService