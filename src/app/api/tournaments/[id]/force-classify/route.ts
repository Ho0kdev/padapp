import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BracketService } from "@/lib/services/bracket-service"
import { PhaseType } from "@prisma/client"

/**
 * ENDPOINT TEMPORAL DE PRUEBA
 * Fuerza el cálculo de tablas y clasificación a fase eliminatoria
 * DELETE THIS FILE AFTER TESTING
 */
export async function POST(
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

    console.log('🔧 FORZANDO CLASIFICACIÓN PARA TESTING...')

    // Calcular tablas de todos los grupos
    const zones = await prisma.tournamentZone.findMany({
      where: {
        tournamentId: id,
        categoryId,
        phaseType: PhaseType.GROUP_STAGE
      }
    })

    console.log(`📊 Encontrados ${zones.length} grupos`)

    for (const zone of zones) {
      const standings = await BracketService.calculateGroupStandings(zone.id)
      console.log(`📊 Tabla de ${zone.name} calculada:`, standings)
    }

    // Clasificar a fase eliminatoria
    await BracketService.classifyTeamsToEliminationPhase(id, categoryId)

    // Verificar equipos asignados
    const eliminationMatches = await prisma.match.findMany({
      where: {
        tournamentId: id,
        categoryId,
        roundNumber: 10
      },
      include: {
        team1: {
          select: {
            name: true,
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
        },
        team2: {
          select: {
            name: true,
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
      },
      orderBy: {
        matchNumber: 'asc'
      }
    })

    console.log(`✅ Fase eliminatoria tiene ${eliminationMatches.length} partidos`)

    return NextResponse.json({
      success: true,
      message: "Clasificación forzada exitosamente",
      data: {
        zonesCalculated: zones.length,
        eliminationMatches: eliminationMatches.map(m => ({
          matchNumber: m.matchNumber,
          team1: m.team1 ? (m.team1.name || `${m.team1.registration1.player.firstName} ${m.team1.registration1.player.lastName}`) : 'TBD',
          team2: m.team2 ? (m.team2.name || `${m.team2.registration1.player.firstName} ${m.team2.registration1.player.lastName}`) : 'TBD'
        }))
      }
    })

  } catch (error) {
    console.error("Error forzando clasificación:", error)
    return NextResponse.json(
      {
        error: "Error al forzar clasificación",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
