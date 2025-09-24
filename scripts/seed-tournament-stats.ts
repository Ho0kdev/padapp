import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏆 Seeding tournament stats for points calculation...')

  // Buscar un torneo completado, o crear uno si no existe
  let tournament = await prisma.tournament.findFirst({
    where: { status: 'COMPLETED' },
    include: {
      teams: {
        include: {
          player1: true,
          player2: true
        }
      },
      stats: true
    }
  })

  // Si no hay torneos completados, crear uno de ejemplo
  if (!tournament) {
    console.log('📝 No completed tournaments found, creating a sample tournament...')

    // Obtener usuarios con players
    const players = await prisma.player.findMany({
      include: { user: true },
      take: 8
    })

    if (players.length < 8) {
      console.log('❌ Need at least 8 players to create sample tournament')
      return
    }

    // Obtener primera categoría
    const category = await prisma.category.findFirst({
      where: { isActive: true }
    })

    if (!category) {
      console.log('❌ No active categories found')
      return
    }

    // Crear torneo de ejemplo
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      console.log('❌ No admin user found')
      return
    }

    tournament = await prisma.tournament.create({
      data: {
        name: 'Torneo de Prueba - Puntos Automáticos',
        description: 'Torneo para probar el sistema de cálculo automático de puntos',
        type: 'SINGLE_ELIMINATION',
        status: 'COMPLETED',
        tournamentStart: new Date('2025-01-15'),
        tournamentEnd: new Date('2025-01-16'),
        organizerId: adminUser.id,
        categories: {
          create: {
            categoryId: category.id,
            maxTeams: 8
          }
        }
      },
      include: {
        teams: {
          include: {
            player1: true,
            player2: true
          }
        },
        stats: true
      }
    })

    // Crear equipos
    const teams = []
    for (let i = 0; i < 8; i += 2) {
      if (i + 1 < players.length) {
        const team = await prisma.team.create({
          data: {
            tournamentId: tournament.id,
            categoryId: category.id,
            player1Id: players[i].id,
            player2Id: players[i + 1].id,
            name: `${players[i].firstName} & ${players[i + 1].firstName}`,
            registrationStatus: 'CONFIRMED'
          }
        })
        teams.push(team)
      }
    }

    console.log(`✅ Created sample tournament with ${teams.length} teams`)

    // Refresh tournament data to include teams
    tournament = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: {
        teams: {
          include: {
            player1: true,
            player2: true
          }
        },
        stats: true
      }
    })!
  }

  // Crear o actualizar estadísticas del torneo
  console.log(`📊 Creating tournament stats for: ${tournament.name}`)

  if (!tournament || tournament.teams.length === 0) {
    console.log('❌ Tournament has no teams')
    return
  }

  // Simular estadísticas realistas para cada jugador
  const positions = [1, 2, 3, 4, 5, 6, 7, 8] // Posiciones finales
  const shuffledPositions = positions.sort(() => 0.5 - Math.random())

  let playerIndex = 0
  for (const team of tournament.teams) {
    for (const playerId of [team.player1Id, team.player2Id]) {
      const position = shuffledPositions[playerIndex] || playerIndex + 1

      // Generar estadísticas basadas en la posición
      const matchesPlayed = position <= 2 ? 6 : position <= 4 ? 5 : position <= 8 ? 4 : 3
      const matchesWon = position <= 2 ? 5 : position <= 4 ? 3 : position <= 8 ? 2 : 1
      const setsWon = matchesWon * 2 + Math.floor(Math.random() * 3)
      const setsLost = (matchesPlayed - matchesWon) * 2 + Math.floor(Math.random() * 2)
      const gamesWon = setsWon * 6 + Math.floor(Math.random() * 20)
      const gamesLost = setsLost * 6 + Math.floor(Math.random() * 15)

      // Crear o actualizar estadísticas
      await prisma.tournamentStats.upsert({
        where: {
          tournamentId_playerId: {
            tournamentId: tournament.id,
            playerId
          }
        },
        update: {
          matchesPlayed,
          matchesWon,
          setsWon,
          setsLost,
          gamesWon,
          gamesLost,
          finalPosition: position,
          pointsEarned: 0 // Se calculará automáticamente
        },
        create: {
          tournamentId: tournament.id,
          playerId,
          matchesPlayed,
          matchesWon,
          setsWon,
          setsLost,
          gamesWon,
          gamesLost,
          finalPosition: position,
          pointsEarned: 0 // Se calculará automáticamente
        }
      })

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { firstName: true, lastName: true }
      })

      console.log(`  ✅ ${player?.firstName} ${player?.lastName}: Position ${position}, ${matchesWon}W/${matchesPlayed-matchesWon}L`)
      playerIndex++
    }
  }

  // Mostrar información del torneo
  const finalStats = await prisma.tournamentStats.findMany({
    where: { tournamentId: tournament.id },
    include: {
      player: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { finalPosition: 'asc' }
  })

  console.log(`\n🏁 Tournament "${tournament.name}" ready for points calculation:`)
  console.log(`📋 Tournament ID: ${tournament.id}`)
  console.log(`👥 Players: ${finalStats.length}`)
  console.log(`🏆 Standings:`)

  finalStats.forEach((stat, index) => {
    console.log(`  ${stat.finalPosition}. ${stat.player.firstName} ${stat.player.lastName} (${stat.matchesWon}W-${stat.matchesPlayed - stat.matchesWon}L)`)
  })

  console.log(`\n🚀 Run points calculation with:`)
  console.log(`POST /api/tournaments/${tournament.id}/calculate-points`)
  console.log(`\nOr use the API endpoint to calculate points automatically!`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })