// prisma/seeds/index.ts
import { PrismaClient, UserRole, Gender, CourtSurface, CourtStatus, TournamentType, TournamentStatus, CategoryType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes para evitar conflictos
  console.log('🗑️ Limpiando datos existentes...')
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
  await prisma.teamPayment.deleteMany()
  await prisma.team.deleteMany()
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

  // Base de datos limpia y lista
  console.log('📂 Base de datos lista para seeding')

  // 1. Crear usuarios y jugadores
  const hashedPassword = await bcrypt.hash('123456', 12)

  // Admin principal
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

  // Jugadores de ejemplo - 40 usuarios variados
  const playersData = [
    // Hombres nivel alto (1200-1600 pts)
    { firstName: 'Juan', lastName: 'Pérez', email: 'juan.perez@email.com', gender: Gender.MALE, birthYear: 1990, points: 1250 },
    { firstName: 'Carlos', lastName: 'López', email: 'carlos.lopez@email.com', gender: Gender.MALE, birthYear: 1985, points: 1420 },
    { firstName: 'Diego', lastName: 'Rodríguez', email: 'diego.rodriguez@email.com', gender: Gender.MALE, birthYear: 1987, points: 1320 },
    { firstName: 'Martín', lastName: 'Gómez', email: 'martin.gomez@email.com', gender: Gender.MALE, birthYear: 1988, points: 1380 },
    { firstName: 'Sebastián', lastName: 'Ruiz', email: 'sebastian.ruiz@email.com', gender: Gender.MALE, birthYear: 1992, points: 1290 },
    { firstName: 'Fernando', lastName: 'Silva', email: 'fernando.silva@email.com', gender: Gender.MALE, birthYear: 1986, points: 1350 },
    { firstName: 'Pablo', lastName: 'Torres', email: 'pablo.torres@email.com', gender: Gender.MALE, birthYear: 1991, points: 1240 },
    { firstName: 'Alejandro', lastName: 'Castro', email: 'alejandro.castro@email.com', gender: Gender.MALE, birthYear: 1989, points: 1410 },

    // Hombres nivel medio (800-1199 pts)
    { firstName: 'Miguel', lastName: 'Ramírez', email: 'miguel.ramirez@email.com', gender: Gender.MALE, birthYear: 1993, points: 950 },
    { firstName: 'Andrés', lastName: 'Morales', email: 'andres.morales@email.com', gender: Gender.MALE, birthYear: 1984, points: 1050 },
    { firstName: 'Ricardo', lastName: 'Herrera', email: 'ricardo.herrera@email.com', gender: Gender.MALE, birthYear: 1995, points: 890 },
    { firstName: 'Gonzalo', lastName: 'Vega', email: 'gonzalo.vega@email.com', gender: Gender.MALE, birthYear: 1987, points: 1120 },
    { firstName: 'Nicolás', lastName: 'Paredes', email: 'nicolas.paredes@email.com', gender: Gender.MALE, birthYear: 1990, points: 1080 },
    { firstName: 'Tomás', lastName: 'Jiménez', email: 'tomas.jimenez@email.com', gender: Gender.MALE, birthYear: 1994, points: 950 },
    { firstName: 'Eduardo', lastName: 'Mendoza', email: 'eduardo.mendoza@email.com', gender: Gender.MALE, birthYear: 1983, points: 1150 },
    { firstName: 'Javier', lastName: 'Aguilar', email: 'javier.aguilar@email.com', gender: Gender.MALE, birthYear: 1996, points: 820 },

    // Hombres veteranos (+45)
    { firstName: 'Roberto', lastName: 'Sánchez', email: 'roberto.sanchez@email.com', gender: Gender.MALE, birthYear: 1975, points: 1100 },
    { firstName: 'Jorge', lastName: 'Vargas', email: 'jorge.vargas@email.com', gender: Gender.MALE, birthYear: 1978, points: 980 },
    { firstName: 'Luis', lastName: 'Ortega', email: 'luis.ortega@email.com', gender: Gender.MALE, birthYear: 1973, points: 1250 },
    { firstName: 'Mario', lastName: 'Reyes', email: 'mario.reyes@email.com', gender: Gender.MALE, birthYear: 1976, points: 1050 },

    // Mujeres nivel alto (1000+ pts)
    { firstName: 'María', lastName: 'García', email: 'maria.garcia@email.com', gender: Gender.FEMALE, birthYear: 1988, points: 1180 },
    { firstName: 'Lucía', lastName: 'Fernández', email: 'lucia.fernandez@email.com', gender: Gender.FEMALE, birthYear: 1991, points: 1150 },
    { firstName: 'Valentina', lastName: 'López', email: 'valentina.lopez@email.com', gender: Gender.FEMALE, birthYear: 1989, points: 1220 },
    { firstName: 'Sofía', lastName: 'Martín', email: 'sofia.martin@email.com', gender: Gender.FEMALE, birthYear: 1990, points: 1080 },
    { firstName: 'Carolina', lastName: 'Díaz', email: 'carolina.diaz@email.com', gender: Gender.FEMALE, birthYear: 1987, points: 1340 },
    { firstName: 'Florencia', lastName: 'Ramos', email: 'florencia.ramos@email.com', gender: Gender.FEMALE, birthYear: 1992, points: 1120 },
    { firstName: 'Camila', lastName: 'Peña', email: 'camila.pena@email.com', gender: Gender.FEMALE, birthYear: 1985, points: 1280 },
    { firstName: 'Victoria', lastName: 'Romero', email: 'victoria.romero@email.com', gender: Gender.FEMALE, birthYear: 1993, points: 1050 },

    // Mujeres nivel medio (600-999 pts)
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana.martinez@email.com', gender: Gender.FEMALE, birthYear: 1992, points: 980 },
    { firstName: 'Paula', lastName: 'González', email: 'paula.gonzalez@email.com', gender: Gender.FEMALE, birthYear: 1994, points: 750 },
    { firstName: 'Daniela', lastName: 'Cruz', email: 'daniela.cruz@email.com', gender: Gender.FEMALE, birthYear: 1990, points: 820 },
    { firstName: 'Gabriela', lastName: 'Moreno', email: 'gabriela.moreno@email.com', gender: Gender.FEMALE, birthYear: 1995, points: 680 },
    { firstName: 'Andrea', lastName: 'Rivera', email: 'andrea.rivera@email.com', gender: Gender.FEMALE, birthYear: 1986, points: 920 },
    { firstName: 'Natalia', lastName: 'Flores', email: 'natalia.flores@email.com', gender: Gender.FEMALE, birthYear: 1989, points: 850 },
    { firstName: 'Mónica', lastName: 'Guerrero', email: 'monica.guerrero@email.com', gender: Gender.FEMALE, birthYear: 1991, points: 780 },
    { firstName: 'Alejandra', lastName: 'Núñez', email: 'alejandra.nunez@email.com', gender: Gender.FEMALE, birthYear: 1993, points: 940 },

    // Mujeres veteranas
    { firstName: 'Carmen', lastName: 'Medina', email: 'carmen.medina@email.com', gender: Gender.FEMALE, birthYear: 1977, points: 900 },
    { firstName: 'Isabel', lastName: 'Campos', email: 'isabel.campos@email.com', gender: Gender.FEMALE, birthYear: 1974, points: 1100 },
    { firstName: 'Patricia', lastName: 'Vásquez', email: 'patricia.vasquez@email.com', gender: Gender.FEMALE, birthYear: 1979, points: 850 },
    { firstName: 'Sandra', lastName: 'Lara', email: 'sandra.lara@email.com', gender: Gender.FEMALE, birthYear: 1976, points: 980 },

    // Jugadores jóvenes mixtos
    { firstName: 'Emiliano', lastName: 'Ríos', email: 'emiliano.rios@email.com', gender: Gender.MALE, birthYear: 1997, points: 850 },
    { firstName: 'Mateo', lastName: 'Cabrera', email: 'mateo.cabrera@email.com', gender: Gender.MALE, birthYear: 1998, points: 720 }
  ]

  const players = await Promise.all(
    playersData.map(async (playerData, index) => {
      const phoneNumber = `+54 9 11 ${(1000 + index).toString().padStart(4, '0')}-${(5000 + index).toString().padStart(4, '0')}`
      const birthDate = new Date(playerData.birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)

      return prisma.user.create({
        data: {
          email: playerData.email,
          password: hashedPassword,
          name: `${playerData.firstName} ${playerData.lastName}`,
          role: UserRole.PLAYER,
          player: {
            create: {
              firstName: playerData.firstName,
              lastName: playerData.lastName,
              phone: phoneNumber,
              dateOfBirth: birthDate,
              gender: playerData.gender,
              rankingPoints: playerData.points,
            }
          }
        }
      })
    })
  )

  console.log(`👥 Creados ${players.length + 1} usuarios (incluyendo admin)`)

  // 2. Crear clubes y canchas - basado en datos reales de la DB
  const clubs = await Promise.all([
    prisma.club.create({
      data: {
        name: 'Ciudad Padel',
        description: 'Club de pádel en el centro de Salta',
        address: 'San Juan 2045',
        city: 'Salta',
        country: 'Argentina',
        postalCode: '4400',
        phone: '+543874000000',
        email: 'info@ciudadpadel.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            },
            {
              name: 'Cancha 3',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            },
            {
              name: 'Cancha 4',
              surface: CourtSurface.CONCRETE,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: false,
              hourlyRate: 9999,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Ohana Club Salta',
        description: 'Club premium en Villa San Lorenzo',
        address: 'Manuel Castilla 578',
        city: 'Villa San Lorenzo',
        country: 'Argentina',
        postalCode: '4401',
        phone: '+543874874040',
        email: 'contacto@ohanaclub.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 15000,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 15000,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Padel NOA',
        description: 'Club tradicional de Salta',
        address: 'España 1651',
        city: 'Salta',
        country: 'Argentina',
        postalCode: '4400',
        phone: '+543876125650',
        email: 'info@padelnoa.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: false,
              hourlyRate: 9999,
              status: CourtStatus.UNAVAILABLE,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: false,
              hourlyRate: 9999,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Pipo Padel',
        description: 'Club accesible en Salta',
        address: 'Av Asuncion 1650',
        city: 'Salta',
        country: 'Argentina',
        postalCode: '4400',
        phone: '+543874555666',
        email: 'info@pipopadel.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: false,
              hasPanoramicGlass: true,
              hourlyRate: 11000,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 11000,
            },
            {
              name: 'Cancha 3',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hasPanoramicGlass: true,
              hourlyRate: 11000,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Verbum Camp Padel',
        description: 'Complejo deportivo en Villa San Lorenzo',
        address: 'Au. Circunvalacion Oeste',
        city: 'Villa San Lorenzo',
        country: 'Argentina',
        postalCode: '4401',
        phone: '+543875292270',
        email: 'info@verbumcamp.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: false,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: false,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            },
            {
              name: 'Cancha 3',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: false,
              hasPanoramicGlass: true,
              hourlyRate: 12000,
            }
          ]
        }
      }
    })
  ])

  console.log(`🏟️  Creados ${clubs.length} clubes con sus canchas`)

  // 3. Crear categorías - basado en datos reales de la DB
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Femenino 4ta',
        description: 'Categoría femenina 4ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino 5ta',
        description: 'Categoría femenina 5ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino 6ta',
        description: 'Categoría femenina 6ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino 7ma',
        description: 'Categoría femenina 7ma división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino 8va',
        description: 'Categoría femenina 8va división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino A',
        description: 'CAT A FEM.',
        type: CategoryType.SKILL,
        minRankingPoints: 501,
        maxRankingPoints: 1000,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino B',
        description: 'CAT B FEM.',
        type: CategoryType.SKILL,
        minRankingPoints: 1,
        maxRankingPoints: 500,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino Suma 15',
        description: 'Suma 15 ( 8va + 7ma)',
        type: CategoryType.SKILL,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 3ra',
        description: 'Categoría masculina 3ra división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino +45',
        description: 'Categoría para jugadores mayores de 45 años',
        type: CategoryType.AGE,
        minAge: 45,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 4ta',
        description: 'Categoría masculina 4ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 5ta',
        description: 'Categoría masculina 5ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 6ta',
        description: 'Categoría masculina 6ta división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 7ma',
        description: 'Categoría masculina 7ma división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino 8va',
        description: 'Categoría masculina 8va división',
        type: CategoryType.GENDER,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino A',
        description: 'Categoría masculina nivel avanzado',
        type: CategoryType.SKILL,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino B',
        description: 'Categoría masculina nivel intermedio',
        type: CategoryType.SKILL,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Mixto Suma 15',
        description: 'Mixto (8va y 7ma)',
        type: CategoryType.SKILL,
        genderRestriction: Gender.MIXED,
      }
    })
  ])

  console.log(`🏷️  Creadas ${categories.length} categorías`)

  // 4. Crear rankings para jugadores
  const currentYear = new Date().getFullYear()
  const allPlayers = await prisma.player.findMany()

  for (const player of allPlayers) {
    if (player.firstName === 'Administrador') continue // Skip admin

    // Determinar categorías apropiadas según género y puntos
    const applicableCategories = categories.filter(cat => {
      const genderMatch = cat.genderRestriction === player.gender || cat.genderRestriction === Gender.MIXED
      const pointsMatch = (!cat.minRankingPoints || player.rankingPoints >= cat.minRankingPoints) &&
                         (!cat.maxRankingPoints || player.rankingPoints <= cat.maxRankingPoints)
      return genderMatch && pointsMatch
    })

    for (const category of applicableCategories) {
      await prisma.playerRanking.create({
        data: {
          playerId: player.id,
          categoryId: category.id,
          currentPoints: player.rankingPoints,
          seasonYear: currentYear,
        }
      })
    }
  }

  console.log('📊 Rankings creados para todos los jugadores')

  // 4.1. Crear rankings adicionales para años anteriores (integrado desde seed-rankings.ts)
  const previousYears = [currentYear - 1, currentYear - 2]

  for (const year of previousYears) {
    console.log(`📅 Creando algunos rankings para ${year}`)

    // Solo crear rankings para algunas categorías y algunos jugadores
    const someCategories = categories.slice(0, 3)
    const somePlayersForPrevYear = allPlayers.slice(0, 5)

    for (const category of someCategories) {
      for (let i = 0; i < somePlayersForPrevYear.length; i++) {
        const player = somePlayersForPrevYear[i]

        // Skip admin
        if (player.firstName === 'Administrador') continue

        // Verificar si ya existe ranking
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

          console.log(`  ✅ ${year}: ${player.firstName} ${player.lastName}: ${points} puntos en ${category.name}`)
        }
      }
    }
  }

  console.log('📊 Rankings históricos creados')

  // 5. Crear torneos - basado en datos reales de la DB
  const tournaments = []

  // Torneo 1: We Need Padel OCT-25 (ACTIVO)
  const weFemeninoACat = categories.find(c => c.name === 'Femenino A')
  const weFemeninoBCat = categories.find(c => c.name === 'Femenino B')
  const ciudadPadelClub = clubs.find(c => c.name === 'Ciudad Padel')

  if (weFemeninoACat && weFemeninoBCat && ciudadPadelClub) {
    const weNeedPadel = await prisma.tournament.create({
      data: {
        name: 'We Need Padel OCT-25',
        description: 'Torneo Femenino CAT A y B.',
        type: TournamentType.GROUP_STAGE_ELIMINATION,
        status: TournamentStatus.REGISTRATION_OPEN,
        registrationStart: new Date('2025-09-22T23:07:23.005Z'),
        registrationEnd: new Date('2025-09-30T03:00:00.000Z'),
        tournamentStart: new Date('2025-10-01T03:00:00.000Z'),
        tournamentEnd: new Date('2025-10-05T03:00:00.000Z'),
        maxParticipants: 60,
        registrationFee: 30000,
        prizePool: 80000,
        rankingPoints: 1000,
        organizerId: adminUser.id,
        mainClubId: ciudadPadelClub.id,
        categories: {
          create: [
            { categoryId: weFemeninoACat.id },
            { categoryId: weFemeninoBCat.id }
          ]
        },
        clubs: {
          create: [
            { clubId: ciudadPadelClub.id }
          ]
        }
      }
    })
    tournaments.push(weNeedPadel)
  }

  // Torneo 2: Padel Noa OCT-25
  const masc7maCat = categories.find(c => c.name === 'Masculino 7ma')
  const padelNoaClub = clubs.find(c => c.name === 'Padel NOA')

  if (masc7maCat && padelNoaClub) {
    const padelNoa = await prisma.tournament.create({
      data: {
        name: 'Padel Noa OCT-25',
        description: 'Torneo a desarrollarse los miercoles del mes de octubre',
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.DRAFT,
        registrationStart: new Date('2025-09-23T03:00:00.000Z'),
        registrationEnd: new Date('2025-09-30T03:00:00.000Z'),
        tournamentStart: new Date('2025-10-01T03:00:00.000Z'),
        tournamentEnd: new Date('2025-10-31T03:00:00.000Z'),
        maxParticipants: 10,
        registrationFee: 3000,
        prizePool: 12000,
        rankingPoints: 500,
        organizerId: adminUser.id,
        mainClubId: padelNoaClub.id,
        categories: {
          create: [
            { categoryId: masc7maCat.id }
          ]
        },
        clubs: {
          create: [
            { clubId: padelNoaClub.id }
          ]
        }
      }
    })
    tournaments.push(padelNoa)
  }

  // Torneo 3: Encuentro de Padel
  const femSuma15Cat = categories.find(c => c.name === 'Femenino Suma 15')
  const pipoPadelClub = clubs.find(c => c.name === 'Pipo Padel')

  if (femSuma15Cat && pipoPadelClub) {
    const encuentroPadel = await prisma.tournament.create({
      data: {
        name: 'Encuentro de Padel',
        description: 'DAMAS - Suma 15.\nCategorias 7ma y 8va',
        type: TournamentType.GROUP_STAGE_ELIMINATION,
        status: TournamentStatus.DRAFT,
        registrationStart: new Date('2025-09-23T16:24:10.362Z'),
        registrationEnd: new Date('2025-09-26T03:00:00.000Z'),
        tournamentStart: new Date('2025-09-27T03:00:00.000Z'),
        tournamentEnd: new Date('2025-09-27T03:00:00.000Z'),
        registrationFee: 20000,
        rankingPoints: 250,
        organizerId: adminUser.id,
        mainClubId: pipoPadelClub.id,
        categories: {
          create: [
            { categoryId: femSuma15Cat.id }
          ]
        },
        clubs: {
          create: [
            { clubId: pipoPadelClub.id }
          ]
        }
      }
    })
    tournaments.push(encuentroPadel)
  }

  // Crear algunos equipos de ejemplo para el torneo activo
  if (tournaments.length > 0) {
    const activeTournament = tournaments.find(t => t.status === TournamentStatus.REGISTRATION_OPEN)
    if (activeTournament) {
      const femalePlayersA = allPlayers.filter(p =>
        p.gender === Gender.FEMALE && p.rankingPoints >= 501 && p.rankingPoints <= 1000
      )
      const femalePlayersB = allPlayers.filter(p =>
        p.gender === Gender.FEMALE && p.rankingPoints >= 1 && p.rankingPoints <= 500
      )

      // Crear equipos para categoría A
      if (femalePlayersA.length >= 4 && weFemeninoACat) {
        await prisma.team.create({
          data: {
            tournamentId: activeTournament.id,
            categoryId: weFemeninoACat.id,
            name: 'Power Queens',
            player1Id: femalePlayersA[0].id,
            player2Id: femalePlayersA[1].id,
            registrationStatus: 'PAID',
            payments: {
              create: {
                amount: 30000,
                paymentStatus: 'PAID',
                paymentMethod: 'transferencia',
                paidAt: new Date(),
              }
            }
          }
        })

        await prisma.team.create({
          data: {
            tournamentId: activeTournament.id,
            categoryId: weFemeninoACat.id,
            name: 'Las Invencibles',
            player1Id: femalePlayersA[2].id,
            player2Id: femalePlayersA[3].id,
            registrationStatus: 'CONFIRMED',
          }
        })
      }

      // Crear equipos para categoría B
      if (femalePlayersB.length >= 2 && weFemeninoBCat) {
        await prisma.team.create({
          data: {
            tournamentId: activeTournament.id,
            categoryId: weFemeninoBCat.id,
            name: 'Nuevas Promesas',
            player1Id: femalePlayersB[0].id,
            player2Id: femalePlayersB[1].id,
            registrationStatus: 'CONFIRMED',
          }
        })
      }
    }
  }

  console.log(`🏆 Creados ${tournaments.length} torneos con equipos de ejemplo`)

  // 5.1. Crear estadísticas de torneo de ejemplo (integrado desde seed-tournament-stats.ts)
  if (tournaments.length > 0) {
    const completedTournaments = tournaments.filter(t => t.status === TournamentStatus.COMPLETED)

    // Si no hay torneos completados, crear uno para las estadísticas
    if (completedTournaments.length === 0) {
      console.log('📊 Creando torneo de ejemplo con estadísticas...')

      // Crear torneo completado para estadísticas
      const statsCategory = categories.find(c => c.name === 'Masculino 5ta')
      const statsClub = clubs[0] // Usar primer club

      if (statsCategory && statsClub && allPlayers.length >= 8) {
        const statsTournament = await prisma.tournament.create({
          data: {
            name: 'Torneo de Prueba - Estadísticas Automáticas',
            description: 'Torneo para probar el sistema de cálculo automático de puntos',
            type: TournamentType.SINGLE_ELIMINATION,
            status: TournamentStatus.COMPLETED,
            tournamentStart: new Date('2025-01-15'),
            tournamentEnd: new Date('2025-01-16'),
            rankingPoints: 750,
            organizerId: adminUser.id,
            mainClubId: statsClub.id,
            categories: {
              create: {
                categoryId: statsCategory.id,
                maxTeams: 8
              }
            }
          }
        })

        // Crear equipos para este torneo
        const malePlayersForStats = allPlayers.filter(p =>
          p.gender === Gender.MALE && p.firstName !== 'Administrador'
        ).slice(0, 8)

        const teams = []
        for (let i = 0; i < 8; i += 2) {
          if (i + 1 < malePlayersForStats.length) {
            const team = await prisma.team.create({
              data: {
                tournamentId: statsTournament.id,
                categoryId: statsCategory.id,
                player1Id: malePlayersForStats[i].id,
                player2Id: malePlayersForStats[i + 1].id,
                name: `${malePlayersForStats[i].firstName} & ${malePlayersForStats[i + 1].firstName}`,
                registrationStatus: 'CONFIRMED'
              }
            })
            teams.push(team)
          }
        }

        // Crear estadísticas del torneo
        const positions = [1, 2, 3, 4, 5, 6, 7, 8]
        const shuffledPositions = positions.sort(() => 0.5 - Math.random())

        let playerIndex = 0
        for (const team of teams) {
          for (const playerId of [team.player1Id, team.player2Id]) {
            const position = shuffledPositions[playerIndex] || playerIndex + 1

            // Generar estadísticas basadas en la posición
            const matchesPlayed = position <= 2 ? 6 : position <= 4 ? 5 : position <= 8 ? 4 : 3
            const matchesWon = position <= 2 ? 5 : position <= 4 ? 3 : position <= 8 ? 2 : 1
            const setsWon = matchesWon * 2 + Math.floor(Math.random() * 3)
            const setsLost = (matchesPlayed - matchesWon) * 2 + Math.floor(Math.random() * 2)
            const gamesWon = setsWon * 6 + Math.floor(Math.random() * 20)
            const gamesLost = setsLost * 6 + Math.floor(Math.random() * 15)

            await prisma.tournamentStats.create({
              data: {
                tournamentId: statsTournament.id,
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

        tournaments.push(statsTournament)
        console.log(`📊 Torneo con estadísticas creado: ${statsTournament.name}`)
      }
    }
  }

  // 6. Crear notificaciones de ejemplo
  if (tournaments.length > 0) {
    const activeTournament = tournaments.find(t => t.status === TournamentStatus.REGISTRATION_OPEN)
    if (activeTournament && players.length >= 2) {
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: players[0].id,
            tournamentId: activeTournament.id,
            type: 'REGISTRATION_CONFIRMED',
            title: 'Inscripción confirmada',
            message: `Tu equipo ha sido inscrito exitosamente en ${activeTournament.name}`,
            status: 'SENT',
            sentAt: new Date(),
          }
        }),
        prisma.notification.create({
          data: {
            userId: players[1].id,
            type: 'TOURNAMENT_UPDATE',
            title: 'Nuevo torneo disponible',
            message: `Se ha abierto la inscripción para ${activeTournament.name}`,
            status: 'PENDING',
          }
        })
      ])
    }
  }

  console.log('🔔 Notificaciones de ejemplo creadas')

  console.log('✅ Seed completado exitosamente!')
  console.log('\n📋 Resumen de datos creados:')
  console.log(`   • ${players.length + 1} usuarios (1 admin, ${players.length} jugadores)`)
  console.log(`   • ${clubs.length} clubes con sus canchas`)
  console.log(`   • ${categories.length} categorías (sistema de divisiones completo)`)
  console.log(`   • ${tournaments.length} torneos con equipos inscritos`)
  console.log(`   • Rankings y notificaciones de ejemplo`)
  console.log('\n🏟️ Clubes incluidos:')
  console.log('   • Ciudad Padel (4 canchas)')
  console.log('   • Ohana Club Salta (2 canchas)')
  console.log('   • Padel NOA (2 canchas)')
  console.log('   • Pipo Padel (3 canchas)')
  console.log('   • Verbum Camp Padel (3 canchas)')
  console.log('\n🏆 Torneos incluidos:')
  console.log('   • We Need Padel OCT-25 (ACTIVO - Fem A y B)')
  console.log('   • Padel Noa OCT-25 (BORRADOR - Masc 7ma)')
  console.log('   • Encuentro de Padel (BORRADOR - Fem Suma 15)')
  console.log('\n👥 Distribución de jugadores:')
  console.log('   • 8 hombres nivel alto (1200-1600 pts)')
  console.log('   • 8 hombres nivel medio (800-1199 pts)')
  console.log('   • 4 hombres veteranos +45')
  console.log('   • 8 mujeres nivel alto (1000+ pts)')
  console.log('   • 8 mujeres nivel medio (600-999 pts)')
  console.log('   • 4 mujeres veteranas +45')
  console.log('   • 2 jugadores jóvenes mixtos')
  console.log('\n🔑 Credenciales de prueba:')
  console.log('   Admin: admin@padapp.com / 123456')
  console.log('   Ejemplos: juan.perez@email.com / 123456')
  console.log('            maria.garcia@email.com / 123456')
  console.log('            carolina.diaz@email.com / 123456 (fem alta)')
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