// prisma/seeds/index.ts
import { PrismaClient, UserRole, Gender, CourtSurface, CourtStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Nombres y apellidos argentinos comunes para generar usuarios
const maleFirstNames = [
  'Juan', 'Carlos', 'Diego', 'Martín', 'Sebastián', 'Fernando', 'Pablo', 'Alejandro',
  'Miguel', 'Andrés', 'Ricardo', 'Gonzalo', 'Nicolás', 'Tomás', 'Eduardo', 'Javier',
  'Roberto', 'Jorge', 'Luis', 'Mario', 'Emiliano', 'Mateo', 'Santiago', 'Manuel',
  'Francisco', 'Ramiro', 'Facundo', 'Ezequiel', 'Gabriel', 'Rodrigo', 'Daniel', 'Maximiliano',
  'Cristian', 'Federico', 'Gustavo', 'Hernán', 'Ignacio', 'Leonardo', 'Marcos', 'Adrián'
]

const femaleFirstNames = [
  'María', 'Lucía', 'Valentina', 'Sofía', 'Carolina', 'Florencia', 'Camila', 'Victoria',
  'Ana', 'Paula', 'Daniela', 'Gabriela', 'Andrea', 'Natalia', 'Mónica', 'Alejandra',
  'Carmen', 'Isabel', 'Patricia', 'Sandra', 'Laura', 'Cecilia', 'Mariana', 'Silvina',
  'Verónica', 'Lorena', 'Claudia', 'Jimena', 'Romina', 'Melisa', 'Rocío', 'Agustina',
  'Belén', 'Carla', 'Delfina', 'Elena', 'Fernanda', 'Gisela', 'Helena', 'Inés'
]

const lastNames = [
  'Pérez', 'López', 'Rodríguez', 'Gómez', 'Ruiz', 'Silva', 'Torres', 'Castro',
  'Ramírez', 'Morales', 'Herrera', 'Vega', 'Paredes', 'Jiménez', 'Mendoza', 'Aguilar',
  'Sánchez', 'Vargas', 'Ortega', 'Reyes', 'García', 'Fernández', 'Martín', 'Díaz',
  'Ramos', 'Peña', 'Romero', 'Martínez', 'González', 'Cruz', 'Moreno', 'Rivera',
  'Flores', 'Guerrero', 'Núñez', 'Medina', 'Campos', 'Vásquez', 'Lara', 'Ríos',
  'Cabrera', 'Acosta', 'Álvarez', 'Benítez', 'Cáceres', 'Domínguez', 'Escobar', 'Figueroa'
]

function generateEmail(firstName: string, lastName: string, index: number): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@email.com`
}

function generatePhoneNumber(index: number): string {
  const baseArea = 3874 + Math.floor(index / 100)
  const number = (555000 + index).toString().padStart(6, '0')
  return `+54 ${baseArea} ${number.slice(0, 3)}-${number.slice(3)}`
}

function generateBirthDate(yearOfBirth: number): Date {
  return new Date(yearOfBirth, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
}

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  console.log('🗑️ Limpiando datos existentes...')
  await prisma.americanoPoolMatchSet.deleteMany()
  await prisma.americanoPoolMatch.deleteMany()
  await prisma.americanoPoolPlayer.deleteMany()
  await prisma.americanoPool.deleteMany()
  await prisma.americanoGlobalRanking.deleteMany()
  await prisma.matchLog.deleteMany()
  await prisma.teamLog.deleteMany()
  await prisma.registrationLog.deleteMany()
  await prisma.userLog.deleteMany()
  await prisma.rankingLog.deleteMany()
  await prisma.tournamentLog.deleteMany()
  await prisma.clubLog.deleteMany()
  await prisma.courtLog.deleteMany()
  await prisma.categoryLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.tournamentStats.deleteMany()
  await prisma.matchGame.deleteMany()
  await prisma.matchSet.deleteMany()
  await prisma.match.deleteMany()
  await prisma.zoneTeam.deleteMany()
  await prisma.tournamentZone.deleteMany()
  await prisma.registrationPayment.deleteMany()
  await prisma.team.deleteMany()
  await prisma.registration.deleteMany()
  await prisma.tournamentCategory.deleteMany()
  await prisma.tournamentClub.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.playerRanking.deleteMany()
  await prisma.category.deleteMany()
  await prisma.court.deleteMany()
  await prisma.club.deleteMany()
  await prisma.player.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log('🗑️ Datos anteriores limpiados')

  // 1. Crear usuario administrador
  const hashedPassword = await bcrypt.hash('123456', 12)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@padapp.com',
      password: hashedPassword,
      name: 'Administrador Sistema',
      role: UserRole.ADMIN,
      player: {
        create: {
          firstName: 'Administrador',
          lastName: 'Sistema',
          rankingPoints: 0,
        }
      }
    }
  })

  console.log(`👤 Creado usuario administrador`)

  // 2. Crear jugadores masculinos (75 total)
  // - 16 categoría 8va (muy bajo nivel)
  // - 32 categoría 7ma (bajo nivel)
  // - 16 categoría 6ta (nivel medio)
  // - 11 distribuidos en otras categorías (5ta y 4ta)

  const malePlayers = []

  // 16 jugadores 8va (nivel muy bajo) - años 1995-2003
  for (let i = 0; i < 16; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const birthYear = 1995 + Math.floor(Math.random() * 9)

    malePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i),
      gender: Gender.MALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i),
      points: Math.floor(Math.random() * 200) + 100, // 100-300 puntos
      category: '8va'
    })
  }

  // 32 jugadores 7ma (nivel bajo) - años 1990-1998
  for (let i = 16; i < 48; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const birthYear = 1990 + Math.floor(Math.random() * 9)

    malePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i),
      gender: Gender.MALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i),
      points: Math.floor(Math.random() * 300) + 300, // 300-600 puntos
      category: '7ma'
    })
  }

  // 16 jugadores 6ta (nivel medio) - años 1985-1993
  for (let i = 48; i < 64; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const birthYear = 1985 + Math.floor(Math.random() * 9)

    malePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i),
      gender: Gender.MALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i),
      points: Math.floor(Math.random() * 300) + 600, // 600-900 puntos
      category: '6ta'
    })
  }

  // 6 jugadores 5ta (nivel medio-alto) - años 1983-1990
  for (let i = 64; i < 70; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const birthYear = 1983 + Math.floor(Math.random() * 8)

    malePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i),
      gender: Gender.MALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i),
      points: Math.floor(Math.random() * 300) + 900, // 900-1200 puntos
      category: '5ta'
    })
  }

  // 5 jugadores 4ta (nivel alto) - años 1980-1988
  for (let i = 70; i < 75; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const birthYear = 1980 + Math.floor(Math.random() * 9)

    malePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i),
      gender: Gender.MALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i),
      points: Math.floor(Math.random() * 400) + 1200, // 1200-1600 puntos
      category: '4ta'
    })
  }

  console.log(`📝 Preparados 75 jugadores masculinos`)

  // 3. Crear jugadores femeninos (75 total)
  // - 16 categoría 7ma (bajo nivel)
  // - 24 categoría 6ta (nivel medio)
  // - El resto en 5ta (20) y 4ta (15)

  const femalePlayers = []

  // 16 jugadoras 7ma (nivel bajo) - años 1995-2003
  for (let i = 0; i < 16; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length]
    const lastName = lastNames[(i + 10) % lastNames.length]
    const birthYear = 1995 + Math.floor(Math.random() * 9)

    femalePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i + 100),
      gender: Gender.FEMALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i + 100),
      points: Math.floor(Math.random() * 250) + 250, // 250-500 puntos
      category: '7ma'
    })
  }

  // 24 jugadoras 6ta (nivel medio) - años 1990-1998
  for (let i = 16; i < 40; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length]
    const lastName = lastNames[(i + 10) % lastNames.length]
    const birthYear = 1990 + Math.floor(Math.random() * 9)

    femalePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i + 100),
      gender: Gender.FEMALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i + 100),
      points: Math.floor(Math.random() * 300) + 500, // 500-800 puntos
      category: '6ta'
    })
  }

  // 20 jugadoras 5ta (nivel medio-alto) - años 1988-1995
  for (let i = 40; i < 60; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length]
    const lastName = lastNames[(i + 10) % lastNames.length]
    const birthYear = 1988 + Math.floor(Math.random() * 8)

    femalePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i + 100),
      gender: Gender.FEMALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i + 100),
      points: Math.floor(Math.random() * 300) + 800, // 800-1100 puntos
      category: '5ta'
    })
  }

  // 15 jugadoras 4ta (nivel alto) - años 1985-1992
  for (let i = 60; i < 75; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length]
    const lastName = lastNames[(i + 10) % lastNames.length]
    const birthYear = 1985 + Math.floor(Math.random() * 8)

    femalePlayers.push({
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, i + 100),
      gender: Gender.FEMALE,
      birthYear,
      birthDate: generateBirthDate(birthYear),
      phone: generatePhoneNumber(i + 100),
      points: Math.floor(Math.random() * 400) + 1100, // 1100-1500 puntos
      category: '4ta'
    })
  }

  console.log(`📝 Preparadas 75 jugadoras femeninas`)

  // 4. Crear todos los usuarios en la base de datos
  const allPlayersData = [...malePlayers, ...femalePlayers]
  const createdPlayers = []

  for (const playerData of allPlayersData) {
    const user = await prisma.user.create({
      data: {
        email: playerData.email,
        password: hashedPassword,
        name: `${playerData.firstName} ${playerData.lastName}`,
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: playerData.firstName,
            lastName: playerData.lastName,
            phone: playerData.phone,
            dateOfBirth: playerData.birthDate,
            gender: playerData.gender,
            rankingPoints: playerData.points,
          }
        }
      },
      include: {
        player: true
      }
    })
    createdPlayers.push({ user, playerData })
  }

  console.log(`👥 Creados 150 jugadores (75 masculinos, 75 femeninos)`)

  // 5. Crear clubes con datos reales de la base de datos
  const clubs = []

  // Padel NOA
  const padelNoa = await prisma.club.create({
    data: {
      name: 'Padel NOA',
      description: 'Club Padel NOA',
      address: 'España 1651',
      city: 'Salta',
      state: 'Salta',
      country: 'Argentina',
      postalCode: '4400',
      phone: '+543876125650',
      email: 'padel.noa@padapp.com',
      latitude: -24.7875941,
      longitude: -65.428035817,
      status: 'ACTIVE',
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpa7z-HkYe0eZz6vLW9s1Pdl7pjOHgOw0HSw&s',
      courts: {
        create: [
          {
            name: 'Cancha 1',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 10000,
            notes: 'Pared Mixta: Concreto/Cristal',
            hasConcreteWall: true,
            hasNet4m: true,
            hasPanoramicGlass: true,
            isOutdoor: false,
          },
          {
            name: 'Cancha 2',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 10000,
            hasConcreteWall: true,
            hasNet4m: true,
            hasPanoramicGlass: false,
            isOutdoor: false,
          }
        ]
      }
    }
  })
  clubs.push(padelNoa)

  // Ciudad Padel
  const ciudadPadel = await prisma.club.create({
    data: {
      name: 'Ciudad Padel',
      description: 'Club de pádel en el centro de Salta',
      address: 'San Juan 2045',
      city: 'Salta',
      state: 'Salta',
      country: 'Argentina',
      postalCode: '4400',
      phone: '+543874000000',
      email: 'ciudad.padel@padapp.com',
      website: 'https://www.padapp.com',
      latitude: -24.7947983,
      longitude: -65.433748217,
      status: 'ACTIVE',
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLO3OWx2MCmD3hCb8yJbAMoEifF211clCUww&s',
      courts: {
        create: [
          {
            name: 'Cancha 1',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 11500,
            hasConcreteWall: false,
            hasNet4m: true,
            hasPanoramicGlass: true,
            isOutdoor: false,
          },
          {
            name: 'Cancha 2',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 11500,
            hasConcreteWall: false,
            hasNet4m: true,
            hasPanoramicGlass: true,
            isOutdoor: false,
          },
          {
            name: 'Cancha 3',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 11500,
            hasConcreteWall: false,
            hasNet4m: true,
            hasPanoramicGlass: true,
            isOutdoor: false,
          },
          {
            name: 'Cancha 4',
            surface: CourtSurface.CONCRETE,
            hasLighting: true,
            hasRoof: true,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 11000,
            hasConcreteWall: true,
            hasNet4m: true,
            hasPanoramicGlass: false,
            isOutdoor: false,
          }
        ]
      }
    }
  })
  clubs.push(ciudadPadel)

  // Pipo Padel
  const pipoPadel = await prisma.club.create({
    data: {
      name: 'Pipo Padel',
      description: 'Club accesible en Salta',
      address: 'Av. Asunción 1650',
      city: 'Salta',
      state: 'Salta',
      country: 'Argentina',
      postalCode: '4400',
      phone: '+543874555666',
      email: 'pipo.padel@padapp.com',
      latitude: -24.7995751,
      longitude: -65.391268417,
      status: 'ACTIVE',
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcZK0j1HxIqKU05jmp_G-nlhNtbYtBQp9eZA&s',
      courts: {
        create: [
          {
            name: 'Cancha 1',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: false,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 9800,
            notes: 'Cesped Rojo',
            hasConcreteWall: true,
            hasNet4m: true,
            hasPanoramicGlass: false,
            isOutdoor: false,
          },
          {
            name: 'Cancha 2',
            surface: CourtSurface.ARTIFICIAL_GRASS,
            hasLighting: true,
            hasRoof: false,
            status: CourtStatus.AVAILABLE,
            hourlyRate: 9800,
            notes: 'Cesped Rojo',
            hasConcreteWall: true,
            hasNet4m: true,
            hasPanoramicGlass: false,
            isOutdoor: false,
          }
        ]
      }
    }
  })
  clubs.push(pipoPadel)

  console.log(`🏟️  Creados ${clubs.length} clubes con sus canchas`)

  // 6. Crear categorías con datos reales
  const categories = []

  // Categorías Femeninas
  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino 4ta',
        description: 'Categoría femenina 4ta división',
        type: 'SKILL',
        level: 4,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino 5ta',
        description: 'Categoría femenina 5ta división',
        type: 'SKILL',
        level: 5,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino 6ta',
        description: 'Categoría femenina 6ta división',
        type: 'SKILL',
        level: 6,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino 7ma',
        description: 'Categoría femenina 7ma división',
        type: 'SKILL',
        level: 7,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino 8va',
        description: 'Categoría femenina 8va división',
        type: 'SKILL',
        level: 8,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino A',
        description: 'Categoría femenina nivel avanzado',
        type: 'SKILL',
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Femenino B',
        description: 'Categoría femenina nivel intermedio',
        type: 'SKILL',
        level: 5,
        genderRestriction: Gender.FEMALE,
        isActive: true,
      }
    })
  )

  // Categorías Masculinas
  categories.push(
    await prisma.category.create({
      data: {
        name: 'Caballeros 4ta',
        description: 'Categoría masculina 4ta división',
        type: 'SKILL',
        level: 4,
        genderRestriction: Gender.MALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Caballeros 5ta',
        description: 'Categoría masculina 5ta división',
        type: 'SKILL',
        level: 5,
        genderRestriction: Gender.MALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Caballeros 6ta',
        description: 'Categoría masculina 6ta división',
        type: 'SKILL',
        level: 6,
        genderRestriction: Gender.MALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Caballeros 7ma',
        description: 'Categoría masculina 7ma división',
        type: 'SKILL',
        level: 7,
        genderRestriction: Gender.MALE,
        isActive: true,
      }
    })
  )

  categories.push(
    await prisma.category.create({
      data: {
        name: 'Caballeros 8va',
        description: 'Categoría masculina 8va división',
        type: 'SKILL',
        level: 8,
        genderRestriction: Gender.MALE,
        isActive: true,
      }
    })
  )

  console.log(`🏷️  Creadas ${categories.length} categorías`)

  // 7. Crear rankings para los jugadores según sus categorías
  const currentYear = new Date().getFullYear()

  let rankingsCreated = 0
  for (const { user, playerData } of createdPlayers) {
    const player = user.player

    if (!player) continue

    // Asignar categoría según el nivel del jugador
    const categoryName = player.gender === Gender.MALE
      ? `Caballeros ${playerData.category}`
      : `Femenino ${playerData.category}`

    const category = categories.find(c => c.name === categoryName)

    if (category) {
      // Crear ranking del jugador
      await prisma.playerRanking.create({
        data: {
          playerId: player.id,
          categoryId: category.id,
          currentPoints: player.rankingPoints,
          seasonYear: currentYear,
        }
      })

      // Actualizar el jugador con su categoría principal
      await prisma.player.update({
        where: { id: player.id },
        data: { primaryCategoryId: category.id }
      })

      rankingsCreated++
    }
  }

  console.log(`📊 Creados ${rankingsCreated} rankings para jugadores`)

  console.log('✅ Seed completado exitosamente!')
  console.log('\n📋 Resumen de datos creados:')
  console.log(`   • 1 administrador + 150 jugadores (75 masculinos, 75 femeninos)`)
  console.log(`   • ${clubs.length} clubes con sus canchas`)
  console.log(`   • ${categories.length} categorías`)
  console.log(`   • ${rankingsCreated} rankings`)
  console.log('\n👥 Distribución de jugadores masculinos:')
  console.log('   • 16 jugadores en 8va categoría (100-300 pts)')
  console.log('   • 32 jugadores en 7ma categoría (300-600 pts)')
  console.log('   • 16 jugadores en 6ta categoría (600-900 pts)')
  console.log('   • 6 jugadores en 5ta categoría (900-1200 pts)')
  console.log('   • 5 jugadores en 4ta categoría (1200-1600 pts)')
  console.log('\n👥 Distribución de jugadoras femeninas:')
  console.log('   • 16 jugadoras en 7ma categoría (250-500 pts)')
  console.log('   • 24 jugadoras en 6ta categoría (500-800 pts)')
  console.log('   • 20 jugadoras en 5ta categoría (800-1100 pts)')
  console.log('   • 15 jugadoras en 4ta categoría (1100-1500 pts)')
  console.log('\n🏟️ Clubes incluidos:')
  console.log('   • Padel NOA (2 canchas)')
  console.log('   • Ciudad Padel (4 canchas)')
  console.log('   • Pipo Padel (2 canchas)')
  console.log('\n🔑 Credenciales de prueba:')
  console.log('   Admin: admin@padapp.com / 123456')
  console.log('   Jugadores: [nombre].[apellido][numero]@email.com / 123456')
  console.log('   (Todos los usuarios tienen contraseña: 123456)')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
