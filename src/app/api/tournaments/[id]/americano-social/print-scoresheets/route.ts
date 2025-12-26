import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, handleAuthError } from "@/lib/rbac"

/**
 * GET /api/tournaments/[id]/americano-social/print-scoresheets
 *
 * Retorna los datos de los pools para generar PDF en el cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const poolId = searchParams.get('poolId') // Opcional: solo un pool

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId es requerido" },
        { status: 400 }
      )
    }

    // Obtener pools con todos sus datos
    const whereClause: any = {
      tournamentId: id,
      categoryId
    }

    if (poolId) {
      whereClause.id = poolId
    }

    const pools = await prisma.americanoPool.findMany({
      where: whereClause,
      include: {
        players: {
          include: {
            player: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        matches: {
          include: {
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
          },
          orderBy: { roundNumber: 'asc' }
        }
      },
      orderBy: [
        { roundNumber: 'asc' },
        { poolNumber: 'asc' }
      ]
    })

    if (pools.length === 0) {
      return NextResponse.json(
        { error: "No hay pools generados para esta categoría" },
        { status: 404 }
      )
    }

    // Retornar los datos para que el cliente genere el PDF
    return NextResponse.json({ pools })

  } catch (error) {
    console.error("Error generando PDF:", error)
    return handleAuthError(error)
  }
}
