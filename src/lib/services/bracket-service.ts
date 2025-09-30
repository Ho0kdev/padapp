import { prisma } from "@/lib/prisma"
import { TournamentType, PhaseType, MatchStatus } from "@prisma/client"

interface TeamData {
  id: string
  seed: number | null
  name?: string | null
  player1Id: string
  player2Id: string
}

interface BracketMatch {
  roundNumber: number
  matchNumber: number
  phaseType: PhaseType
  team1Id?: string
  team2Id?: string
  team1FromMatchId?: string
  team2FromMatchId?: string
}

/**
 * Servicio para generación y gestión de brackets de torneos
 * Sigue los patrones establecidos en tournament-log-service.ts
 */
export class BracketService {
  /**
   * Genera el bracket completo para un torneo según su tipo
   */
  static async generateBracket(tournamentId: string, categoryId: string): Promise<void> {
    // Obtener torneo con información relevante
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: {
          where: { categoryId },
          include: {
            teams: {
              where: {
                registrationStatus: { in: ['CONFIRMED', 'PAID'] }
              },
              orderBy: [
                { seed: 'asc' },
                { registeredAt: 'asc' }
              ]
            }
          }
        }
      }
    })

    if (!tournament) {
      throw new Error("Torneo no encontrado")
    }

    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      throw new Error("Categoría no encontrada en el torneo")
    }

    const teams = tournamentCategory.teams
    if (teams.length < 2) {
      throw new Error("Se requieren al menos 2 equipos para generar el bracket")
    }

    // Validar que todos los equipos tengan seed si es necesario
    const teamsWithSeed = teams.filter(t => t.seed !== null)
    if (teamsWithSeed.length > 0 && teamsWithSeed.length !== teams.length) {
      throw new Error("Todos los equipos deben tener seed asignado o ninguno debe tenerlo")
    }

    // Limpiar matches existentes de esta categoría
    await prisma.match.deleteMany({
      where: {
        tournamentId,
        categoryId
      }
    })

    // Generar bracket según el tipo de torneo
    switch (tournament.type) {
      case TournamentType.SINGLE_ELIMINATION:
        await this.generateSingleEliminationBracket(tournamentId, categoryId, teams)
        break

      case TournamentType.DOUBLE_ELIMINATION:
        await this.generateDoubleEliminationBracket(tournamentId, categoryId, teams)
        break

      case TournamentType.ROUND_ROBIN:
        await this.generateRoundRobinBracket(tournamentId, categoryId, teams)
        break

      case TournamentType.GROUP_STAGE_ELIMINATION:
        await this.generateGroupStageEliminationBracket(tournamentId, categoryId, teams)
        break

      default:
        throw new Error(`Tipo de torneo ${tournament.type} no soportado aún`)
    }
  }

  /**
   * Genera bracket de eliminación simple
   */
  private static async generateSingleEliminationBracket(
    tournamentId: string,
    categoryId: string,
    teams: TeamData[]
  ): Promise<void> {
    const numTeams = teams.length
    const numRounds = Math.ceil(Math.log2(numTeams))
    const bracketSize = Math.pow(2, numRounds)
    const numByes = bracketSize - numTeams

    console.log(`📊 Generando bracket de eliminación simple:`, {
      numTeams,
      numRounds,
      bracketSize,
      numByes
    })

    // Distribuir equipos con byes balanceados
    const seededTeams = this.distributeByes(teams, bracketSize)

    // Generar todas las rondas
    const allMatches: BracketMatch[] = []

    // Primera ronda con equipos asignados
    const firstRoundMatches = Math.floor(bracketSize / 2)
    for (let i = 0; i < firstRoundMatches; i++) {
      const team1 = seededTeams[i * 2]
      const team2 = seededTeams[i * 2 + 1]

      allMatches.push({
        roundNumber: 1,
        matchNumber: i + 1,
        phaseType: this.getPhaseType(numRounds, 1),
        team1Id: team1?.id,
        team2Id: team2?.id
      })
    }

    // Rondas siguientes (vacías, se llenan con progresión automática)
    for (let round = 2; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round)

      for (let match = 0; match < matchesInRound; match++) {
        const prevRoundMatch1 = match * 2
        const prevRoundMatch2 = match * 2 + 1

        allMatches.push({
          roundNumber: round,
          matchNumber: match + 1,
          phaseType: this.getPhaseType(numRounds, round),
          team1FromMatchId: `R${round - 1}M${prevRoundMatch1 + 1}`, // Temporal, se resuelve después
          team2FromMatchId: `R${round - 1}M${prevRoundMatch2 + 1}`
        })
      }
    }

    // Crear matches en la base de datos
    await this.createMatchesWithProgression(tournamentId, categoryId, allMatches)

    console.log(`✅ Bracket generado: ${allMatches.length} partidos creados`)
  }

  /**
   * Genera bracket de doble eliminación (upper + lower bracket)
   */
  private static async generateDoubleEliminationBracket(
    tournamentId: string,
    categoryId: string,
    teams: TeamData[]
  ): Promise<void> {
    const numTeams = teams.length
    const upperRounds = Math.ceil(Math.log2(numTeams))
    const bracketSize = Math.pow(2, upperRounds)
    const numByes = bracketSize - numTeams

    console.log(`📊 Generando bracket de doble eliminación:`, {
      numTeams,
      upperRounds,
      bracketSize,
      numByes,
      lowerRounds: (upperRounds * 2) - 1
    })

    // Distribuir equipos con byes
    const seededTeams = this.distributeByes(teams, bracketSize)

    const allMatches: BracketMatch[] = []

    // ═══════════════════════════════════════════════════
    // PARTE 1: UPPER BRACKET (Winners Bracket)
    // ═══════════════════════════════════════════════════

    let upperMatchCounter = 1

    // Upper Round 1
    const upperR1Matches = Math.floor(bracketSize / 2)
    for (let i = 0; i < upperR1Matches; i++) {
      const team1 = seededTeams[i * 2]
      const team2 = seededTeams[i * 2 + 1]

      allMatches.push({
        roundNumber: 1,
        matchNumber: upperMatchCounter,
        phaseType: this.getPhaseType(upperRounds, 1),
        team1Id: team1?.id,
        team2Id: team2?.id
      })

      upperMatchCounter++
    }

    // Upper Rounds siguientes
    for (let round = 2; round <= upperRounds; round++) {
      const matchesInRound = Math.pow(2, upperRounds - round)

      for (let match = 0; match < matchesInRound; match++) {
        const prevRoundMatch1 = match * 2
        const prevRoundMatch2 = match * 2 + 1

        allMatches.push({
          roundNumber: round,
          matchNumber: upperMatchCounter,
          phaseType: this.getPhaseType(upperRounds, round),
          team1FromMatchId: `UR${round - 1}M${prevRoundMatch1 + 1}`,
          team2FromMatchId: `UR${round - 1}M${prevRoundMatch2 + 1}`
        })

        upperMatchCounter++
      }
    }

    // ═══════════════════════════════════════════════════
    // PARTE 2: LOWER BRACKET (Losers Bracket)
    // ═══════════════════════════════════════════════════

    let lowerMatchCounter = 1000 // Empezar en 1000 para diferenciar

    // Lower bracket tiene (upperRounds * 2 - 1) rondas
    const lowerRounds = (upperRounds * 2) - 1

    for (let lowerRound = 1; lowerRound <= lowerRounds; lowerRound++) {
      const isEvenRound = lowerRound % 2 === 0

      if (lowerRound === 1) {
        // LR1: Perdedores de Upper R1 entre sí
        const lowerR1Matches = upperR1Matches / 2

        for (let i = 0; i < lowerR1Matches; i++) {
          // Los perdedores de UR1 vienen en pares alternados
          allMatches.push({
            roundNumber: 100 + lowerRound, // 101 para lower
            matchNumber: lowerMatchCounter,
            phaseType: PhaseType.GROUP_STAGE, // Lower bracket
            team1FromMatchId: `UR1M${i * 4 + 1}`, // Perdedor del match impar
            team2FromMatchId: `UR1M${i * 4 + 3}`  // Perdedor del match siguiente impar
          })

          lowerMatchCounter++
        }
      } else if (isEvenRound) {
        // Rondas pares: Ganadores de LR anterior vs Perdedores de Upper
        const upperRoundSource = Math.floor(lowerRound / 2) + 1
        const matchesInRound = Math.pow(2, upperRounds - upperRoundSource)

        for (let i = 0; i < matchesInRound; i++) {
          allMatches.push({
            roundNumber: 100 + lowerRound,
            matchNumber: lowerMatchCounter,
            phaseType: PhaseType.GROUP_STAGE,
            team1FromMatchId: `LR${lowerRound - 1}M${i}`, // Ganador de lower anterior
            team2FromMatchId: `UR${upperRoundSource}M${i}` // Perdedor de upper
          })

          lowerMatchCounter++
        }
      } else {
        // Rondas impares (excepto la 1): Ganadores de LR anterior entre sí
        const matchesInRound = Math.pow(2, upperRounds - Math.ceil(lowerRound / 2))

        for (let i = 0; i < matchesInRound; i++) {
          allMatches.push({
            roundNumber: 100 + lowerRound,
            matchNumber: lowerMatchCounter,
            phaseType: PhaseType.GROUP_STAGE,
            team1FromMatchId: `LR${lowerRound - 1}M${i * 2}`,
            team2FromMatchId: `LR${lowerRound - 1}M${i * 2 + 1}`
          })

          lowerMatchCounter++
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // PARTE 3: GRAN FINAL
    // ═══════════════════════════════════════════════════

    // Final del Upper Bracket: roundNumber = upperRounds
    // Final del Lower Bracket: roundNumber = 100 + lowerRounds

    allMatches.push({
      roundNumber: 200, // Gran Final
      matchNumber: 9000,
      phaseType: PhaseType.FINAL,
      team1FromMatchId: `UR${upperRounds}M1`, // Ganador del upper bracket
      team2FromMatchId: `LR${lowerRounds}M1`  // Ganador del lower bracket
    })

    // BRACKET RESET (segunda gran final si gana el del lower)
    // Esto se manejará dinámicamente cuando se cargue el resultado

    // Crear todos los matches
    await this.createMatchesWithProgression(tournamentId, categoryId, allMatches)

    console.log(`✅ Doble eliminación generado: ${allMatches.length} partidos creados`)
  }

  /**
   * Genera bracket de round robin (todos contra todos)
   */
  private static async generateRoundRobinBracket(
    tournamentId: string,
    categoryId: string,
    teams: TeamData[]
  ): Promise<void> {
    const numTeams = teams.length
    const matches: BracketMatch[] = []

    // Todos contra todos
    let matchNumber = 1
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        matches.push({
          roundNumber: 1,
          matchNumber: matchNumber++,
          phaseType: PhaseType.GROUP_STAGE,
          team1Id: teams[i].id,
          team2Id: teams[j].id
        })
      }
    }

    await this.createMatchesWithProgression(tournamentId, categoryId, matches)

    console.log(`✅ Round Robin generado: ${matches.length} partidos`)
  }

  /**
   * Calcula la configuración óptima de grupos según el número de equipos
   * Retorna una configuración que resulte en un número de clasificados que sea potencia de 2
   */
  private static calculateOptimalGroupConfiguration(numTeams: number): {
    numGroups: number
    groupSizes: number[]
    qualifiedPerGroup: number
    bestThirdPlace: number
    totalClassified: number
  } {
    // Estrategias según número de equipos
    // Objetivo: que el número de clasificados sea potencia de 2 (8, 16, 32, etc.)

    // 8-11 equipos → 2 grupos → 4 clasificados (top 2 por grupo)
    if (numTeams >= 8 && numTeams <= 11) {
      const group1Size = Math.ceil(numTeams / 2)
      const group2Size = numTeams - group1Size
      return {
        numGroups: 2,
        groupSizes: [group1Size, group2Size],
        qualifiedPerGroup: 2,
        bestThirdPlace: 0,
        totalClassified: 4
      }
    }

    // 12-15 equipos → 4 grupos → 8 clasificados (top 2 por grupo)
    if (numTeams >= 12 && numTeams <= 15) {
      const baseSize = Math.floor(numTeams / 4)
      const remainder = numTeams % 4
      const groupSizes = Array(4).fill(baseSize)
      for (let i = 0; i < remainder; i++) {
        groupSizes[i]++
      }
      return {
        numGroups: 4,
        groupSizes,
        qualifiedPerGroup: 2,
        bestThirdPlace: 0,
        totalClassified: 8
      }
    }

    // 16-23 equipos → 4 grupos → 8 o 16 clasificados
    if (numTeams >= 16 && numTeams <= 23) {
      const baseSize = Math.floor(numTeams / 4)
      const remainder = numTeams % 4
      const groupSizes = Array(4).fill(baseSize)
      for (let i = 0; i < remainder; i++) {
        groupSizes[i]++
      }

      // Si hay 16+ equipos, podemos clasificar 16 (top 4 por grupo)
      if (numTeams >= 16 && numTeams <= 19) {
        return {
          numGroups: 4,
          groupSizes,
          qualifiedPerGroup: 4,
          bestThirdPlace: 0,
          totalClassified: 16
        }
      }

      // Si hay 20-23, clasificar top 3 + 4 mejores terceros = 16
      return {
        numGroups: 4,
        groupSizes,
        qualifiedPerGroup: 3,
        bestThirdPlace: 4,
        totalClassified: 16
      }
    }

    // 24-31 equipos → 8 grupos → 16 clasificados (top 2 por grupo)
    if (numTeams >= 24 && numTeams <= 31) {
      const baseSize = Math.floor(numTeams / 8)
      const remainder = numTeams % 8
      const groupSizes = Array(8).fill(baseSize)
      for (let i = 0; i < remainder; i++) {
        groupSizes[i]++
      }
      return {
        numGroups: 8,
        groupSizes,
        qualifiedPerGroup: 2,
        bestThirdPlace: 0,
        totalClassified: 16
      }
    }

    // 32+ equipos → 8 grupos → 16 o 32 clasificados
    if (numTeams >= 32) {
      const baseSize = Math.floor(numTeams / 8)
      const remainder = numTeams % 8
      const groupSizes = Array(8).fill(baseSize)
      for (let i = 0; i < remainder; i++) {
        groupSizes[i]++
      }

      // Si hay 32+ equipos, clasificar top 4 por grupo = 32
      return {
        numGroups: 8,
        groupSizes,
        qualifiedPerGroup: 4,
        bestThirdPlace: 0,
        totalClassified: 32
      }
    }

    // Fallback: default configuration
    const numGroups = Math.ceil(numTeams / 4)
    const baseSize = Math.floor(numTeams / numGroups)
    const remainder = numTeams % numGroups
    const groupSizes = Array(numGroups).fill(baseSize)
    for (let i = 0; i < remainder; i++) {
      groupSizes[i]++
    }

    return {
      numGroups,
      groupSizes,
      qualifiedPerGroup: 2,
      bestThirdPlace: 0,
      totalClassified: numGroups * 2
    }
  }

  /**
   * Genera bracket de fase de grupos + eliminación
   */
  private static async generateGroupStageEliminationBracket(
    tournamentId: string,
    categoryId: string,
    teams: TeamData[]
  ): Promise<void> {
    const numTeams = teams.length

    if (numTeams < 8) {
      throw new Error("Se requieren al menos 8 equipos para fase de grupos + eliminación")
    }

    // Determinar configuración óptima de grupos
    const groupConfig = this.calculateOptimalGroupConfiguration(numTeams)

    console.log(`📊 Generando fase de grupos + eliminación:`, {
      numTeams,
      numGroups: groupConfig.numGroups,
      groupSizes: groupConfig.groupSizes,
      qualifiedPerGroup: groupConfig.qualifiedPerGroup,
      bestThirdPlace: groupConfig.bestThirdPlace,
      totalClassified: groupConfig.totalClassified
    })

    const allMatches: BracketMatch[] = []

    // ═══════════════════════════════════════════════════
    // PARTE 1: CREAR ZONAS (GRUPOS) Y ASIGNAR EQUIPOS
    // ═══════════════════════════════════════════════════

    const groups: TeamData[][] = []
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    // Inicializar grupos vacíos
    for (let i = 0; i < groupConfig.numGroups; i++) {
      groups.push([])
    }

    // Distribuir equipos en grupos usando serpiente para balancear seeds
    // Serpiente: 1→A, 2→B, 3→C, 4→D, 5→D, 6→C, 7→B, 8→A
    let teamIndex = 0
    let direction = 1 // 1 = forward, -1 = backward
    let currentGroup = 0

    while (teamIndex < numTeams) {
      // Agregar equipo al grupo actual
      if (groups[currentGroup].length < groupConfig.groupSizes[currentGroup]) {
        groups[currentGroup].push(teams[teamIndex])
        teamIndex++
      }

      // Mover al siguiente grupo
      if (direction === 1) {
        currentGroup++
        if (currentGroup >= groupConfig.numGroups) {
          currentGroup = groupConfig.numGroups - 1
          direction = -1
        }
      } else {
        currentGroup--
        if (currentGroup < 0) {
          currentGroup = 0
          direction = 1
        }
      }
    }

    // Crear zonas en la base de datos
    const createdZones: Array<{ id: string; name: string; teamIds: string[] }> = []

    for (let g = 0; g < groups.length; g++) {
      const groupTeams = groups[g]

      if (groupTeams.length < 2) continue // Saltar grupos vacíos

      const zone = await prisma.tournamentZone.create({
        data: {
          tournamentId,
          categoryId,
          name: `Grupo ${groupNames[g]}`,
          phaseType: PhaseType.GROUP_STAGE
        }
      })

      // Asignar equipos a la zona
      for (const team of groupTeams) {
        await prisma.zoneTeam.create({
          data: {
            zoneId: zone.id,
            teamId: team.id
          }
        })
      }

      createdZones.push({
        id: zone.id,
        name: zone.name,
        teamIds: groupTeams.map(t => t.id)
      })

      console.log(`✅ ${zone.name} creado con ${groupTeams.length} equipos`)
    }

    // ═══════════════════════════════════════════════════
    // PARTE 2: GENERAR PARTIDOS DE FASE DE GRUPOS
    // ═══════════════════════════════════════════════════

    let matchNumber = 1

    for (let g = 0; g < groups.length; g++) {
      const groupTeams = groups[g]
      const zone = createdZones[g]

      if (!zone) continue

      // Round robin dentro del grupo
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          allMatches.push({
            roundNumber: 1, // Fase de grupos = ronda 1
            matchNumber: matchNumber++,
            phaseType: PhaseType.GROUP_STAGE,
            team1Id: groupTeams[i].id,
            team2Id: groupTeams[j].id
          })
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // PARTE 3: GENERAR FASE ELIMINATORIA
    // ═══════════════════════════════════════════════════

    const numClassified = groupConfig.totalClassified
    const eliminationRounds = Math.ceil(Math.log2(numClassified))

    console.log(`📊 Fase eliminatoria: ${numClassified} clasificados, ${eliminationRounds} rondas`)

    // Guardar configuración de grupos en metadata del torneo para clasificación posterior
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        metadata: {
          [`groupConfig_${categoryId}`]: {
            numGroups: groupConfig.numGroups,
            groupSizes: groupConfig.groupSizes,
            qualifiedPerGroup: groupConfig.qualifiedPerGroup,
            bestThirdPlace: groupConfig.bestThirdPlace,
            totalClassified: groupConfig.totalClassified
          }
        }
      }
    })

    // Los equipos se asignarán cuando termine la fase de grupos
    // Por ahora creamos matches vacíos que se llenarán después

    let eliminationMatchNumber = 5000 // Empezar en 5000 para diferenciar

    // Primera ronda eliminatoria (Cuartos, Octavos, etc.)
    const firstRoundMatches = Math.pow(2, eliminationRounds - 1)

    for (let i = 0; i < firstRoundMatches; i++) {
      allMatches.push({
        roundNumber: 10, // Ronda 10 = Primera ronda eliminatoria
        matchNumber: eliminationMatchNumber++,
        phaseType: this.getPhaseType(eliminationRounds, 1),
        // Los equipos se asignan cuando termina fase de grupos
        team1Id: undefined,
        team2Id: undefined
      })
    }

    // Rondas eliminatorias siguientes
    for (let round = 2; round <= eliminationRounds; round++) {
      const matchesInRound = Math.pow(2, eliminationRounds - round)

      for (let match = 0; match < matchesInRound; match++) {
        const prevMatch1 = match * 2
        const prevMatch2 = match * 2 + 1

        allMatches.push({
          roundNumber: 10 + round - 1,
          matchNumber: eliminationMatchNumber++,
          phaseType: this.getPhaseType(eliminationRounds, round),
          team1FromMatchId: `R10M${5000 + prevMatch1}`,
          team2FromMatchId: `R10M${5000 + prevMatch2}`
        })
      }
    }

    // Crear todos los matches
    await this.createMatchesWithProgression(tournamentId, categoryId, allMatches)

    console.log(`✅ Fase de grupos generado:`, {
      grupos: createdZones.length,
      partidosGrupos: allMatches.filter(m => m.phaseType === PhaseType.GROUP_STAGE).length,
      partidosEliminatorios: allMatches.filter(m => m.phaseType !== PhaseType.GROUP_STAGE).length,
      totalPartidos: allMatches.length
    })
  }

  /**
   * Distribuye equipos con byes balanceados (byes en la parte superior e inferior)
   */
  private static distributeByes(teams: TeamData[], bracketSize: number): (TeamData | null)[] {
    const result: (TeamData | null)[] = new Array(bracketSize).fill(null)
    const numByes = bracketSize - teams.length

    // Si no hay byes, asignar directamente
    if (numByes === 0) {
      return teams
    }

    // Distribuir equipos con seeds (si los tienen) o por orden de registro
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.seed !== null && b.seed !== null) {
        return a.seed - b.seed
      }
      return 0
    })

    // Asignar equipos evitando byes en posiciones clave
    let teamIndex = 0
    for (let i = 0; i < bracketSize && teamIndex < sortedTeams.length; i++) {
      // Distribuir byes de forma balanceada
      const shouldHaveBye = i < numByes && i % 2 === 0
      if (!shouldHaveBye && teamIndex < sortedTeams.length) {
        result[i] = sortedTeams[teamIndex++]
      }
    }

    return result
  }

  /**
   * Determina el tipo de fase según la ronda
   */
  private static getPhaseType(totalRounds: number, currentRound: number): PhaseType {
    const roundsFromEnd = totalRounds - currentRound

    switch (roundsFromEnd) {
      case 0:
        return PhaseType.FINAL
      case 1:
        return PhaseType.SEMIFINALS
      case 2:
        return PhaseType.QUARTERFINALS
      case 3:
        return PhaseType.ROUND_OF_16
      case 4:
        return PhaseType.ROUND_OF_32
      default:
        return PhaseType.GROUP_STAGE
    }
  }

  /**
   * Crea los matches en la base de datos y resuelve las referencias de progresión
   */
  private static async createMatchesWithProgression(
    tournamentId: string,
    categoryId: string,
    matches: BracketMatch[]
  ): Promise<void> {
    // Mapa para almacenar IDs de matches creados por ronda y número
    const matchIdMap = new Map<string, string>()

    // Ordenar matches por ronda para crear en orden
    const sortedMatches = matches.sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber)

    // Crear matches en orden
    for (const matchData of sortedMatches) {
      const matchKey = `R${matchData.roundNumber}M${matchData.matchNumber}`

      // Resolver referencias a matches previos
      let team1FromMatchId: string | undefined
      let team2FromMatchId: string | undefined

      if (matchData.team1FromMatchId) {
        team1FromMatchId = matchIdMap.get(matchData.team1FromMatchId)
      }

      if (matchData.team2FromMatchId) {
        team2FromMatchId = matchIdMap.get(matchData.team2FromMatchId)
      }

      // Crear match
      const createdMatch = await prisma.match.create({
        data: {
          tournamentId,
          categoryId,
          team1Id: matchData.team1Id,
          team2Id: matchData.team2Id,
          team1FromMatchId,
          team2FromMatchId,
          roundNumber: matchData.roundNumber,
          matchNumber: matchData.matchNumber,
          phaseType: matchData.phaseType,
          status: MatchStatus.SCHEDULED
        }
      })

      // Guardar ID para referencias futuras
      matchIdMap.set(matchKey, createdMatch.id)
    }

    console.log(`✅ ${matches.length} matches creados con progresión automática`)
  }

  /**
   * Progresa el ganador de un match al siguiente match del bracket
   * Y en doble eliminación, también mueve al perdedor al lower bracket
   */
  static async progressWinner(matchId: string, winnerTeamId: string, loserTeamId?: string): Promise<void> {
    // Buscar el match actual
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        nextMatchesTeam1: true,
        nextMatchesTeam2: true,
        tournament: {
          select: {
            type: true
          }
        }
      }
    })

    if (!currentMatch) {
      throw new Error("Match no encontrado")
    }

    // PROGRESIÓN DEL GANADOR
    const nextMatches = [...currentMatch.nextMatchesTeam1, ...currentMatch.nextMatchesTeam2]

    for (const nextMatch of nextMatches) {
      if (nextMatch.team1FromMatchId === matchId) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: { team1Id: winnerTeamId }
        })
        console.log(`✅ Ganador progresado a match ${nextMatch.id} como Team1`)
      } else if (nextMatch.team2FromMatchId === matchId) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: { team2Id: winnerTeamId }
        })
        console.log(`✅ Ganador progresado a match ${nextMatch.id} como Team2`)
      }
    }

    // DOBLE ELIMINACIÓN: Mover perdedor al lower bracket
    if (currentMatch.tournament.type === TournamentType.DOUBLE_ELIMINATION && loserTeamId) {
      // Determinar si el match actual es del upper bracket
      const isUpperBracket = currentMatch.roundNumber !== null && currentMatch.roundNumber < 100

      if (isUpperBracket) {
        await this.progressLoserToLowerBracket(matchId, loserTeamId, currentMatch)
      }
    }
  }

  /**
   * Mueve al perdedor de un match del upper bracket al lower bracket
   * (Solo para doble eliminación)
   */
  private static async progressLoserToLowerBracket(
    upperMatchId: string,
    loserTeamId: string,
    upperMatch: { roundNumber: number | null; tournamentId: string; categoryId: string }
  ): Promise<void> {
    // Buscar el match del lower bracket que está esperando a este perdedor
    // La lógica de emparejamiento es compleja, pero básicamente:
    // - Perdedores de Upper R1 van a Lower R1
    // - Perdedores de Upper R2 van a Lower R2 (ronda par)
    // - etc.

    const upperRound = upperMatch.roundNumber || 1

    // Calcular la ronda del lower bracket correspondiente
    let lowerRound: number
    if (upperRound === 1) {
      lowerRound = 101 // LR1
    } else {
      lowerRound = 100 + (upperRound * 2) // Rondas pares del lower
    }

    // Buscar matches del lower bracket en esa ronda que estén esperando perdedores
    const lowerMatches = await prisma.match.findMany({
      where: {
        tournamentId: upperMatch.tournamentId,
        categoryId: upperMatch.categoryId,
        roundNumber: lowerRound,
        OR: [
          { team1Id: null },
          { team2Id: null }
        ]
      },
      orderBy: {
        matchNumber: 'asc'
      }
    })

    // Asignar al primer match disponible
    if (lowerMatches.length > 0) {
      const targetMatch = lowerMatches[0]

      if (!targetMatch.team1Id) {
        await prisma.match.update({
          where: { id: targetMatch.id },
          data: { team1Id: loserTeamId }
        })
        console.log(`⬇️ Perdedor enviado al lower bracket (match ${targetMatch.id}) como Team1`)
      } else if (!targetMatch.team2Id) {
        await prisma.match.update({
          where: { id: targetMatch.id },
          data: { team2Id: loserTeamId }
        })
        console.log(`⬇️ Perdedor enviado al lower bracket (match ${targetMatch.id}) como Team2`)
      }
    } else {
      console.warn(`⚠️ No se encontró match del lower bracket para recibir al perdedor`)
    }
  }

  /**
   * Obtiene el bracket completo de un torneo/categoría
   */
  static async getBracket(tournamentId: string, categoryId: string) {
    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        categoryId
      },
      include: {
        team1: {
          include: {
            player1: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            player2: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        team2: {
          include: {
            player1: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            player2: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        winnerTeam: {
          select: {
            id: true
          }
        },
        court: {
          select: {
            name: true,
            club: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { roundNumber: 'asc' },
        { matchNumber: 'asc' }
      ]
    })

    // Agrupar por ronda
    const rounds = matches.reduce((acc, match) => {
      const round = match.roundNumber || 0
      if (!acc[round]) {
        acc[round] = []
      }
      acc[round].push(match)
      return acc
    }, {} as Record<number, typeof matches>)

    return {
      matches,
      rounds,
      totalRounds: Object.keys(rounds).length,
      totalMatches: matches.length
    }
  }

  /**
   * Valida que un torneo esté listo para generar bracket
   */
  static async validateBracketGeneration(tournamentId: string, categoryId: string): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: {
          where: { categoryId },
          include: {
            teams: {
              where: {
                registrationStatus: { in: ['CONFIRMED', 'PAID'] }
              }
            }
          }
        }
      }
    })

    if (!tournament) {
      errors.push("Torneo no encontrado")
      return { valid: false, errors }
    }

    const category = tournament.categories[0]
    if (!category) {
      errors.push("Categoría no encontrada en el torneo")
      return { valid: false, errors }
    }

    const teams = category.teams
    if (teams.length < 2) {
      errors.push("Se requieren al menos 2 equipos confirmados")
    }

    if (teams.length < tournament.minParticipants) {
      errors.push(`Se requieren al menos ${tournament.minParticipants} equipos (hay ${teams.length})`)
    }

    // Validar que el torneo esté en estado apropiado
    if (tournament.status === 'DRAFT') {
      errors.push("El torneo debe estar publicado antes de generar el bracket")
    }

    if (tournament.status === 'COMPLETED') {
      errors.push("No se puede regenerar el bracket de un torneo completado")
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Calcula la tabla de posiciones de un grupo
   */
  static async calculateGroupStandings(zoneId: string) {
    // Obtener todos los partidos del grupo
    const zone = await prisma.tournamentZone.findUnique({
      where: { id: zoneId },
      include: {
        teams: {
          include: {
            team: {
              include: {
                player1: { select: { firstName: true, lastName: true } },
                player2: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    })

    if (!zone) {
      throw new Error("Zona no encontrada")
    }

    // Obtener partidos del grupo completados
    const matches = await prisma.match.findMany({
      where: {
        tournamentId: zone.tournamentId,
        categoryId: zone.categoryId,
        phaseType: PhaseType.GROUP_STAGE,
        status: MatchStatus.COMPLETED
      },
      include: {
        team1: true,
        team2: true,
        winnerTeam: true,
        sets: true
      }
    })

    // Calcular estadísticas por equipo
    interface TeamStats {
      teamId: string
      teamName: string
      matchesPlayed: number
      matchesWon: number
      matchesLost: number
      setsWon: number
      setsLost: number
      gamesWon: number
      gamesLost: number
      points: number
    }

    const statsMap = new Map<string, TeamStats>()

    // Inicializar stats para todos los equipos del grupo
    zone.teams.forEach(({ team }) => {
      const teamName = team.name ||
        `${team.player1.firstName} ${team.player1.lastName} / ${team.player2.firstName} ${team.player2.lastName}`

      statsMap.set(team.id, {
        teamId: team.id,
        teamName,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0
      })
    })

    // Filtrar solo matches que involucran equipos de este grupo
    const groupTeamIds = new Set(zone.teams.map(zt => zt.teamId))
    const groupMatches = matches.filter(m =>
      m.team1Id && m.team2Id &&
      groupTeamIds.has(m.team1Id) &&
      groupTeamIds.has(m.team2Id)
    )

    // Procesar cada match
    groupMatches.forEach((match) => {
      if (!match.team1Id || !match.team2Id) return

      const team1Stats = statsMap.get(match.team1Id)!
      const team2Stats = statsMap.get(match.team2Id)!

      // Partidos jugados
      team1Stats.matchesPlayed++
      team2Stats.matchesPlayed++

      // Sets
      team1Stats.setsWon += match.team1SetsWon
      team1Stats.setsLost += match.team2SetsWon
      team2Stats.setsWon += match.team2SetsWon
      team2Stats.setsLost += match.team1SetsWon

      // Games
      match.sets.forEach(set => {
        team1Stats.gamesWon += set.team1Games
        team1Stats.gamesLost += set.team2Games
        team2Stats.gamesWon += set.team2Games
        team2Stats.gamesLost += set.team1Games
      })

      // Victorias y puntos
      if (match.winnerTeamId === match.team1Id) {
        team1Stats.matchesWon++
        team2Stats.matchesLost++
        team1Stats.points += 2 // 2 puntos por victoria
      } else if (match.winnerTeamId === match.team2Id) {
        team2Stats.matchesWon++
        team1Stats.matchesLost++
        team2Stats.points += 2
      }
    })

    // Ordenar por: Puntos → Diferencia sets → Diferencia games → Enfrentamiento directo
    const standings = Array.from(statsMap.values()).sort((a, b) => {
      // 1. Más puntos
      if (b.points !== a.points) return b.points - a.points

      // 2. Mejor diferencia de sets
      const aSetDiff = a.setsWon - a.setsLost
      const bSetDiff = b.setsWon - b.setsLost
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff

      // 3. Mejor diferencia de games
      const aGameDiff = a.gamesWon - a.gamesLost
      const bGameDiff = b.gamesWon - b.gamesLost
      if (bGameDiff !== aGameDiff) return bGameDiff - aGameDiff

      // 4. Más sets ganados
      if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon

      return 0
    })

    // Actualizar posiciones en la base de datos
    for (let i = 0; i < standings.length; i++) {
      await prisma.zoneTeam.update({
        where: {
          zoneId_teamId: {
            zoneId,
            teamId: standings[i].teamId
          }
        },
        data: {
          position: i + 1
        }
      })
    }

    console.log(`✅ Tabla de ${zone.name} calculada`)

    return standings
  }

  /**
   * Clasifica equipos de fase de grupos a fase eliminatoria
   * (Asigna top 2 de cada grupo a los matches eliminatorios)
   */
  static async classifyTeamsToEliminationPhase(tournamentId: string, categoryId: string): Promise<void> {
    // Obtener configuración de grupos guardada en metadata
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { metadata: true }
    })

    interface GroupConfig {
      numGroups: number
      groupSizes: number[]
      qualifiedPerGroup: number
      bestThirdPlace: number
      totalClassified: number
    }

    const metadata = tournament?.metadata as Record<string, GroupConfig> | null
    const groupConfig = metadata?.[`groupConfig_${categoryId}`]

    if (!groupConfig) {
      throw new Error("No se encontró la configuración de grupos. Regenera el bracket.")
    }

    // Obtener todas las zonas del torneo/categoría
    const zones = await prisma.tournamentZone.findMany({
      where: {
        tournamentId,
        categoryId,
        phaseType: PhaseType.GROUP_STAGE
      },
      include: {
        teams: {
          orderBy: {
            position: 'asc'
          },
          include: {
            team: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    if (zones.length === 0) {
      throw new Error("No se encontraron grupos en este torneo")
    }

    // Verificar que todos los grupos tengan posiciones calculadas
    const allTeamsHavePosition = zones.every(zone =>
      zone.teams.every(zt => zt.position !== null)
    )

    if (!allTeamsHavePosition) {
      throw new Error("Debes calcular las tablas de todos los grupos antes de clasificar")
    }

    // Obtener clasificados según configuración
    const classified: Array<{
      teamId: string
      groupName: string
      position: number
      points: number
      setDiff: number
      gameDiff: number
      setsWon: number
    }> = []

    const thirdPlaceTeams: typeof classified = []

    // Clasificar equipos de cada grupo
    for (const zone of zones) {
      // Obtener standings completos para tener stats
      const standings = await this.calculateGroupStandings(zone.id)

      for (let pos = 1; pos <= groupConfig.qualifiedPerGroup; pos++) {
        const team = zone.teams.find(zt => zt.position === pos)
        const stats = standings.find(s => s.teamId === team?.teamId)

        if (team && stats) {
          const classifiedTeam = {
            teamId: team.teamId,
            groupName: zone.name,
            position: pos,
            points: stats.points,
            setDiff: stats.setsWon - stats.setsLost,
            gameDiff: stats.gamesWon - stats.gamesLost,
            setsWon: stats.setsWon
          }

          // Si es tercero y hay mejores terceros, guardarlo aparte
          if (pos === 3 && groupConfig.bestThirdPlace > 0) {
            thirdPlaceTeams.push(classifiedTeam)
          } else {
            classified.push(classifiedTeam)
          }
        }
      }
    }

    // Si hay mejores terceros, ordenarlos y tomar los mejores
    if (groupConfig.bestThirdPlace > 0) {
      // Ordenar terceros por: puntos → diferencia sets → diferencia juegos → sets ganados
      thirdPlaceTeams.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points
        if (a.setDiff !== b.setDiff) return b.setDiff - a.setDiff
        if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff
        return b.setsWon - a.setsWon
      })

      // Agregar mejores terceros a clasificados
      const bestThirds = thirdPlaceTeams.slice(0, groupConfig.bestThirdPlace)
      classified.push(...bestThirds)

      console.log(`📊 Mejores terceros:`, bestThirds.map(t => `${t.groupName}-${t.position} (${t.points}pts)`).join(', '))
    }

    console.log(`📊 Total clasificados: ${classified.length}`,
      classified.map(c => `${c.groupName}-${c.position}`).join(', '))

    // Obtener matches de la fase eliminatoria (roundNumber >= 10)
    const eliminationMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        categoryId,
        roundNumber: { gte: 10 }
      },
      orderBy: [
        { roundNumber: 'asc' },
        { matchNumber: 'asc' }
      ]
    })

    const firstRoundMatches = eliminationMatches.filter(m => m.roundNumber === 10)

    // Asignar clasificados según número de equipos
    await this.assignClassifiedTeamsToPlayoffs(firstRoundMatches, classified, groupConfig.totalClassified)

    console.log(`✅ Equipos clasificados a fase eliminatoria`)
  }

  /**
   * Asigna equipos clasificados a la primera ronda eliminatoria
   * Usa el sistema de seeding estándar (1 vs último, 2 vs penúltimo, etc.)
   */
  private static async assignClassifiedTeamsToPlayoffs(
    matches: Array<{ id: string; matchNumber: number | null }>,
    classified: Array<{ teamId: string; groupName: string; position: number }>,
    totalClassified: number
  ): Promise<void> {
    // Organizar clasificados por grupo y posición para seeding
    const firstPlaces = classified.filter(c => c.position === 1)
    const secondPlaces = classified.filter(c => c.position === 2)
    const thirdPlaces = classified.filter(c => c.position === 3)
    const fourthPlaces = classified.filter(c => c.position === 4)

    // Construir lista de seeds ordenada
    const seeds = [...firstPlaces, ...secondPlaces, ...thirdPlaces, ...fourthPlaces]

    // Emparejamientos según número de clasificados
    // Standard bracket seeding: 1 vs N, 2 vs N-1, 3 vs N-2, etc.
    const pairings: Array<[number, number]> = []

    if (totalClassified === 4) {
      pairings.push([0, 3], [1, 2]) // SF1: 1A vs 2B, SF2: 1B vs 2A
    } else if (totalClassified === 8) {
      pairings.push(
        [0, 7], [1, 6], [2, 5], [3, 4] // QF1: 1 vs 8, QF2: 2 vs 7, etc.
      )
    } else if (totalClassified === 16) {
      pairings.push(
        [0, 15], [1, 14], [2, 13], [3, 12],
        [4, 11], [5, 10], [6, 9], [7, 8]
      )
    } else if (totalClassified === 32) {
      for (let i = 0; i < 16; i++) {
        pairings.push([i, 31 - i])
      }
    }

    // Asignar emparejamientos a matches
    for (let i = 0; i < pairings.length && i < matches.length; i++) {
      const [seed1Idx, seed2Idx] = pairings[i]
      const team1 = seeds[seed1Idx]
      const team2 = seeds[seed2Idx]

      if (team1 && team2) {
        await prisma.match.update({
          where: { id: matches[i].id },
          data: {
            team1Id: team1.teamId,
            team2Id: team2.teamId
          }
        })

        console.log(`✅ Match ${i + 1}: ${team1.groupName}-${team1.position} vs ${team2.groupName}-${team2.position}`)
      }
    }
  }
}
