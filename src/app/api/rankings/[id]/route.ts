import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RankingsLogService } from "@/lib/services/rankings-log-service"

// GET /api/rankings/[id] - Obtener ranking específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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
    console.error("Error fetching ranking:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/rankings/[id] - Eliminar ranking (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden eliminar rankings" },
        { status: 403 }
      )
    }

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

    // Registrar en el log
    await RankingsLogService.logRankingDeleted(
      {
        userId: session.user.id,
        rankingId: id,
        playerId: ranking.playerId,
        categoryId: ranking.categoryId
      },
      ranking
    )

    return NextResponse.json({
      message: "Ranking eliminado exitosamente",
      deletedRanking: {
        playerName: `${ranking.player.firstName} ${ranking.player.lastName}`,
        categoryName: ranking.category.name,
        seasonYear: ranking.seasonYear
      }
    })

  } catch (error) {
    console.error("Error deleting ranking:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/rankings/[id] - Actualizar puntos de ranking (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden actualizar rankings" },
        { status: 403 }
      )
    }

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

    // Registrar en el log
    await RankingsLogService.logManualAdjustment(
      {
        userId: session.user.id,
        rankingId: id,
        playerId: updatedRanking.playerId,
        categoryId: updatedRanking.categoryId
      },
      updatedRanking,
      oldPoints,
      currentPoints,
      reason || "Ajuste manual desde dashboard"
    )

    return NextResponse.json({
      ranking: updatedRanking,
      message: "Puntos actualizados exitosamente"
    })

  } catch (error) {
    console.error("Error updating ranking:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}