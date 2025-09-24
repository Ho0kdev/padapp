import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/rankings - Obtener lista de rankings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const categoryId = searchParams.get("categoryId")
    const seasonYearParam = searchParams.get("seasonYear")
    const search = searchParams.get("search")

    const skip = (page - 1) * limit

    const where: any = {
      category: {
        isActive: true
      }
    }

    // Solo filtrar por categoría si no es "all"
    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId
    }

    // Solo filtrar por año si se especifica y no es "all"
    if (seasonYearParam && seasonYearParam !== "all") {
      where.seasonYear = parseInt(seasonYearParam)
    } else if (!seasonYearParam) {
      // Si no se especifica año, usar el actual por defecto
      where.seasonYear = new Date().getFullYear()
    }

    if (search) {
      where.OR = [
        {
          player: {
            firstName: { contains: search, mode: "insensitive" }
          }
        },
        {
          player: {
            lastName: { contains: search, mode: "insensitive" }
          }
        }
      ]
    }

    const [rankings, total] = await Promise.all([
      prisma.playerRanking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { currentPoints: "desc" },
          { lastUpdated: "asc" }
        ],
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              genderRestriction: true
            }
          }
        }
      }),
      prisma.playerRanking.count({ where })
    ])

    // Calcular posiciones reales basadas en el ranking global
    const rankingsWithPositions = await Promise.all(
      rankings.map(async (ranking) => {
        // Contar cuántos jugadores tienen más puntos en la misma categoría y temporada
        const betterRankingsCount = await prisma.playerRanking.count({
          where: {
            categoryId: ranking.categoryId,
            seasonYear: ranking.seasonYear,
            currentPoints: { gt: ranking.currentPoints },
            category: { isActive: true }
          }
        })

        return {
          ...ranking,
          position: betterRankingsCount + 1
        }
      })
    )

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      rankings: rankingsWithPositions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error("Error fetching rankings:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/rankings - Actualizar puntos de ranking (solo admins)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, categoryId, currentPoints, seasonYear } = body

    if (!playerId || !categoryId || currentPoints === undefined) {
      return NextResponse.json(
        { error: "playerId, categoryId y currentPoints son requeridos" },
        { status: 400 }
      )
    }

    const year = seasonYear || new Date().getFullYear()

    // Verificar que el ranking existe
    const existingRanking = await prisma.playerRanking.findUnique({
      where: {
        playerId_categoryId_seasonYear: {
          playerId,
          categoryId,
          seasonYear: year
        }
      }
    })

    if (!existingRanking) {
      return NextResponse.json(
        { error: "Ranking no encontrado" },
        { status: 404 }
      )
    }

    // Actualizar puntos
    const updatedRanking = await prisma.playerRanking.update({
      where: {
        id: existingRanking.id
      },
      data: {
        currentPoints: parseInt(currentPoints),
        lastUpdated: new Date()
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedRanking)

  } catch (error) {
    console.error("Error updating ranking:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}