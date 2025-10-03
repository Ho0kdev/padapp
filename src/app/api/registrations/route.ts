import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  validateTournamentStatus,
  validateRegistrationDates,
  validatePlayerCategoryLevel,
  shouldBeWaitlisted,
  getInitialRegistrationStatus
} from "@/lib/validations/registration-validations"

// ============================================================================
// SCHEMAS
// ============================================================================

const createTeamRegistrationSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  player1Id: z.string().min(1, "El jugador 1 es requerido"),
  player2Id: z.string().min(1, "El jugador 2 es requerido"),
  teamName: z.string().min(1, "El nombre del equipo es requerido").max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  contactEmail: z.string().email("Email inválido").optional(),
  contactPhone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos").optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debe aceptar los términos y condiciones"
  }),
  acceptPrivacyPolicy: z.boolean().refine(val => val === true, {
    message: "Debe aceptar la política de privacidad"
  }),
}).refine((data) => {
  return data.player1Id !== data.player2Id
}, {
  message: "Los jugadores deben ser diferentes",
  path: ["player2Id"]
})

const getRegistrationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum([
    "all",
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(),
  search: z.string().optional(),
  tournamentId: z.string().optional(),
  categoryId: z.string().optional(),
  playerId: z.string().optional(),
})

// ============================================================================
// GET ENDPOINT
// ============================================================================

