import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createTournamentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO"
  ]),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).default("PUBLIC"),
  registrationStart: z.string().transform((str) => new Date(str)),
  registrationEnd: z.string().transform((str) => new Date(str)),
  tournamentStart: z.string().transform((str) => new Date(str)),
  tournamentEnd: z.string().transform((str) => new Date(str)).optional(),
  maxParticipants: z.number().int().positive().optional(),
  minParticipants: z.number().int().positive().default(4),
  registrationFee: z.number().min(0).default(0),
  prizePool: z.number().min(0).default(0),
  setsToWin: z.number().int().positive().default(2),
  gamesToWinSet: z.number().int().positive().default(6),
  tiebreakAt: z.number().int().positive().default(6),
  goldenPoint: z.boolean().default(true),
  mainClubId: z.string().optional(),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
  categories: z.array(z.object({
    categoryId: z.string(),
    maxTeams: z.number().int().positive().optional(),
    registrationFee: z.number().min(0).optional(),
    prizePool: z.number().min(0).optional(),
  })).optional(),
  clubs: z.array(z.string()).optional(),
})

// GET /api/tournaments - Obtener lista de torneos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const skip = (page - 1) * limit

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          organizer: {
            select: { name: true, email: true }
          },
          mainClub: {
            select: { name: true, city: true }
          },
          categories: {
            include: {
              category: {
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
      }),
      prisma.tournament.count({ where })
    ])

    return NextResponse.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Crear nuevo torneo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log("Full session:", JSON.stringify(session, null, 2))

    if (!session?.user) {
      console.log("No session or user found")
      return NextResponse.json({
        error: "No autorizado",
        details: "Session not found or invalid"
      }, { status: 401 })
    }

    console.log("Session user:", session.user)
    console.log("Session user id:", session.user.id)

    // Verificar que el usuario existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      console.error("User not found in database:", session.user.id)
      return NextResponse.json({
        error: "Usuario no encontrado",
        details: `User ID ${session.user.id} does not exist in database`
      }, { status: 404 })
    }

    console.log("User found:", user)

    const body = await request.json()
    const validatedData = createTournamentSchema.parse(body)

    // Verificar que las fechas sean válidas
    if (validatedData.registrationEnd <= validatedData.registrationStart) {
      return NextResponse.json(
        { error: "La fecha de fin de inscripción debe ser posterior al inicio" },
        { status: 400 }
      )
    }

    if (validatedData.tournamentStart <= validatedData.registrationEnd) {
      return NextResponse.json(
        { error: "La fecha de inicio del torneo debe ser posterior al fin de inscripciones" },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        visibility: validatedData.visibility,
        registrationStart: validatedData.registrationStart,
        registrationEnd: validatedData.registrationEnd,
        tournamentStart: validatedData.tournamentStart,
        tournamentEnd: validatedData.tournamentEnd,
        maxParticipants: validatedData.maxParticipants,
        minParticipants: validatedData.minParticipants,
        registrationFee: validatedData.registrationFee,
        prizePool: validatedData.prizePool,
        setsToWin: validatedData.setsToWin,
        gamesToWinSet: validatedData.gamesToWinSet,
        tiebreakAt: validatedData.tiebreakAt,
        goldenPoint: validatedData.goldenPoint,
        organizerId: session.user.id,
        mainClubId: validatedData.mainClubId,
        rules: validatedData.rules,
        prizesDescription: validatedData.prizesDescription,
        categories: validatedData.categories ? {
          create: validatedData.categories.map(cat => ({
            categoryId: cat.categoryId,
            maxTeams: cat.maxTeams,
            registrationFee: cat.registrationFee,
            prizePool: cat.prizePool,
          }))
        } : undefined,
        clubs: validatedData.clubs ? {
          create: validatedData.clubs.map(clubId => ({
            clubId
          }))
        } : undefined,
      },
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

    return NextResponse.json(tournament, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating tournament:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}