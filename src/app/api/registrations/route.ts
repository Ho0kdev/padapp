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
      where.OR = [
        { player1Id: playerId },
        { player2Id: playerId }
      ]
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          player1: {
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
        },
        {
          player2: {
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
      ]
    }

    // Filtrado basado en permisos RBAC
    // Solo ADMIN y CLUB_ADMIN pueden ver todas las inscripciones
    // Otros usuarios solo ven sus propias inscripciones
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CLUB_ADMIN') {
      const userPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
      })

      if (userPlayer) {
        // Filtrar solo inscripciones donde el usuario es player1 o player2
        where.OR = [
          { player1Id: userPlayer.id },
          { player2Id: userPlayer.id }
        ]
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

    const [registrations, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
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
          player1: {
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
          player2: {
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
          payments: {
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
          }
        },
        orderBy: {
          registeredAt: 'desc'
        }
      }),
      prisma.team.count({ where })
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

    // Verificar que los jugadores existen
    const [player1, player2] = await Promise.all([
      prisma.player.findUnique({ where: { id: validatedData.player1Id } }),
      prisma.player.findUnique({ where: { id: validatedData.player2Id } })
    ])

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: "Uno o ambos jugadores no existen" },
        { status: 400 }
      )
    }

    // Verificar que ningún jugador esté ya inscrito en esta categoría del torneo
    const existingTeamWithPlayers = await prisma.team.findFirst({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED', 'PAID', 'WAITLIST']
        },
        OR: [
          { player1Id: validatedData.player1Id },
          { player1Id: validatedData.player2Id },
          { player2Id: validatedData.player1Id },
          { player2Id: validatedData.player2Id },
        ]
      },
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
    })

    if (existingTeamWithPlayers) {
      // Determinar qué jugador(es) ya están inscritos
      const player1AlreadyRegistered =
        existingTeamWithPlayers.player1Id === validatedData.player1Id ||
        existingTeamWithPlayers.player2Id === validatedData.player1Id
      const player2AlreadyRegistered =
        existingTeamWithPlayers.player1Id === validatedData.player2Id ||
        existingTeamWithPlayers.player2Id === validatedData.player2Id

      let errorMessage = ""
      if (player1AlreadyRegistered && player2AlreadyRegistered) {
        errorMessage = `Ambos jugadores ya están inscritos en esta categoría del torneo (Equipo: ${existingTeamWithPlayers.player1.firstName} ${existingTeamWithPlayers.player1.lastName} / ${existingTeamWithPlayers.player2.firstName} ${existingTeamWithPlayers.player2.lastName})`
      } else if (player1AlreadyRegistered) {
        errorMessage = `${player1.firstName} ${player1.lastName} ya está inscrito en esta categoría del torneo (Equipo: ${existingTeamWithPlayers.player1.firstName} ${existingTeamWithPlayers.player1.lastName} / ${existingTeamWithPlayers.player2.firstName} ${existingTeamWithPlayers.player2.lastName})`
      } else {
        errorMessage = `${player2.firstName} ${player2.lastName} ya está inscrito en esta categoría del torneo (Equipo: ${existingTeamWithPlayers.player1.firstName} ${existingTeamWithPlayers.player1.lastName} / ${existingTeamWithPlayers.player2.firstName} ${existingTeamWithPlayers.player2.lastName})`
      }

      return NextResponse.json(
        { error: errorMessage },
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
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED', 'PAID']
        }
      }
    })

    const isWaitlist = tournamentCategory.maxTeams && currentTeamsCount >= tournamentCategory.maxTeams

    // Crear el equipo/inscripción
    const registration = await prisma.team.create({
      data: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        player1Id: validatedData.player1Id,
        player2Id: validatedData.player2Id,
        name: validatedData.teamName,
        notes: validatedData.notes,
        registrationStatus: isWaitlist ? 'WAITLIST' : 'PENDING',
        registeredAt: new Date(),
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
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        player2: {
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