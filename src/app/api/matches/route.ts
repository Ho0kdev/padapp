import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const querySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  tournamentId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "WALKOVER", "all"]).optional(),
  courtId: z.string().optional(),
  phaseType: z.string().optional(),
  includeAmericano: z.string().optional().default("true"), // Incluir partidos de Americano Social
})

// Función auxiliar para construir ordenamiento dinámico
function buildOrderBy(orderBy?: string, order?: string): any {
  const validColumns = ['scheduledAt', 'status', 'roundNumber', 'matchNumber', 'createdAt']
  const validOrders: ('asc' | 'desc')[] = ['asc', 'desc']

  const column = orderBy && validColumns.includes(orderBy) ? orderBy : 'scheduledAt'
  const direction = (order && validOrders.includes(order as 'asc' | 'desc')) ? order as 'asc' | 'desc' : 'asc'

  // Para status y scheduledAt con null, necesitamos un ordenamiento especial
  if (column === 'scheduledAt') {
    return [
      { scheduledAt: { sort: direction, nulls: 'last' } },
      { roundNumber: 'asc' },
      { matchNumber: 'asc' }
    ]
  }

  return { [column]: direction }
}

/**
 * GET /api/matches
 * Lista partidos con paginación y filtros (incluye partidos convencionales y Americano Social)
 *
 * Query params:
 * - page: número de página (default: 1)
 * - limit: items por página (default: 10)
 * - tournamentId: filtrar por torneo
 * - categoryId: filtrar por categoría
 * - status: filtrar por estado (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, WALKOVER, all)
 * - courtId: filtrar por cancha
 * - phaseType: filtrar por fase (FINAL, SEMIFINALS, etc)
 * - orderBy: columna para ordenar (scheduledAt, status, roundNumber, matchNumber, createdAt)
 * - order: dirección de ordenamiento (asc, desc)
 * - includeAmericano: incluir partidos de Americano Social (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedQuery = querySchema.parse(params)
    const orderBy = searchParams.get("orderBy") || undefined
    const order = searchParams.get("order") || undefined
    const includeAmericano = validatedQuery.includeAmericano === "true"

    const page = parseInt(validatedQuery.page)
    const limit = parseInt(validatedQuery.limit)

    // Obtener el playerId del usuario actual (si no es ADMIN o CLUB_ADMIN)
    const userRole = session.user.role
    const isAdminOrClubAdmin = userRole === "ADMIN" || userRole === "CLUB_ADMIN"

    let currentPlayerId: string | null = null
    if (!isAdminOrClubAdmin) {
      const player = await prisma.player.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      })
      currentPlayerId = player?.id || null
    }

    // Construir filtros para partidos convencionales
    const whereConventional: any = {}

    if (validatedQuery.tournamentId) {
      whereConventional.tournamentId = validatedQuery.tournamentId
    }

    if (validatedQuery.categoryId) {
      whereConventional.categoryId = validatedQuery.categoryId
    }

    if (validatedQuery.status && validatedQuery.status !== "all") {
      whereConventional.status = validatedQuery.status
    }

    if (validatedQuery.courtId) {
      whereConventional.courtId = validatedQuery.courtId
    }

    if (validatedQuery.phaseType) {
      whereConventional.phaseType = validatedQuery.phaseType
    }

    // Si es PLAYER o REFEREE, filtrar solo partidos donde participa
    if (currentPlayerId) {
      whereConventional.OR = [
        {
          team1: {
            OR: [
              { registration1: { playerId: currentPlayerId } },
              { registration2: { playerId: currentPlayerId } }
            ]
          }
        },
        {
          team2: {
            OR: [
              { registration1: { playerId: currentPlayerId } },
              { registration2: { playerId: currentPlayerId } }
            ]
          }
        }
      ]
    }

    // Construir filtros para partidos Americano Social
    const whereAmericano: any = {}

    if (validatedQuery.tournamentId) {
      whereAmericano.tournamentId = validatedQuery.tournamentId
    }

    if (validatedQuery.categoryId) {
      whereAmericano.categoryId = validatedQuery.categoryId
    }

    if (validatedQuery.status && validatedQuery.status !== "all") {
      whereAmericano.status = validatedQuery.status
    }

    // Si es PLAYER o REFEREE, filtrar solo partidos donde participa
    if (currentPlayerId) {
      whereAmericano.OR = [
        { player1Id: currentPlayerId },
        { player2Id: currentPlayerId },
        { player3Id: currentPlayerId },
        { player4Id: currentPlayerId }
      ]
    }

    // Obtener partidos convencionales y Americano Social en paralelo
    const [conventionalMatches, americanoMatches] = await Promise.all([
      // Partidos convencionales
      prisma.match.findMany({
        where: whereConventional,
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
          },
          sets: {
            select: {
              setNumber: true,
              team1Games: true,
              team2Games: true,
              team1TiebreakPoints: true,
              team2TiebreakPoints: true
            },
            orderBy: {
              setNumber: 'asc'
            }
          }
        },
      }),
      // Partidos Americano Social (solo si includeAmericano = true)
      includeAmericano
        ? prisma.americanoPoolMatch.findMany({
            where: whereAmericano,
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
              pool: {
                select: {
                  id: true,
                  poolNumber: true,
                  roundNumber: true
                }
              },
              player1: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              player2: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              player3: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              player4: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          })
        : []
    ])

    // Normalizar partidos Americano Social para que tengan la misma estructura
    const normalizedAmericanoMatches = americanoMatches.map((match: any) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      categoryId: match.categoryId,
      status: match.status,
      phaseType: "GROUP_STAGE", // Americano Social no tiene fases
      roundNumber: match.roundNumber,
      matchNumber: null,
      scheduledAt: match.scheduledFor,
      team1SetsWon: match.winnerTeam === "A" ? 1 : 0,
      team2SetsWon: match.winnerTeam === "B" ? 1 : 0,
      isAmericano: true, // Marcador para identificar tipo de partido
      // Para Americano Social, crear un set único con el puntaje de games
      sets: match.teamAScore !== null && match.teamBScore !== null ? [{
        setNumber: 1,
        team1Games: match.teamAScore,
        team2Games: match.teamBScore,
        team1TiebreakPoints: null,
        team2TiebreakPoints: null
      }] : [],
      tournament: match.tournament,
      category: {
        id: match.categoryId,
        name: `Pool ${match.pool.poolNumber}`,
        type: "AMERICANO_SOCIAL"
      },
      team1: {
        id: `${match.id}-teamA`,
        name: `${match.player1.firstName} ${match.player1.lastName} / ${match.player2.firstName} ${match.player2.lastName}`,
        registration1: {
          player: match.player1
        },
        registration2: {
          player: match.player2
        }
      },
      team2: {
        id: `${match.id}-teamB`,
        name: `${match.player3.firstName} ${match.player3.lastName} / ${match.player4.firstName} ${match.player4.lastName}`,
        registration1: {
          player: match.player3
        },
        registration2: {
          player: match.player4
        }
      },
      court: null,
      winnerTeam: match.winnerTeam === "A"
        ? {
            id: `${match.id}-teamA`,
            name: `${match.player1.firstName} ${match.player1.lastName} / ${match.player2.firstName} ${match.player2.lastName}`
          }
        : match.winnerTeam === "B"
        ? {
            id: `${match.id}-teamB`,
            name: `${match.player3.firstName} ${match.player3.lastName} / ${match.player4.firstName} ${match.player4.lastName}`
          }
        : null,
      zone: {
        id: match.pool.id,
        name: `Pool ${match.pool.poolNumber} - Ronda ${match.pool.roundNumber}`
      }
    }))

    // Combinar ambos tipos de partidos
    const allMatches = [
      ...conventionalMatches.map(m => ({ ...m, isAmericano: false })),
      ...normalizedAmericanoMatches
    ]

    // Ordenar manualmente según el criterio
    const sortedMatches = allMatches.sort((a, b) => {
      if (orderBy === 'scheduledAt' || !orderBy) {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
        return order === 'desc' ? dateB - dateA : dateA - dateB
      }
      if (orderBy === 'status') {
        return order === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status)
      }
      return 0
    })

    // Aplicar paginación
    const skip = (page - 1) * limit
    const paginatedMatches = sortedMatches.slice(skip, skip + limit)
    const total = sortedMatches.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      matches: paginatedMatches,
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