/**
 * GET /api/registrations
 *
 * Lista todas las inscripciones con paginación y filtros.
 * Aplica permisos RBAC:
 * - ADMIN y CLUB_ADMIN: Ven todas las inscripciones
 * - Otros usuarios: Solo ven sus propias inscripciones
 *
 * Para torneos convencionales, evita duplicados mostrando solo registration1 de cada Team.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = getRegistrationsSchema.parse(params)
    const { page, limit, status, search, tournamentId, categoryId, playerId } = validatedParams

    const offset = (page - 1) * limit

    // Construir filtros base
    const where: any = {}

    if (status && status !== 'all') {
      where.registrationStatus = status
    }

    if (tournamentId && tournamentId !== 'all') {
      where.tournamentId = tournamentId
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    if (playerId) {
      where.playerId = playerId
    }

    if (search) {
      where.player = {
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ]
      }
    }

    // Aplicar filtrado basado en permisos RBAC
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CLUB_ADMIN') {
      const userPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
      })

      if (userPlayer) {
        where.playerId = userPlayer.id
      } else {
        // Si no es jugador, no puede ver ninguna inscripción
        return NextResponse.json({
          registrations: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        })
      }
    }

    // Filtro para evitar duplicados en torneos por equipos:
    // Solo mostrar registrations que son player1 de un Team, o que son de Americano Social
    const whereWithTeamFilter = {
      ...where,
      OR: [
        // Registrations de torneos Americano Social (sin equipos)
        {
          tournament: {
            type: 'AMERICANO_SOCIAL'
          }
        },
        // O registrations que son registration1 de un equipo
        {
          AND: [
            {
              tournament: {
                type: {
                  not: 'AMERICANO_SOCIAL'
                }
              }
            },
            {
              teamAsPlayer1: {
                some: {}
              }
            }
          ]
        }
      ]
    }

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where: whereWithTeamFilter,
        skip: offset,
        take: limit,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              registrationStart: true,
              registrationEnd: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            }
          },
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
              paidAt: true,
            }
          },
          tournamentCategory: {
            select: {
              registrationFee: true,
              maxTeams: true,
            }
          },
          teamAsPlayer1: {
            select: {
              id: true,
              name: true,
              registration2: {
                select: {
                  player: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            },
            take: 1
          },
          teamAsPlayer2: {
            select: {
              id: true,
              name: true,
              registration1: {
                select: {
                  player: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.registration.count({ where: whereWithTeamFilter })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      registrations,
      total,
      page,
      limit,
      totalPages
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}

// ============================================================================
// POST ENDPOINT
// ============================================================================

/**
 * POST /api/registrations
 *
 * Crea una nueva inscripción para un torneo CONVENCIONAL (Team de 2 jugadores).
 * Para torneos Americano Social, usar /api/registrations/individual
 *
 * Proceso:
 * 1. Valida el torneo y fechas
 * 2. Valida ambos jugadores y sus categorías
 * 3. Verifica que no estén ya inscritos
 * 4. Crea 2 Registrations + 1 Team en una transacción
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.REGISTRATION)

    const body = await request.json()
    const validatedData = createTeamRegistrationSchema.parse(body)

    // 1. Obtener y validar el torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: validatedData.tournamentId },
      include: {
        categories: {
          where: { categoryId: validatedData.categoryId },
          include: {
            category: true
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Validar estado del torneo
    const statusError = validateTournamentStatus(tournament)
    if (statusError) return statusError

    // Validar fechas de inscripción
    const datesError = validateRegistrationDates(tournament)
    if (datesError) return datesError

    // 2. Verificar que la categoría existe en el torneo
    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "Categoría no disponible en este torneo" },
        { status: 400 }
      )
    }

    // 3. Obtener y validar jugadores
    const [player1, player2] = await Promise.all([
      prisma.player.findUnique({
        where: { id: validatedData.player1Id },
        include: {
          primaryCategory: {
            select: {
              id: true,
              name: true,
              level: true
            }
          }
        }
      }),
      prisma.player.findUnique({
        where: { id: validatedData.player2Id },
        include: {
          primaryCategory: {
            select: {
              id: true,
              name: true,
              level: true
            }
          }
        }
      })
    ])

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: "Uno o ambos jugadores no existen" },
        { status: 400 }
      )
    }

    // Validar nivel de categoría para player1
    const player1LevelError = validatePlayerCategoryLevel(
      player1.primaryCategory?.level,
      tournamentCategory.category.level,
      `${player1.firstName} ${player1.lastName}`,
      player1.primaryCategory?.name,
      tournamentCategory.category.name
    )
    if (player1LevelError) return player1LevelError

    // Validar nivel de categoría para player2
    const player2LevelError = validatePlayerCategoryLevel(
      player2.primaryCategory?.level,
      tournamentCategory.category.level,
      `${player2.firstName} ${player2.lastName}`,
      player2.primaryCategory?.name,
      tournamentCategory.category.name
    )
    if (player2LevelError) return player2LevelError

    // 4. Verificar que ningún jugador esté ya inscrito
    const existingRegistrations = await prisma.registration.findMany({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        playerId: {
          in: [validatedData.player1Id, validatedData.player2Id]
        },
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED', 'WAITLIST']
        }
      },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (existingRegistrations.length > 0) {
      const playerNames = existingRegistrations.map(r => `${r.player.firstName} ${r.player.lastName}`).join(', ')
      return NextResponse.json(
        { error: `El/los siguiente(s) jugador(es) ya están inscritos en esta categoría: ${playerNames}` },
        { status: 400 }
      )
    }

    // 5. Verificar cupo disponible
    const currentTeamsCount = await prisma.team.count({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        status: {
          in: ['DRAFT', 'CONFIRMED']
        }
      }
    })

    const isWaitlist = shouldBeWaitlisted(currentTeamsCount, tournamentCategory.maxTeams)
    const registrationStatus = getInitialRegistrationStatus(isWaitlist)

    // 6. Crear las 2 registrations y el team en una transacción
    const team = await prisma.$transaction(async (tx) => {
      // Crear registration para player 1
      const reg1 = await tx.registration.create({
        data: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          playerId: validatedData.player1Id,
          registrationStatus,
          notes: validatedData.notes,
        }
      })

      // Crear registration para player 2
      const reg2 = await tx.registration.create({
        data: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          playerId: validatedData.player2Id,
          registrationStatus,
          notes: validatedData.notes,
        }
      })

      // Crear el team
      return tx.team.create({
        data: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          registration1Id: reg1.id,
          registration2Id: reg2.id,
          name: validatedData.teamName,
          notes: validatedData.notes,
          status: 'DRAFT', // Siempre empieza como DRAFT
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
            }
          },
          registration1: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          registration2: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          tournamentCategory: {
            select: {
              registrationFee: true,
            }
          }
        }
      })
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.REGISTRATION,
      resourceId: team.id,
      description: `Equipo inscrito: ${team.name} - ${team.tournament.name}`,
      newData: team,
    }, request)

    return NextResponse.json(team, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}
