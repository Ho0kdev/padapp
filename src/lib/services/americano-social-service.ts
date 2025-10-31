import { prisma } from "@/lib/prisma"
import type { Player } from "@prisma/client"

interface SetResult {
  teamAScore: number
  teamBScore: number
}

// Las interacciones entre jugadores se rastrean mediante playerPoolHistory Map
// que almacena para cada jugador el Set de IDs de otros jugadores con los que ha compartido pool

export class AmericanoSocialService {
  /**
   * Genera pools y partidos para Americano Social con múltiples rondas
   *
   * Formato Americano Social:
   * - Jugadores individuales (no equipos fijos)
   * - Pools de exactamente 4 jugadores
   * - 3 partidos por pool (cada jugador juega con/contra todos)
   * - Múltiples rondas con redistribución inteligente
   *
   * Algoritmo de distribución:
   * - Ronda 1: Distribución aleatoria
   * - Rondas 2+: Evita que jugadores compartan pool nuevamente
   *   usando algoritmo greedy que minimiza jugadores conocidos
   *
   * @param tournamentId ID del torneo
   * @param categoryId ID de la categoría
   * @param players Lista de jugadores inscritos (debe ser múltiplo de 4)
   * @param numberOfRounds Número total de rondas a generar (1-10)
   */
  static async generateAmericanoSocialPools(
    tournamentId: string,
    categoryId: string,
    players: Player[],
    numberOfRounds: number = 1
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

    if (numberOfRounds < 1 || numberOfRounds > 10) {
      throw new Error("El número de rondas debe estar entre 1 y 10")
    }

    const numPools = numPlayers / 4
    console.log(`🎾 Generando ${numPools} pools por ronda x ${numberOfRounds} ronda(s)`)

    // Inicializar ranking global para todos los jugadores (solo una vez)
    for (const player of players) {
      await prisma.americanoGlobalRanking.create({
        data: {
          tournamentId,
          categoryId,
          playerId: player.id
        }
      })
    }

    // Tracking de jugadores que han compartido pool
    const playerPoolHistory = new Map<string, Set<string>>()

    for (const player of players) {
      playerPoolHistory.set(player.id, new Set())
    }

    // Generar cada ronda
    for (let round = 1; round <= numberOfRounds; round++) {
      console.log(`\n📋 Generando ronda ${round}/${numberOfRounds}`)

      if (round === 1) {
        // Primera ronda: distribución aleatoria
        await this.generateFirstRound(
          tournamentId,
          categoryId,
          players,
          round,
          playerPoolHistory
        )
      } else {
        // Rondas subsiguientes: evitar que jugadores compartan pool nuevamente
        await this.generateSubsequentRound(
          tournamentId,
          categoryId,
          players,
          round,
          playerPoolHistory
        )
      }
    }

    console.log(`\n✅ ${numberOfRounds} ronda(s) con ${numPools} pools cada una creadas exitosamente`)
  }

  /**
   * Genera la primera ronda con distribución aleatoria
   */
  private static async generateFirstRound(
    tournamentId: string,
    categoryId: string,
    players: Player[],
    roundNumber: number,
    playerPoolHistory: Map<string, Set<string>>
  ): Promise<void> {
    const numPools = players.length / 4
    const shuffledPlayers = this.shufflePlayers(players)

    for (let i = 0; i < numPools; i++) {
      const poolPlayers = shuffledPlayers.slice(i * 4, (i + 1) * 4)

      await this.createPoolWithPlayers(
        tournamentId,
        categoryId,
        roundNumber,
        i + 1,
        poolPlayers
      )

      // Registrar que estos jugadores han compartido pool
      this.updatePlayerPoolHistory(poolPlayers, playerPoolHistory)
    }
  }

