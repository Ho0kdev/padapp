import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const validatedParams = getRegistrationsSchema.parse(params)
    const { page, limit, status, search, tournamentId, categoryId, playerId } = validatedParams

    const offset = (page - 1) * limit

    const where: any = {}

    if (status) {
      where.registrationStatus = status
    }

    if (tournamentId) {
      where.tournamentId = tournamentId
    }

    if (categoryId) {
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

    // Solo admins pueden ver todas las inscripciones
    // Otros usuarios solo ven sus propias inscripciones
    if (session.user.role !== 'ADMIN') {
      const userPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
      })

      if (userPlayer) {
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
    console.error('Error fetching registrations:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

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
    if (now < tournament.registrationStart! || now > tournament.registrationEnd!) {
      return NextResponse.json(
        { error: "Fuera del período de inscripciones" },
        { status: 400 }
      )
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

    // TODO: Aquí se implementarán las validaciones de elegibilidad más complejas
    // - Verificar categoría por edad, género, ranking, etc.
    // - Verificar que no estén ya inscritos en esta categoría
    // - Verificar límites de equipos

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

    return NextResponse.json(registration, { status: 201 })

  } catch (error) {
    console.error('Error creating registration:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}