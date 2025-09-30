import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/rankings/[id] - Obtener ranking específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const ranking = await prisma.playerRanking.findUnique({
      where: { id },
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
            type: true
          }
        }
      }
    })

    if (!ranking) {
      return NextResponse.json({ error: "Ranking no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ranking })

  } catch (error) {
    return handleAuthError(error)
  }
}

// DELETE /api/rankings/[id] - Eliminar ranking (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.DELETE, Resource.RANKING)
    const { id } = await params

    // Obtener el ranking antes de eliminarlo para el log
    const ranking = await prisma.playerRanking.findUnique({
      where: { id },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        category: {
          select: {
            name: true
          }
        }
      }
    })

    if (!ranking) {
      return NextResponse.json({ error: "Ranking no encontrado" }, { status: 404 })
    }

    // Eliminar el ranking
    await prisma.playerRanking.delete({
      where: { id }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.RANKING,
      resourceId: id,
      description: `Ranking eliminado: ${ranking.player.firstName} ${ranking.player.lastName} - ${ranking.category.name}`,
      oldData: ranking,
    }, request)

    return NextResponse.json({
      message: "Ranking eliminado exitosamente",
      deletedRanking: {
        playerName: `${ranking.player.firstName} ${ranking.player.lastName}`,
        categoryName: ranking.category.name,
        seasonYear: ranking.seasonYear
      }
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT /api/rankings/[id] - Actualizar puntos de ranking (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.RANKING)
    const { id } = await params
    const { currentPoints, reason } = await request.json()

    if (typeof currentPoints !== 'number' || currentPoints < 0) {
      return NextResponse.json(
        { error: "Los puntos deben ser un número válido mayor o igual a 0" },
        { status: 400 }
      )
    }

    // Obtener el ranking actual
    const existingRanking = await prisma.playerRanking.findUnique({
      where: { id },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        category: {
          select: {
            name: true
          }
        }
      }
    })

    if (!existingRanking) {
      return NextResponse.json({ error: "Ranking no encontrado" }, { status: 404 })
    }

    const oldPoints = existingRanking.currentPoints

    // Actualizar el ranking
    const updatedRanking = await prisma.playerRanking.update({
      where: { id },
      data: {
        currentPoints,
        lastUpdated: new Date()
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
      resourceId: id,
      description: reason || `Ajuste manual de puntos para ${updatedRanking.player.firstName} ${updatedRanking.player.lastName}`,
      oldData: { currentPoints: oldPoints },
      newData: { currentPoints },
    }, request)

    return NextResponse.json({
      ranking: updatedRanking,
      message: "Puntos actualizados exitosamente"
    })

  } catch (error) {
    return handleAuthError(error)
  }
}