import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/rankings - Obtener lista de rankings
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

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
      },
      player: {
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
            category: { isActive: true },
            player: { isActive: true }
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
    return handleAuthError(error)
  }
}

// PUT /api/rankings - Actualizar puntos de ranking (solo admins)
export async function PUT(request: NextRequest) {
  try {
    const session = await authorize(Action.UPDATE, Resource.RANKING)

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

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.RANKING,
      resourceId: updatedRanking.id,
      description: `Puntos de ranking actualizados para ${updatedRanking.player.firstName} ${updatedRanking.player.lastName}`,
      oldData: { currentPoints: existingRanking.currentPoints },
      newData: { currentPoints: updatedRanking.currentPoints },
    }, request)

    return NextResponse.json(updatedRanking)

  } catch (error) {
    return handleAuthError(error)
  }
}