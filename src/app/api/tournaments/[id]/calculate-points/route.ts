import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import PointsCalculationService from "@/lib/services/points-calculation-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/tournaments/[id]/calculate-points - Calcular puntos para torneo completado
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params

    // Obtener torneo para verificación RBAC
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        organizerId: true,
        _count: {
          select: {
            teams: true,
            stats: true
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Solo ADMIN puede calcular puntos (operación crítica)
    await authorize(Action.MANAGE, Resource.RANKING, undefined, request)

    // Validaciones de negocio
    if (tournament.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "El torneo debe estar completado para calcular puntos" },
        { status: 400 }
      )
    }

    if (tournament._count.teams === 0) {
      return NextResponse.json(
        { error: "El torneo no tiene equipos registrados" },
        { status: 400 }
      )
    }

    if (tournament._count.stats === 0) {
      return NextResponse.json(
        { error: "El torneo no tiene estadísticas generadas" },
        { status: 400 }
      )
    }

    // Ejecutar cálculo completo de puntos
    await PointsCalculationService.processCompletedTournament(id)

    // Obtener resumen de puntos calculados
    const updatedStats = await prisma.tournamentStats.findMany({
      where: { tournamentId: id },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        pointsEarned: 'desc'
      }
    })

    const summary = {
      tournamentId: id,
      tournamentName: tournament.name,
      playersProcessed: updatedStats.length,
      totalPointsAwarded: updatedStats.reduce((sum, stat) => sum + stat.pointsEarned, 0),
      topScorers: updatedStats.slice(0, 5).map(stat => ({
        playerName: `${stat.player.firstName} ${stat.player.lastName}`,
        email: stat.player.user.email,
        pointsEarned: stat.pointsEarned,
        finalPosition: stat.finalPosition
      }))
    }

    return NextResponse.json({
      message: "Puntos calculados exitosamente",
      summary
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}