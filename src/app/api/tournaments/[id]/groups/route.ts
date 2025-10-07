import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { PhaseType } from "@prisma/client"
import { BracketService } from "@/lib/services/bracket-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      )
    }

    const zones = await prisma.tournamentZone.findMany({
      where: {
        tournamentId: id,
        categoryId,
        phaseType: PhaseType.GROUP_STAGE
      },
      include: {
        teams: {
          include: {
            team: {
              include: {
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
            }
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calcular estadísticas para cada grupo
    const zonesWithStats = await Promise.all(
      zones.map(async (zone) => {
        try {
          const standings = await BracketService.calculateGroupStandings(zone.id)
          return {
            ...zone,
            standings
          }
        } catch (error) {
          console.error(`Error calculating standings for zone ${zone.id}:`, error)
          return {
            ...zone,
            standings: []
          }
        }
      })
    )

    return NextResponse.json({
      zones: zonesWithStats,
      totalZones: zones.length,
      totalTeams: zones.reduce((acc, zone) => acc + zone.teams.length, 0)
    })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json(
      { error: "Error al obtener los grupos" },
      { status: 500 }
    )
  }
}
