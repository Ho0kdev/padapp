import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BracketService } from "@/lib/services/bracket-service"

/**
 * GET /api/tournaments/[id]/groups?categoryId=xxx
 * Obtiene todos los grupos de un torneo/categoría con sus tablas de posiciones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: tournamentId } = await params

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")

    if (!categoryId) {
      return NextResponse.json({
        error: "El parámetro categoryId es requerido"
      }, { status: 400 })
    }

    // Obtener todas las zonas/grupos
    const zones = await prisma.tournamentZone.findMany({
      where: {
        tournamentId,
        categoryId,
        phaseType: "GROUP_STAGE"
      },
      include: {
        teams: {
          orderBy: {
            position: 'asc'
          },
          include: {
            team: {
              include: {
                registration1: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                },
                registration2: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calcular tabla de cada grupo
    const groupsWithStandings = await Promise.all(
      zones.map(async (zone) => {
        try {
          const standings = await BracketService.calculateGroupStandings(zone.id)
          return {
            ...zone,
            standings
          }
        } catch (error) {
          return {
            ...zone,
            standings: []
          }
        }
      })
    )

    return NextResponse.json({
      groups: groupsWithStandings
    }, { status: 200 })

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
