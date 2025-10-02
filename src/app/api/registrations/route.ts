import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createRegistrationSchema = z.object({
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

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const validatedParams = getRegistrationsSchema.parse(params)
    const { page, limit, status, search, tournamentId, categoryId, playerId } = validatedParams

    const offset = (page - 1) * limit

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

    // Filtrado basado en permisos RBAC
    // Solo ADMIN y CLUB_ADMIN pueden ver todas las inscripciones
    // Otros usuarios solo ven sus propias inscripciones
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CLUB_ADMIN') {
      const userPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
      })

      if (userPlayer) {
        // Filtrar solo inscripciones del usuario
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

    // Para evitar duplicados en torneos por equipos, agregamos una condición:
    // Solo mostrar registrations que NO tienen un teamAsPlayer2 (es decir, solo la registration1 del equipo)
    // O que son de torneos AMERICANO_SOCIAL (que no tienen equipos)
    const whereWithTeamFilter = {
      ...where,
      OR: [
        // Registrations de torneos Americano Social (sin equipos)
        {
          tournament: {
            type: 'AMERICANO_SOCIAL'
          }
        },
        // O registrations que son player1 de un equipo (evita duplicados)
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

export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.REGISTRATION)

    const body = await request.json()
    const validatedData = createRegistrationSchema.parse(body)

    // Verificar que el torneo existe y está en estado de inscripciones abiertas
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

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json(
        { error: "Las inscripciones para este torneo no están abiertas" },
        { status: 400 }
      )
    }

    // Verificar fechas de inscripción
    const now = new Date()
    const registrationStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
    const registrationEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null

    // Comparar solo fechas (sin hora) - el último día debe incluirse completo
    if (registrationStart) {
      const startDate = new Date(registrationStart.getFullYear(), registrationStart.getMonth(), registrationStart.getDate())
      const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (currentDate < startDate) {
        return NextResponse.json(
          { error: "Las inscripciones aún no han comenzado" },
          { status: 400 }
        )
      }
    }

    if (registrationEnd) {
      const endDate = new Date(registrationEnd.getFullYear(), registrationEnd.getMonth(), registrationEnd.getDate())
      const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (currentDate > endDate) {
        return NextResponse.json(
          { error: "Las inscripciones ya han finalizado" },
          { status: 400 }
        )
      }
    }

    // Verificar que la categoría existe en el torneo
    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "Categoría no disponible en este torneo" },
        { status: 400 }
      )
    }

    // Verificar que los jugadores existen y obtener sus categorías principales
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

    // Validar nivel de categoría para ambos jugadores
    // Nivel más bajo = mejor jugador (ej: nivel 1 o 2 = profesional)
    // Nivel más alto = principiante (ej: nivel 8 = principiante)
    // Un jugador puede jugar en su nivel o en niveles más bajos (con mejores jugadores)
    // pero NO puede jugar en niveles más altos (con principiantes) - sería injusto
    if (tournamentCategory.category.level) {
      // Validar player1
      if (player1.primaryCategory?.level && player1.primaryCategory.level < tournamentCategory.category.level) {
        return NextResponse.json(
          {
            error: `El nivel del jugador ${player1.firstName} ${player1.lastName} (${player1.primaryCategory.name} - Nivel ${player1.primaryCategory.level}) es superior para la categoría del torneo (${tournamentCategory.category.name} - Nivel ${tournamentCategory.category.level}). Solo puede jugar en categorías de su nivel o superior.`
          },
          { status: 400 }
        )
      }

      // Validar player2
      if (player2.primaryCategory?.level && player2.primaryCategory.level < tournamentCategory.category.level) {
        return NextResponse.json(
          {
            error: `El nivel del jugador ${player2.firstName} ${player2.lastName} (${player2.primaryCategory.name} - Nivel ${player2.primaryCategory.level}) es superior para la categoría del torneo (${tournamentCategory.category.name} - Nivel ${tournamentCategory.category.level}). Solo puede jugar en categorías de su nivel o superior.`
          },
          { status: 400 }
        )
      }
    }

    // Verificar que ningún jugador esté ya inscrito en esta categoría del torneo
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

    // TODO: Aquí se implementarán más validaciones de elegibilidad
    // - Verificar categoría por edad, género, ranking, etc.

    // Verificar si hay cupo disponible
    const currentTeamsCount = await prisma.team.count({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        status: {
          in: ['DRAFT', 'CONFIRMED']
        }
      }
    })

    const isWaitlist = tournamentCategory.maxTeams && currentTeamsCount >= tournamentCategory.maxTeams
    const registrationStatus = isWaitlist ? 'WAITLIST' : 'PENDING'

    // Crear las 2 registrations y el team en una transacción
    const result = await prisma.$transaction(async (tx) => {
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
      const team = await tx.team.create({
        data: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          registration1Id: reg1.id,
          registration2Id: reg2.id,
          name: validatedData.teamName,
          notes: validatedData.notes,
          status: isWaitlist ? 'DRAFT' : 'DRAFT', // Siempre empieza como DRAFT
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

      return team
    })

    const registration = result

    // TODO: Enviar notificación por email
    // TODO: Si hay tarifa de inscripción, crear el registro de pago pendiente

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.REGISTRATION,
      resourceId: registration.id,
      description: `Inscripción creada: ${registration.name} - ${registration.tournament.name}`,
      newData: registration,
    }, request)

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