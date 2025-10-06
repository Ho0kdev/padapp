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
import { RegistrationLogService } from "@/lib/services/registration-log-service"

// ============================================================================
// SCHEMAS
// ============================================================================

const createRegistrationSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  playerId: z.string().min(1, "El jugador es requerido"),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debe aceptar los términos y condiciones"
  }),
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
 * Lista todas las inscripciones individuales con paginación y filtros.
 * Aplica permisos RBAC:
 * - ADMIN y CLUB_ADMIN: Ven todas las inscripciones
 * - Otros usuarios: Solo ven sus propias inscripciones
 *
 * Cada inscripción representa a un jugador individual inscrito en un torneo/categoría.
 * Los equipos se gestionan por separado en /api/teams
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

    // Mostrar todas las inscripciones sin filtros de duplicados
    // Las inscripciones son individuales y se muestran todas
    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
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
      prisma.registration.count({ where })
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
 * Crea una inscripción individual para CUALQUIER tipo de torneo.
 *
 * Flujo unificado:
 * 1. Cada jugador se inscribe individualmente con este endpoint
 * 2. Para torneos convencionales, después de que los jugadores se inscriban,
 *    se crea un equipo con POST /api/teams vinculando las inscripciones
 *
 * Para torneos AMERICANO_SOCIAL: El jugador juega individualmente (sin equipo)
 * Para torneos convencionales: El jugador debe formar equipo después de inscribirse
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.REGISTRATION)

    const body = await request.json()
    const validatedData = createRegistrationSchema.parse(body)

    // 1. Verificar que el torneo existe
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

    // 3. Verificar que el jugador existe y obtener su categoría principal
    const player = await prisma.player.findUnique({
      where: { id: validatedData.playerId },
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

    if (!player) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 400 }
      )
    }

    // Validar nivel de categoría
    const levelError = validatePlayerCategoryLevel(
      player.primaryCategory?.level,
      tournamentCategory.category.level,
      `${player.firstName} ${player.lastName}`,
      player.primaryCategory?.name,
      tournamentCategory.category.name
    )
    if (levelError) return levelError

    // 4. Verificar que el jugador no esté ya inscrito en esta categoría del torneo
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        tournamentId_categoryId_playerId: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          playerId: validatedData.playerId
        }
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: `${player.firstName} ${player.lastName} ya está inscrito en esta categoría` },
        { status: 400 }
      )
    }

    // 5. Verificar cupo disponible
    const currentRegistrationsCount = await prisma.registration.count({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    })

    const isWaitlist = shouldBeWaitlisted(currentRegistrationsCount, tournamentCategory.maxTeams)
    const registrationStatus = getInitialRegistrationStatus(isWaitlist)

    // 6. Crear la registration
    const registration = await prisma.registration.create({
      data: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        playerId: validatedData.playerId,
        registrationStatus,
        notes: validatedData.notes,
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
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.REGISTRATION,
      resourceId: registration.id,
      description: `Inscripción creada: ${registration.player.firstName} ${registration.player.lastName} - ${registration.tournament.name}`,
      newData: registration,
    }, request)

    // Log registration creation
    await RegistrationLogService.logRegistrationCreated(
      {
        userId: session.user.id,
        registrationId: registration.id
      },
      registration
    )

    return NextResponse.json(registration, { status: 201 })

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
