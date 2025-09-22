import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TournamentLogService } from "@/lib/services/tournament-log-service"
import { z } from "zod"

const updateTournamentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO"
  ], {
    message: "El tipo de torneo es requerido"
  }),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).default("PUBLIC"),
  registrationStart: z.string().transform((str) => new Date(str)),
  registrationEnd: z.string().transform((str) => new Date(str)),
  tournamentStart: z.string().transform((str) => new Date(str)),
  tournamentEnd: z.string().transform((str) => new Date(str)).optional(),
  maxParticipants: z.number().int().positive("Debe ser un número positivo").optional(),
  minParticipants: z.number().int().positive("Debe ser un número positivo").min(2, "Mínimo 2 participantes"),
  registrationFee: z.number().min(0, "La tarifa no puede ser negativa"),
  prizePool: z.number().min(0, "El premio no puede ser negativo"),
  setsToWin: z.number().int().positive("Debe ser un número positivo").min(1, "Mínimo 1 set"),
  gamesToWinSet: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo 4 games"),
  tiebreakAt: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo en 4 games"),
  goldenPoint: z.boolean(),
  mainClubId: z.string().min(1, "El club principal es requerido"),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
  categories: z.array(z.object({
    categoryId: z.string(),
    maxTeams: z.number().int().positive().optional(),
    registrationFee: z.number().min(0).optional(),
    prizePool: z.number().min(0).optional(),
  })).min(1, "Debe seleccionar al menos una categoría"),
  clubs: z.array(z.string()).optional(),
}).refine((data) => {
  return data.registrationEnd > data.registrationStart
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["registrationEnd"]
}).refine((data) => {
  return data.tournamentStart > data.registrationEnd
}, {
  message: "La fecha de inicio del torneo debe ser posterior al fin de inscripciones",
  path: ["tournamentStart"]
}).refine((data) => {
  if (data.tournamentEnd) {
    return data.tournamentEnd > data.tournamentStart
  }
  return true
}, {
  message: "La fecha de fin del torneo debe ser posterior al inicio",
  path: ["tournamentEnd"]
}).refine((data) => {
  if (data.maxParticipants) {
    return data.maxParticipants >= data.minParticipants
  }
  return true
}, {
  message: "El máximo de participantes debe ser mayor o igual al mínimo",
  path: ["maxParticipants"]
})

// GET /api/tournaments/[id] - Obtener torneo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true }
        },
        mainClub: {
          select: { id: true, name: true, address: true, city: true }
        },
        categories: {
          include: {
            category: true,
            teams: {
              include: {
                player1: {
                  select: { firstName: true, lastName: true }
                },
                player2: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        },
        clubs: {
          include: {
            club: {
              select: { id: true, name: true }
            }
          }
        },
        teams: {
          include: {
            player1: {
              select: { firstName: true, lastName: true }
            },
            player2: {
              select: { firstName: true, lastName: true }
            },
            category: {
              select: { name: true }
            }
          }
        },
        matches: {
          include: {
            team1: {
              include: {
                player1: { select: { firstName: true, lastName: true } },
                player2: { select: { firstName: true, lastName: true } }
              }
            },
            team2: {
              include: {
                player1: { select: { firstName: true, lastName: true } },
                player2: { select: { firstName: true, lastName: true } }
              }
            },
            court: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            teams: true,
            matches: true
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

    return NextResponse.json(tournament)

  } catch (error) {
    console.error("Error fetching tournament:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id] - Actualizar torneo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el torneo existe y obtener datos para logging
    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        clubs: {
          include: {
            club: true
          }
        }
      }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos (solo el organizador o admin puede editar)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (existingTournament.organizerId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para editar este torneo" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateTournamentSchema.parse(body)
    const { categories, clubs, ...tournamentData } = validatedData

    // Verificar que no se pueda editar un torneo que ya empezó
    if (existingTournament.status === "IN_PROGRESS" || existingTournament.status === "COMPLETED") {
      return NextResponse.json(
        { error: "No se puede editar un torneo que ya está en progreso o completado" },
        { status: 400 }
      )
    }

    // Preparar los datos de actualización
    const updateData: any = { ...tournamentData }

    // Manejar categorías si se proporcionan
    if (categories) {
      updateData.categories = {
        deleteMany: {},
        create: categories.map((cat: any) => ({
          categoryId: cat.categoryId,
          maxTeams: cat.maxTeams,
          registrationFee: cat.registrationFee,
          prizePool: cat.prizePool,
        }))
      }
    }

    // Manejar clubes si se proporcionan
    if (clubs) {
      updateData.clubs = {
        deleteMany: {},
        create: clubs.map((clubId: string) => ({
          clubId
        }))
      }
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: updateData,
      include: {
        organizer: {
          select: { name: true, email: true }
        },
        mainClub: {
          select: { name: true }
        },
        categories: {
          include: {
            category: true
          }
        },
        clubs: {
          include: {
            club: true
          }
        }
      }
    })

    // Registrar en el log
    await TournamentLogService.logTournamentUpdated(
      {
        userId: session.user.id,
        tournamentId: tournament.id,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      existingTournament,
      tournament
    )

    return NextResponse.json(tournament)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating tournament:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id] - Eliminar torneo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el torneo existe y obtener datos para logging
    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true } }
      }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (existingTournament.organizerId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este torneo" },
        { status: 403 }
      )
    }

    // Verificar que no se pueda eliminar un torneo con equipos inscritos
    if (existingTournament._count.teams > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un torneo que tiene equipos inscritos" },
        { status: 400 }
      )
    }

    // Registrar en el log antes de eliminar
    await TournamentLogService.logTournamentDeleted(
      {
        userId: session.user.id,
        tournamentId: existingTournament.id,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      existingTournament
    )

    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Torneo eliminado exitosamente" })

  } catch (error) {
    console.error("Error deleting tournament:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}