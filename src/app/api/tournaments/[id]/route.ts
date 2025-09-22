import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateTournamentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO"
  ]).optional(),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).optional(),
  registrationStart: z.string().transform((str) => new Date(str)).optional(),
  registrationEnd: z.string().transform((str) => new Date(str)).optional(),
  tournamentStart: z.string().transform((str) => new Date(str)).optional(),
  tournamentEnd: z.string().transform((str) => new Date(str)).optional(),
  maxParticipants: z.number().int().positive().optional(),
  minParticipants: z.number().int().positive().optional(),
  registrationFee: z.number().min(0).optional(),
  prizePool: z.number().min(0).optional(),
  setsToWin: z.number().int().positive().optional(),
  gamesToWinSet: z.number().int().positive().optional(),
  tiebreakAt: z.number().int().positive().optional(),
  goldenPoint: z.boolean().optional(),
  mainClubId: z.string().optional(),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
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

    // Verificar que el torneo existe
    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: { organizerId: true, status: true }
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

    // Verificar que no se pueda editar un torneo que ya empezó
    if (existingTournament.status === "IN_PROGRESS" || existingTournament.status === "COMPLETED") {
      return NextResponse.json(
        { error: "No se puede editar un torneo que ya está en progreso o completado" },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: validatedData,
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

    // Verificar que el torneo existe
    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: { organizerId: true, status: true, _count: { select: { teams: true } } }
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