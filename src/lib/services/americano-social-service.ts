import { prisma } from "@/lib/prisma"
import type { Player } from "@prisma/client"

interface SetResult {
  teamAScore: number
  teamBScore: number
}

export class AmericanoSocialService {
  /**
   * Genera pools y partidos para Americano Social
   * @param tournamentId
   * @param categoryId
   * @param players Lista de jugadores inscritos
   */
  static async generateAmericanoSocialPools(
    tournamentId: string,
    categoryId: string,
    players: Player[]
  ): Promise<void> {
    const numPlayers = players.length

    // Validar: debe ser múltiplo de 4
    if (numPlayers % 4 !== 0) {
      throw new Error(
        `Americano Social requiere múltiplo de 4 jugadores. Tienes ${numPlayers} jugadores.`
      )
    }

    if (numPlayers < 4) {
      throw new Error("Se requieren al menos 4 jugadores")
    }

    const numPools = numPlayers / 4

    console.log(`🎾 Generando ${numPools} pools de 4 jugadores`)

    // Mezclar jugadores aleatoriamente (o por ranking si existe)
    const shuffledPlayers = this.shufflePlayers(players)

    // Crear pools
    for (let i = 0; i < numPools; i++) {
      const poolPlayers = shuffledPlayers.slice(i * 4, (i + 1) * 4)

      // Crear pool
      const pool = await prisma.americanoPool.create({
        data: {
          tournamentId,
          categoryId,
          name: `Pool ${String.fromCharCode(65 + i)}`, // A, B, C, D...
          poolNumber: i + 1
        }
      })

      // Agregar jugadores al pool
      for (let j = 0; j < 4; j++) {
        await prisma.americanoPoolPlayer.create({
          data: {
            poolId: pool.id,
            playerId: poolPlayers[j].id,
            position: j + 1
          }
        })
      }

      // Generar los 3 partidos del pool
      await this.generatePoolMatches(
        pool.id,
        tournamentId,
        categoryId,
        poolPlayers
      )

      // Inicializar ranking global para cada jugador
      for (const player of poolPlayers) {
        await prisma.americanoGlobalRanking.create({
          data: {
            tournamentId,
            categoryId,
            playerId: player.id
          }
        })
      }
    }

    console.log(`✅ ${numPools} pools creados exitosamente`)
  }

  /**
   * Genera los 3 partidos de un pool
   * Pool con jugadores: [A, B, C, D]
   * Partidos:
   * 1. AB vs CD
   * 2. AC vs BD
   * 3. AD vs BC
   */
  private static async generatePoolMatches(
    poolId: string,
    tournamentId: string,
    categoryId: string,
    players: Player[]
  ): Promise<void> {
    const [A, B, C, D] = players

    const matches = [
      // Ronda 1: AB vs CD
      {
        roundNumber: 1,
        player1Id: A.id,
        player2Id: B.id,
        player3Id: C.id,
        player4Id: D.id
      },
      // Ronda 2: AC vs BD
      {
        roundNumber: 2,
        player1Id: A.id,
        player2Id: C.id,
        player3Id: B.id,
        player4Id: D.id
      },
      // Ronda 3: AD vs BC
      {
        roundNumber: 3,
        player1Id: A.id,
        player2Id: D.id,
        player3Id: B.id,
        player4Id: C.id
      }
    ]

    for (const match of matches) {
      await prisma.americanoPoolMatch.create({
        data: {
          poolId,
          tournamentId,
          categoryId,
          ...match
        }
      })
    }
  }

