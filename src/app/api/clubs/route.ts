import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clubFormSchema } from "@/lib/validations/club"
import { z } from "zod"

// GET /api/clubs - Obtener lista de clubes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const clubs = await prisma.club.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            courts: true
          }
        }
      }
    })

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

    return NextResponse.json({ clubs: clubsWithCounts })

  } catch (error) {
    console.error("Error fetching clubs:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/clubs - Crear nuevo club
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin (solo admins pueden crear clubes)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden crear clubes" },
        { status: 403 }
      )
    }

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
            courts: true,
            tournaments: true
          }
        }
      }
    })

    return NextResponse.json(club, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating club:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}