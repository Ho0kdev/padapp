import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, handleAuthError } from "@/lib/rbac"

/**
 * GET /api/tournaments/[id]/americano-social/categories-summary
 *
 * Retorna un resumen del estado de pools para todas las categorías del torneo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: tournamentId } = await params

    // Verificar que el torneo existe y es AMERICANO_SOCIAL
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        type: true,
        categories: {
          include: {
            category: true
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

    if (tournament.type !== "AMERICANO_SOCIAL") {
      return NextResponse.json(
        { error: "Este endpoint es solo para torneos Americano Social" },
        { status: 400 }
      )
    }

    // Para cada categoría, obtener el estado de pools
    const categoriesWithStatus = await Promise.all(
      tournament.categories.map(async (tournamentCategory) => {
        const categoryId = tournamentCategory.categoryId

        // Contar jugadores confirmados/pagados en esta categoría
        const confirmedPlayers = await prisma.registration.count({
          where: {
            tournamentId,
            categoryId,
            registrationStatus: {
              in: ["CONFIRMED", "PAID"]
            }
          }
        })

        // Obtener pools existentes para esta categoría
        const pools = await prisma.americanoPool.findMany({
          where: {
            tournamentId,
            categoryId
          },
          include: {
            matches: {
              select: {
                id: true,
                status: true
              }
            }
          },
          orderBy: {
            roundNumber: 'asc'
          }
        })

        const hasPools = pools.length > 0

        // Calcular estadísticas de pools
        let poolsStats = null
        if (hasPools) {
          const totalPools = pools.length
          const totalMatches = pools.reduce((acc, pool) => acc + pool.matches.length, 0)
          const completedMatches = pools.reduce(
            (acc, pool) => acc + pool.matches.filter(m => m.status === 'COMPLETED').length,
            0
          )

          // Agrupar pools por ronda
          const roundsMap = new Map<number, number>()
          pools.forEach(pool => {
            const round = pool.roundNumber || 1
            roundsMap.set(round, (roundsMap.get(round) || 0) + 1)
          })
          const numberOfRounds = roundsMap.size
          const poolsPerRound = roundsMap.get(1) || 0 // Pools en la primera ronda

          poolsStats = {
            totalPools,
            totalMatches,
            completedMatches,
            numberOfRounds,
            poolsPerRound
          }
        }

        return {
          categoryId,
          categoryName: tournamentCategory.category.name,
          confirmedPlayers,
          hasPools,
          poolsStats
        }
      })
    )

    return NextResponse.json({
      tournamentId,
      categories: categoriesWithStatus
    })
  } catch (error) {
    console.error("Error en categories-summary:", error)
    return handleAuthError(error)
  }
}
