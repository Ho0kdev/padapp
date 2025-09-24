import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏆 Seeding rankings...')

  // Obtener categorías activas
  const categories = await prisma.category.findMany({
    where: { isActive: true }
  })

  if (categories.length === 0) {
    console.log('❌ No hay categorías activas. Primero crea algunas categorías.')
    return
  }

  // Obtener jugadores (usuarios con player)
  const players = await prisma.player.findMany({
    include: {
      user: true
    }
  })

  if (players.length === 0) {
    console.log('❌ No hay jugadores. Primero crea algunos usuarios con perfil de jugador.')
    return
  }

  console.log(`📊 Encontradas ${categories.length} categorías y ${players.length} jugadores`)

  const currentYear = new Date().getFullYear()
  const rankings = []

  // Crear rankings para cada categoría
  for (const category of categories) {
    console.log(`🏷️ Creando rankings para categoría: ${category.name}`)

    // Crear rankings para algunos jugadores en esta categoría
    const shuffledPlayers = players.sort(() => 0.5 - Math.random())
    const playersForCategory = shuffledPlayers.slice(0, Math.min(8, players.length))

    for (let i = 0; i < playersForCategory.length; i++) {
      const player = playersForCategory[i]

      // Verificar si ya existe ranking para este jugador/categoría/año
      const existingRanking = await prisma.playerRanking.findUnique({
        where: {
          playerId_categoryId_seasonYear: {
            playerId: player.id,
            categoryId: category.id,
            seasonYear: currentYear
          }
        }
      })

      if (!existingRanking) {
        // Generar puntos aleatorios pero ordenados (más puntos para los primeros)
        const points = Math.max(100, 1000 - (i * 100) + Math.floor(Math.random() * 200))

        const ranking = await prisma.playerRanking.create({
          data: {
            playerId: player.id,
            categoryId: category.id,
            currentPoints: points,
            seasonYear: currentYear
          }
        })

        rankings.push(ranking)
        console.log(`  ✅ ${player.firstName} ${player.lastName}: ${points} puntos`)
      } else {
        console.log(`  ⚠️ ${player.firstName} ${player.lastName}: ya existe ranking`)
      }
    }
  }

  // También crear algunos rankings para años anteriores
  const previousYears = [currentYear - 1, currentYear - 2]

  for (const year of previousYears) {
    console.log(`📅 Creando algunos rankings para ${year}`)

    // Solo crear rankings para la primera categoría y algunos jugadores
    if (categories.length > 0) {
      const category = categories[0]
      const somePlayersForPrevYear = players.slice(0, 3)

      for (let i = 0; i < somePlayersForPrevYear.length; i++) {
        const player = somePlayersForPrevYear[i]

        const existingRanking = await prisma.playerRanking.findUnique({
          where: {
            playerId_categoryId_seasonYear: {
              playerId: player.id,
              categoryId: category.id,
              seasonYear: year
            }
          }
        })

        if (!existingRanking) {
          const points = Math.max(50, 800 - (i * 150) + Math.floor(Math.random() * 100))

          await prisma.playerRanking.create({
            data: {
              playerId: player.id,
              categoryId: category.id,
              currentPoints: points,
              seasonYear: year
            }
          })

          console.log(`  ✅ ${year}: ${player.firstName} ${player.lastName}: ${points} puntos`)
        }
      }
    }
  }

  console.log(`🎉 Creados ${rankings.length} rankings de prueba para ${currentYear}`)
  console.log(`📊 También creados algunos rankings para años anteriores`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })