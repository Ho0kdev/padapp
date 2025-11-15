import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubFormSchema } from "@/lib/validations/club"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { z } from "zod"

// GET /api/clubs - Obtener lista de clubes
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const statusFilter = searchParams.get('status')
    const search = searchParams.get('search')
    const city = searchParams.get('city')
    const country = searchParams.get('country')
    const orderBy = searchParams.get('orderBy') || 'name'
    const order = searchParams.get('order') || 'asc'

    const skip = (page - 1) * limit

    // Construir filtro de where basado en parámetros
    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter
    }

    if (city && city !== 'all') {
      whereClause.city = city
    }

    if (country && country !== 'all') {
      whereClause.country = country
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } }
      ]
    }

    // Build orderBy clause dynamically
    const buildOrderBy = () => {
      const validColumns = ['name', 'city', 'country', 'address', 'status', 'createdAt']
      const sortOrder = (order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

      if (validColumns.includes(orderBy)) {
        return { [orderBy]: sortOrder }
      } else {
        // Default ordering
        return { name: 'asc' as const }
      }
    }

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: buildOrderBy(),
        include: {
          _count: {
            select: {
              courts: {
                where: {
                  deleted: false
                }
              }
            }
          }
        }
      }),
      prisma.club.count({ where: whereClause })
    ])

    // Calcular conteos manualmente para evitar el problema de doble conteo
    const clubsWithCounts = await Promise.all(
      clubs.map(async (club) => {
        // Contar torneos como sede principal
        const tournamentsAsMain = await prisma.tournament.count({
          where: {
            mainClubId: club.id,
            status: {
              in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
            }
          }
        });

        // Contar participaciones como club auxiliar (excluyendo cuando es sede principal)
        const tournamentsAsAuxiliary = await prisma.tournamentClub.count({
          where: {
            clubId: club.id,
            tournament: {
              status: {
                in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
              },
              mainClubId: {
                not: club.id
              }
            }
          }
        });

        return {
          ...club,
          _count: {
            courts: club._count.courts,
            tournaments: tournamentsAsMain,
            tournamentClubs: tournamentsAsAuxiliary
          }
        };
      })
    )

    return NextResponse.json({
      clubs: clubsWithCounts,
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

// POST /api/clubs - Crear nuevo club
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.CLUB)

    const body = await request.json()
    const validatedData = clubFormSchema.parse(body)

    // Verificar que no exista otro club con el mismo nombre en la misma ciudad
    const existingClub = await prisma.club.findFirst({
      where: {
        name: validatedData.name,
        city: validatedData.city,
        status: "ACTIVE"
      }
    })

    if (existingClub) {
      return NextResponse.json(
        { error: "Ya existe un club con ese nombre en la misma ciudad" },
        { status: 400 }
      )
    }

    const club = await prisma.club.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        country: validatedData.country,
        postalCode: validatedData.postalCode,
        phone: validatedData.phone,
        email: validatedData.email,
        website: validatedData.website,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        status: validatedData.status || "ACTIVE",
        logoUrl: validatedData.logoUrl,
      },
      include: {
        _count: {
          select: {
            courts: {
              where: {
                deleted: false
              }
            },
            tournaments: true
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.CREATE,
        resource: Resource.CLUB,
        resourceId: club.id,
        description: `Club ${club.name} creado`,
        newData: club,
      },
      request
    )

    return NextResponse.json(club, { status: 201 })

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