// prisma/seeds/index.ts
import { PrismaClient, UserRole, Gender, CourtSurface, TournamentType, TournamentStatus, CategoryType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes (opcional - cuidado en producción)
  // await prisma.notification.deleteMany()
  // await prisma.tournamentStats.deleteMany()
  // await prisma.matchGame.deleteMany()
  // await prisma.matchSet.deleteMany()
  // await prisma.match.deleteMany()
  // await prisma.zoneTeam.deleteMany()
  // await prisma.tournamentZone.deleteMany()
  // await prisma.teamPayment.deleteMany()
  // await prisma.team.deleteMany()
  // await prisma.tournamentCategory.deleteMany()
  // await prisma.tournamentClub.deleteMany()
  // await prisma.tournament.deleteMany()
  // await prisma.playerRanking.deleteMany()
  // await prisma.category.deleteMany()
  // await prisma.court.deleteMany()
  // await prisma.club.deleteMany()
  // await prisma.player.deleteMany()
  // await prisma.session.deleteMany()
  // await prisma.account.deleteMany()
  // await prisma.user.deleteMany()

  // console.log('🗑️  Datos anteriores limpiados')
  // npx prisma migrate reset --force
  
  // Base de datos ya limpia después del reset
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

  // Jugadores de ejemplo
  const players = await Promise.all([
    prisma.user.create({
      data: {
        email: 'juan.perez@email.com',
        password: hashedPassword,
        name: 'Juan Pérez',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+54 9 11 1234-5678',
            dateOfBirth: new Date('1990-05-15'),
            gender: Gender.MALE,
            rankingPoints: 1250,
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'maria.garcia@email.com',
        password: hashedPassword,
        name: 'María García',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'María',
            lastName: 'García',
            phone: '+54 9 11 2345-6789',
            dateOfBirth: new Date('1988-08-22'),
            gender: Gender.FEMALE,
            rankingPoints: 1180,
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'carlos.lopez@email.com',
        password: hashedPassword,
        name: 'Carlos López',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'Carlos',
            lastName: 'López',
            phone: '+54 9 11 3456-7890',
            dateOfBirth: new Date('1985-12-10'),
            gender: Gender.MALE,
            rankingPoints: 1420,
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'ana.martinez@email.com',
        password: hashedPassword,
        name: 'Ana Martínez',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'Ana',
            lastName: 'Martínez',
            phone: '+54 9 11 4567-8901',
            dateOfBirth: new Date('1992-03-08'),
            gender: Gender.FEMALE,
            rankingPoints: 980,
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'diego.rodriguez@email.com',
        password: hashedPassword,
        name: 'Diego Rodríguez',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'Diego',
            lastName: 'Rodríguez',
            phone: '+54 9 11 5678-9012',
            dateOfBirth: new Date('1987-11-25'),
            gender: Gender.MALE,
            rankingPoints: 1320,
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'lucia.fernandez@email.com',
        password: hashedPassword,
        name: 'Lucía Fernández',
        role: UserRole.PLAYER,
        player: {
          create: {
            firstName: 'Lucía',
            lastName: 'Fernández',
            phone: '+54 9 11 6789-0123',
            dateOfBirth: new Date('1991-07-14'),
            gender: Gender.FEMALE,
            rankingPoints: 1150,
          }
        }
      }
    })
  ])

  console.log(`👥 Creados ${players.length + 1} usuarios (incluyendo admin)`)

  // 2. Crear clubes y canchas
  const clubs = await Promise.all([
    prisma.club.create({
      data: {
        name: 'Club Deportivo Norte',
        description: 'Club premium con las mejores instalaciones de pádel',
        address: 'Av. Libertador 1234',
        city: 'Buenos Aires',
        country: 'Argentina',
        postalCode: '1425',
        phone: '+54 11 4567-8900',
        email: 'info@clubnorte.com',
        courts: {
          create: [
            {
              name: 'Cancha 1',
              surface: CourtSurface.CONCRETE,
              hasLighting: true,
              hasRoof: false,
              hourlyRate: 3000,
            },
            {
              name: 'Cancha 2',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: true,
              hourlyRate: 3500,
            },
            {
              name: 'Cancha 3',
              surface: CourtSurface.CONCRETE,
              hasLighting: true,
              hasRoof: false,
              hourlyRate: 3000,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Racquet Club',
        description: 'Club tradicional con ambiente familiar',
        address: 'Calle Falsa 456',
        city: 'Buenos Aires',
        country: 'Argentina',
        postalCode: '1414',
        phone: '+54 11 3456-7890',
        email: 'contacto@racquetclub.com',
        courts: {
          create: [
            {
              name: 'Court A',
              surface: CourtSurface.CERAMIC,
              hasLighting: true,
              hasRoof: true,
              hourlyRate: 4000,
            },
            {
              name: 'Court B',
              surface: CourtSurface.CERAMIC,
              hasLighting: true,
              hasRoof: true,
              hourlyRate: 4000,
            }
          ]
        }
      }
    }),
    prisma.club.create({
      data: {
        name: 'Polideportivo Sur',
        description: 'Complejo deportivo público',
        address: 'Av. San Juan 789',
        city: 'Buenos Aires',
        country: 'Argentina',
        postalCode: '1147',
        phone: '+54 11 2345-6789',
        email: 'info@polisur.gov.ar',
        courts: {
          create: [
            {
              name: 'Pista 1',
              surface: CourtSurface.CONCRETE,
              hasLighting: false,
              hasRoof: false,
              hourlyRate: 1500,
            },
            {
              name: 'Pista 2',
              surface: CourtSurface.CONCRETE,
              hasLighting: false,
              hasRoof: false,
              hourlyRate: 1500,
            },
            {
              name: 'Pista 3',
              surface: CourtSurface.ARTIFICIAL_GRASS,
              hasLighting: true,
              hasRoof: false,
              hourlyRate: 2000,
            }
          ]
        }
      }
    })
  ])

  console.log(`🏟️  Creados ${clubs.length} clubes con sus canchas`)

  // 3. Crear categorías
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Masculino A',
        description: 'Categoría masculina nivel avanzado',
        type: CategoryType.SKILL,
        minRankingPoints: 1200,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Masculino B',
        description: 'Categoría masculina nivel intermedio',
        type: CategoryType.SKILL,
        minRankingPoints: 800,
        maxRankingPoints: 1199,
        genderRestriction: Gender.MALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino A',
        description: 'Categoría femenina nivel avanzado',
        type: CategoryType.SKILL,
        minRankingPoints: 1000,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Femenino B',
        description: 'Categoría femenina nivel intermedio',
        type: CategoryType.SKILL,
        minRankingPoints: 600,
        maxRankingPoints: 999,
        genderRestriction: Gender.FEMALE,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Mixto',
        description: 'Categoría mixta (un hombre y una mujer)',
        type: CategoryType.MIXED,
        genderRestriction: Gender.MIXED,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Veteranos +45',
        description: 'Categoría para jugadores mayores de 45 años',
        type: CategoryType.AGE,
        minAge: 45,
        genderRestriction: Gender.MALE,
      }
    })
  ])

  console.log(`🏷️  Creadas ${categories.length} categorías`)

  // 4. Crear rankings para jugadores
  const currentYear = new Date().getFullYear()
  const playersData = await prisma.player.findMany()

  for (const player of playersData) {
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

  // 5. Crear torneo de ejemplo
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Torneo de Primavera 2024',
      description: 'Torneo oficial de inicio de temporada con múltiples categorías',
      type: TournamentType.SINGLE_ELIMINATION,
      status: TournamentStatus.REGISTRATION_OPEN,
      registrationStart: new Date(),
      registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      tournamentStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
      tournamentEnd: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 días
      maxParticipants: 64,
      registrationFee: 2500,
      prizePool: 50000,
      organizerId: adminUser.id,
      mainClubId: clubs[0].id,
      categories: {
        create: [
          {
            categoryId: categories[0].id, // Masculino A
            maxTeams: 16,
            registrationFee: 2500,
            prizePool: 20000,
          },
          {
            categoryId: categories[1].id, // Masculino B
            maxTeams: 16,
            registrationFee: 2000,
            prizePool: 15000,
          },
          {
            categoryId: categories[2].id, // Femenino A
            maxTeams: 16,
            registrationFee: 2500,
            prizePool: 15000,
          }
        ]
      },
      clubs: {
        create: [
          { clubId: clubs[0].id },
          { clubId: clubs[1].id }
        ]
      }
    }
  })

  // Crear equipos de ejemplo
  const malePlayersA = playersData.filter(p => 
    p.gender === Gender.MALE && p.rankingPoints >= 1200
  )
  const femalePlayersA = playersData.filter(p => 
    p.gender === Gender.FEMALE && p.rankingPoints >= 1000
  )

  if (malePlayersA.length >= 4) {
    await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        categoryId: categories[0].id, // Masculino A
        name: 'Los Ases',
        player1Id: malePlayersA[0].id,
        player2Id: malePlayersA[1].id,
        registrationStatus: 'PAID',
        payments: {
          create: {
            amount: 2500,
            paymentStatus: 'PAID',
            paymentMethod: 'tarjeta',
            paidAt: new Date(),
          }
        }
      }
    })

    await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        categoryId: categories[0].id, // Masculino A
        name: 'Smash Brothers',
        player1Id: malePlayersA[2].id,
        player2Id: malePlayersA.length > 3 ? malePlayersA[3].id : malePlayersA[0].id,
        registrationStatus: 'CONFIRMED',
      }
    })
  }

  if (femalePlayersA.length >= 2) {
    await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        categoryId: categories[2].id, // Femenino A
        name: 'Power Girls',
        player1Id: femalePlayersA[0].id,
        player2Id: femalePlayersA.length > 1 ? femalePlayersA[1].id : femalePlayersA[0].id,
        registrationStatus: 'PAID',
        payments: {
          create: {
            amount: 2500,
            paymentStatus: 'PAID',
            paymentMethod: 'efectivo',
            paidAt: new Date(),
          }
        }
      }
    })
  }

  console.log('🏆 Torneo de ejemplo creado con equipos')

  // 6. Crear notificaciones de ejemplo
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: players[0].id,
        tournamentId: tournament.id,
        type: 'REGISTRATION_CONFIRMED',
        title: 'Inscripción confirmada',
        message: 'Tu equipo ha sido inscrito exitosamente en el Torneo de Primavera 2024',
        status: 'SENT',
        sentAt: new Date(),
      }
    }),
    prisma.notification.create({
      data: {
        userId: players[1].id,
        type: 'TOURNAMENT_UPDATE',
        title: 'Nuevo torneo disponible',
        message: 'Se ha abierto la inscripción para el Torneo de Primavera 2024',
        status: 'PENDING',
      }
    })
  ])

  console.log('🔔 Notificaciones de ejemplo creadas')

  console.log('✅ Seed completado exitosamente!')
  console.log('\n📋 Resumen de datos creados:')
  console.log(`   • ${players.length + 1} usuarios (1 admin, ${players.length} jugadores)`)
  console.log(`   • ${clubs.length} clubes con canchas`)
  console.log(`   • ${categories.length} categorías`)
  console.log(`   • 1 torneo con equipos inscritos`)
  console.log(`   • Rankings y notificaciones de ejemplo`)
  console.log('\n🔑 Credenciales de prueba:')
  console.log('   Admin: admin@padapp.com / 123456')
  console.log('   Jugador: juan.perez@email.com / 123456')
  console.log('   Jugador: maria.garcia@email.com / 123456')
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