  /**
   * Actualiza estadísticas tras cargar resultado
   */
  static async updateMatchResult(
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    sets: SetResult[]
  ): Promise<void> {
    const match = await prisma.americanoPoolMatch.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
        player3: true,
        player4: true
      }
    })

    if (!match) throw new Error("Partido no encontrado")

    // Determinar ganador
    const winnerTeam = teamAScore > teamBScore ? "A" : "B"

    // Actualizar partido
    await prisma.americanoPoolMatch.update({
      where: { id: matchId },
      data: {
        status: "COMPLETED",
        teamAScore,
        teamBScore,
        winnerTeam,
        completedAt: new Date()
      }
    })

    // Guardar sets
    for (let i = 0; i < sets.length; i++) {
      await prisma.americanoPoolMatchSet.create({
        data: {
          matchId,
          setNumber: i + 1,
          teamAScore: sets[i].teamAScore,
          teamBScore: sets[i].teamBScore
        }
      })
    }

    // Actualizar stats de jugadores del pool
    const playersToUpdate = [
      {
        playerId: match.player1Id,
        games: teamAScore,
        won: winnerTeam === "A"
      },
      {
        playerId: match.player2Id,
        games: teamAScore,
        won: winnerTeam === "A"
      },
      {
        playerId: match.player3Id,
        games: teamBScore,
        won: winnerTeam === "B"
      },
      {
        playerId: match.player4Id,
        games: teamBScore,
        won: winnerTeam === "B"
      }
    ]

    for (const { playerId, games, won } of playersToUpdate) {
      // Actualizar stats del pool
      const poolPlayer = await prisma.americanoPoolPlayer.findFirst({
        where: {
          poolId: match.poolId,
          playerId
        }
      })

      if (poolPlayer) {
        await prisma.americanoPoolPlayer.update({
          where: { id: poolPlayer.id },
          data: {
            gamesWon: { increment: games },
            gamesLost: { increment: won ? 0 : (teamAScore + teamBScore - games) },
            matchesWon: { increment: won ? 1 : 0 },
            matchesLost: { increment: won ? 0 : 1 },
            totalPoints: { increment: games } // Puntos = games ganados
          }
        })
      }

      // Actualizar ranking global
      const globalRanking = await prisma.americanoGlobalRanking.findFirst({
        where: {
          tournamentId: match.tournamentId,
          categoryId: match.categoryId,
          playerId
        }
      })

      if (globalRanking) {
        await prisma.americanoGlobalRanking.update({
          where: { id: globalRanking.id },
          data: {
            totalGamesWon: { increment: games },
            totalGamesLost: { increment: won ? 0 : (teamAScore + teamBScore - games) },
            totalMatchesWon: { increment: won ? 1 : 0 },
            totalPoints: { increment: games }
          }
        })
      }
    }

    // Recalcular posiciones en ranking global
    await this.recalculateGlobalRankings(match.tournamentId, match.categoryId)
  }

  /**
   * Recalcula posiciones del ranking global
   */
  private static async recalculateGlobalRankings(
    tournamentId: string,
    categoryId: string
  ): Promise<void> {
    const rankings = await prisma.americanoGlobalRanking.findMany({
      where: { tournamentId, categoryId },
      orderBy: [
        { totalPoints: 'desc' },
        { totalGamesWon: 'desc' },
        { totalMatchesWon: 'desc' }
      ]
    })

    for (let i = 0; i < rankings.length; i++) {
      await prisma.americanoGlobalRanking.update({
        where: { id: rankings[i].id },
        data: { position: i + 1 }
      })
    }
  }

  /**
   * Mezcla jugadores aleatoriamente
   */
  private static shufflePlayers(players: Player[]): Player[] {
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Obtiene todos los pools de un torneo/categoría
   */
  static async getPools(tournamentId: string, categoryId: string) {
    return await prisma.americanoPool.findMany({
      where: { tournamentId, categoryId },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        matches: {
          include: {
            player1: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            player2: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            player3: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            player4: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            sets: true
          },
          orderBy: { roundNumber: 'asc' }
        },
        court: true
      },
      orderBy: { poolNumber: 'asc' }
    })
  }

  /**
   * Obtiene el ranking global del torneo
   */
  static async getGlobalRanking(tournamentId: string, categoryId: string) {
    return await prisma.americanoGlobalRanking.findMany({
      where: { tournamentId, categoryId },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { totalPoints: 'desc' }
      ]
    })
  }

  /**
   * Asigna una cancha a un pool
   */
  static async assignCourtToPool(poolId: string, courtId: string | null) {
    return await prisma.americanoPool.update({
      where: { id: poolId },
      data: { courtId }
    })
  }
}
