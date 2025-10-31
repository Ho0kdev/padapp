import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/americano-matches/[id]
 *
 * Obtiene los detalles completos de un partido Americano Social.
 *
 * **Permisos requeridos:** Usuario autenticado
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "id": "match-id",
 *   "roundNumber": 1,
 *   "status": "SCHEDULED",
 *   "teamAScore": 13,
 *   "teamBScore": 11,
 *   "winnerTeam": "A",
 *   "scheduledFor": "2024-01-15T10:00:00Z",
 *   "completedAt": "2024-01-15T11:30:00Z",
 *   "pool": { ... },
 *   "tournament": { ... },
 *   "category": { ... },
 *   "player1": { ... },
 *   "player2": { ... },
 *   "player3": { ... },
 *   "player4": { ... },
 *   "sets": [...]
 * }
 * ```
 *
 * **Errores posibles:**
 * - 404: Partido no encontrado
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireAuth()
    const { id: matchId } = await params

    const match = await prisma.americanoPoolMatch.findUnique({
      where: { id: matchId },
      include: {
        pool: {
          select: {
            id: true,
            name: true,
            poolNumber: true,
            roundNumber: true
          }
        },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            setsToWin: true,
            gamesToWinSet: true,
            tiebreakAt: true,
            goldenPoint: true,
            organizerId: true
          }
        },
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            rankingPoints: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        player2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            rankingPoints: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        player3: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            rankingPoints: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        player4: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            rankingPoints: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        sets: {
          orderBy: {
            setNumber: 'asc'
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    return NextResponse.json(match, { status: 200 })

  } catch (error) {
    return handleAuthError(error)
  }
}
