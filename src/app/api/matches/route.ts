import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const querySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  tournamentId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "all"]).optional(),
  courtId: z.string().optional(),
  phaseType: z.string().optional(),
})

/**
 * GET /api/matches
 * Lista partidos con paginación y filtros
 *
 * Query params:
 * - page: número de página (default: 1)
 * - limit: items por página (default: 10)
 * - tournamentId: filtrar por torneo
 * - categoryId: filtrar por categoría
 * - status: filtrar por estado (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, all)
 * - courtId: filtrar por cancha
 * - phaseType: filtrar por fase (FINAL, SEMIFINALS, etc)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedQuery = querySchema.parse(params)

    const page = parseInt(validatedQuery.page)
    const limit = parseInt(validatedQuery.limit)
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (validatedQuery.tournamentId) {
      where.tournamentId = validatedQuery.tournamentId
    }

    if (validatedQuery.categoryId) {
      where.categoryId = validatedQuery.categoryId
    }

    if (validatedQuery.status && validatedQuery.status !== "all") {
      where.status = validatedQuery.status
    }

    if (validatedQuery.courtId) {
      where.courtId = validatedQuery.courtId
    }

    if (validatedQuery.phaseType) {
      where.phaseType = validatedQuery.phaseType
    }

    // Obtener matches con paginación
    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              setsToWin: true,
              gamesToWinSet: true,
              tiebreakAt: true,
              goldenPoint: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          team1: {
            select: {
              id: true,
              name: true,
              registration1: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          },
          team2: {
            select: {
              id: true,
              name: true,
              registration1: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          },
          court: {
            select: {
              id: true,
              name: true,
              club: {
                select: {
                  name: true
                }
              }
            }
          },
          referee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          winnerTeam: {
            select: {
              id: true,
              name: true
            }
          },
          zone: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // SCHEDULED primero
          { scheduledAt: 'asc' }, // Por horario
          { roundNumber: 'asc' }, // Por ronda
          { matchNumber: 'asc' } // Por número de partido
        ],
        skip,
        take: limit
      }),
      prisma.match.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}
