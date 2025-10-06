import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { PhaseType } from "@prisma/client"

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

    return NextResponse.json({
      zones,
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