  /**
   * Genera rondas subsiguientes minimizando repeticiones de jugadores en pools
   * Cuenta TODAS las parejas repetidas dentro del pool, no solo las del candidato
   */
  private static async generateSubsequentRound(
    tournamentId: string,
    categoryId: string,
    players: Player[],
    roundNumber: number,
    playerPoolHistory: Map<string, Set<string>>
  ): Promise<void> {
    const numPools = players.length / 4
    const available = [...players]
    const pools: Player[][] = []

    // Crear pools minimizando TODAS las repeticiones (no solo del candidato)
    for (let poolNum = 0; poolNum < numPools; poolNum++) {
      const pool: Player[] = []

      // 1. Tomar primer jugador disponible
      const anchor = available.shift()!
      pool.push(anchor)

      // 2. Encontrar 3 jugadores que generen el pool con MENOS repeticiones totales
      for (let i = 0; i < 3; i++) {
        let bestMatch = available[0]
        let minRepetitions = Infinity

        for (const candidate of available) {
          // Crear pool temporal con el candidato
          const tempPool = [...pool, candidate]

          // Contar TODAS las parejas repetidas en este pool temporal
          const repetitions = this.countPoolRepetitions(tempPool, playerPoolHistory)

          if (repetitions < minRepetitions) {
            minRepetitions = repetitions
            bestMatch = candidate
          }
        }

        pool.push(bestMatch)
        available.splice(available.indexOf(bestMatch), 1)
      }

      pools.push(pool)
    }

    // Crear los pools en la base de datos
    for (let i = 0; i < pools.length; i++) {
      await this.createPoolWithPlayers(
        tournamentId,
        categoryId,
        roundNumber,
        i + 1,
        pools[i]
      )

      // Registrar que estos jugadores han compartido pool
      this.updatePlayerPoolHistory(pools[i], playerPoolHistory)
    }
  }

  /**
   * Crea un pool con sus jugadores y partidos
   */
  private static async createPoolWithPlayers(
    tournamentId: string,
    categoryId: string,
    roundNumber: number,
    poolNumber: number,
    poolPlayers: Player[]
  ): Promise<void> {
    // Crear pool
    const pool = await prisma.americanoPool.create({
      data: {
        tournamentId,
        categoryId,
        name: `R${roundNumber} - Pool ${String.fromCharCode(64 + poolNumber)}`, // R1 - Pool A, R2 - Pool B, etc.
        poolNumber,
        roundNumber
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

    console.log(`   ✓ Pool ${poolNumber} creado con jugadores: ${poolPlayers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`)
  }

  /**
   * Cuenta cuántas parejas dentro de un pool ya se conocieron previamente
   * Esto permite evaluar qué tan "repetido" es un pool propuesto
   *
   * @param pool Array de jugadores del pool propuesto
   * @param playerPoolHistory Historial de jugadores que han compartido pool
   * @returns Número de parejas que ya se conocieron (0 = pool perfecto sin repeticiones)
   */
  private static countPoolRepetitions(
    pool: Player[],
    playerPoolHistory: Map<string, Set<string>>
  ): number {
    let repetitions = 0

    // Para cada par de jugadores en el pool
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const p1 = pool[i]
        const p2 = pool[j]

        // ¿Esta pareja ya se conoció antes?
        if (playerPoolHistory.get(p1.id)?.has(p2.id)) {
          repetitions++
        }
      }
    }

    return repetitions
  }

  /**
   * Registra que todos los jugadores de un pool han compartido cancha
   * Marca a cada jugador como "ya jugó con" todos los demás del pool
   */
  private static updatePlayerPoolHistory(
    poolPlayers: Player[],
    playerPoolHistory: Map<string, Set<string>>
  ): void {
    // Para cada par de jugadores en el pool, registrar que se conocieron
    for (let i = 0; i < poolPlayers.length; i++) {
      for (let j = i + 1; j < poolPlayers.length; j++) {
        const p1 = poolPlayers[i]
        const p2 = poolPlayers[j]

        // Relación bidireccional: p1 conoce a p2 y viceversa
        playerPoolHistory.get(p1.id)?.add(p2.id)
        playerPoolHistory.get(p2.id)?.add(p1.id)
      }
    }
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
        tournament: {
          select: {
            id: true,
            name: true,
            setsToWin: true,
            gamesToWinSet: true,
            tiebreakAt: true,
            goldenPoint: true
          }
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
