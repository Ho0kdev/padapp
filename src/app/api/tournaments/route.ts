import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { z } from "zod"

const createTournamentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO",
    "AMERICANO_SOCIAL"
  ], {
    message: "El tipo de torneo es requerido"
  }),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).default("PUBLIC"),
  registrationStart: z.string().transform((str) => new Date(str)),
  registrationEnd: z.string().transform((str) => new Date(str)),
  tournamentStart: z.string().transform((str) => new Date(str)),
  tournamentEnd: z.string().transform((str) => new Date(str)).optional(),
  maxParticipants: z.number().int().positive("Debe ser un número positivo").optional(),
  minParticipants: z.number().int().positive("Debe ser un número positivo").min(2, "Mínimo 2 participantes"),
  registrationFee: z.number().min(0, "La tarifa no puede ser negativa"),
  prizePool: z.number().min(0, "El premio no puede ser negativo"),
  rankingPoints: z.number().int().positive("Debe ser un número positivo").min(100, "Mínimo 100 puntos").max(5000, "Máximo 5000 puntos").default(1000),
  setsToWin: z.number().int().positive("Debe ser un número positivo").min(1, "Mínimo 1 set"),
  gamesToWinSet: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo 4 games"),
  tiebreakAt: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo en 4 games"),
  goldenPoint: z.boolean(),
  americanoRounds: z.number().int().min(1, "Mínimo 1 ronda").max(10, "Máximo 10 rondas").default(1),
  mainClubId: z.string().min(1, "El club principal es requerido"),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
  logoUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
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
    return data.tournamentEnd >= data.tournamentStart
  }
  return true
}, {
  message: "La fecha de fin del torneo debe ser igual o posterior al inicio",
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

// GET /api/tournaments - Obtener lista de torneos
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const statuses = searchParams.getAll("status")
    const search = searchParams.get("search")
    const orderBy = searchParams.get('orderBy') || 'name'
    const order = searchParams.get('order') || 'asc'

    const skip = (page - 1) * limit

    const where: any = {}

    if (statuses.length > 0) {
      // Si hay múltiples estados, usar 'in'
      if (statuses.length === 1) {
        where.status = statuses[0]
      } else {
        where.status = { in: statuses }
      }
    }

    if (search) {
      // Dividir la búsqueda en palabras para búsqueda inteligente
      const searchWords = search.trim().split(/\s+/)

      // Mapear búsquedas de tipos legibles a códigos de base de datos
      const typeMapping: Record<string, string[]> = {
        'eliminacion': ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION'],
        'simple': ['SINGLE_ELIMINATION'],
        'doble': ['DOUBLE_ELIMINATION'],
        'todos': ['ROUND_ROBIN'],
        'contra': ['ROUND_ROBIN'],
        'suizo': ['SWISS'],
        'grupos': ['GROUP_STAGE_ELIMINATION'],
        'americano': ['AMERICANO']
      }

      const searchLower = search.toLowerCase()
      let typeFilters: any[] = []

      // Buscar tipos que coincidan
      Object.entries(typeMapping).forEach(([key, types]) => {
        if (searchLower.includes(key)) {
          typeFilters.push(...types.map(type => ({ type })))
        }
      })

      if (searchWords.length === 1) {
        // Una sola palabra: búsqueda simple
        where.OR = [
          { name: { contains: searchWords[0], mode: "insensitive" } },
          { description: { contains: searchWords[0], mode: "insensitive" } },
          { mainClub: { name: { contains: searchWords[0], mode: "insensitive" } } },
          { mainClub: { city: { contains: searchWords[0], mode: "insensitive" } } },
          { categories: { some: { category: { name: { contains: searchWords[0], mode: "insensitive" } } } } },
          ...typeFilters
        ]
      } else {
        // Múltiples palabras: buscar que TODAS aparezcan
        where.OR = [
          // Opción 1: Todas las palabras en el nombre
          {
            AND: searchWords.map(word => ({
              name: { contains: word, mode: "insensitive" }
            }))
          },
          // Opción 2: Todas las palabras en la descripción
          {
            AND: searchWords.map(word => ({
              description: { contains: word, mode: "insensitive" }
            }))
          },
          // Opción 3: Todas las palabras en el club
          {
            mainClub: {
              OR: [
                {
                  AND: searchWords.map(word => ({
                    name: { contains: word, mode: "insensitive" }
                  }))
                },
                {
                  AND: searchWords.map(word => ({
                    city: { contains: word, mode: "insensitive" }
                  }))
                }
              ]
            }
          },
          // Mantener búsqueda en categorías y tipos como antes
          { categories: { some: { category: { name: { contains: search, mode: "insensitive" } } } } },
          ...typeFilters
        ]
      }
    }

    // Build orderBy clause dynamically
    const buildOrderBy = () => {
      const validColumns = ['name', 'status', 'tournamentStart', 'type', 'createdAt']
      const sortOrder = (order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

      if (validColumns.includes(orderBy)) {
        return { [orderBy]: sortOrder }
      } else {
        // Default ordering
        return { name: 'asc' as const }
      }
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: buildOrderBy(),
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
                select: { name: true, type: true, genderRestriction: true, minAge: true, maxAge: true, minRankingPoints: true, maxRankingPoints: true }
              }
            }
          },
          americanoPools: {
            include: {
              players: true
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
    return handleAuthError(error)
  }
}

// POST /api/tournaments - Crear nuevo torneo
export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario puede crear torneos
    const session = await authorize(Action.CREATE, Resource.TOURNAMENT)

    // Verificar que el usuario existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({
        error: "Usuario no encontrado"
      }, { status: 404 })
    }

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

    // Verificar que el club principal esté activo
    const mainClub = await prisma.club.findUnique({
      where: { id: validatedData.mainClubId },
      select: { status: true, name: true }
    })

    if (!mainClub) {
      return NextResponse.json(
        { error: "El club principal seleccionado no existe" },
        { status: 400 }
      )
    }

    if (mainClub.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `El club principal "${mainClub.name}" no está activo` },
        { status: 400 }
      )
    }

    // Verificar que todos los clubes participantes estén activos
    if (validatedData.clubs && validatedData.clubs.length > 0) {
      const inactiveClubs = await prisma.club.findMany({
        where: {
          id: { in: validatedData.clubs },
          status: { not: "ACTIVE" }
        },
        select: { id: true, name: true, status: true }
      })

      if (inactiveClubs.length > 0) {
        const inactiveClubNames = inactiveClubs.map(club => club.name).join(", ")
        return NextResponse.json(
          { error: `Los siguientes clubes no están activos: ${inactiveClubNames}` },
          { status: 400 }
        )
      }
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
        rankingPoints: validatedData.rankingPoints,
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

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.CREATE,
        resource: Resource.TOURNAMENT,
        resourceId: tournament.id,
        description: `Torneo ${tournament.name} creado`,
        newData: tournament,
      },
      request
    )

    return NextResponse.json(tournament, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}