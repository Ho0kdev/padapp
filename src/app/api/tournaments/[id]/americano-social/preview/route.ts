import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AmericanoSocialService } from "@/lib/services/americano-social-service"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { z } from "zod"

const previewSchema = z.object({
  categoryId: z.string().min(1, "El ID de la categoría es requerido"),
  numberOfRounds: z.number().int().min(1).max(10).optional()
})

/**
 * GET /api/tournaments/[id]/americano-social/preview
 *
 * Devuelve información de preview para la generación de pools sin guardar nada en BD:
 * - Número de jugadores confirmados/pagados
 * - Número de pools que se generarían
 * - Rondas recomendadas (mín, óptimo, máx)
 * - Vista previa de distribución por ronda
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el torneo exista y sea tipo AMERICANO_SOCIAL
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        americanoRounds: true,
        categories: {
          where: { categoryId },
          include: {
            category: {
              select: { id: true, name: true }
            }
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
        { error: "Este torneo no es de tipo Americano Social" },
        { status: 400 }
      )
    }

    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "La categoría no pertenece a este torneo" },
        { status: 400 }
      )
    }

    // Obtener jugadores confirmados y pagados
    const registrations = await prisma.registration.findMany({
      where: {
        tournamentId: id,
        categoryId,
        registrationStatus: {
          in: ["CONFIRMED", "PAID"]
        }
      },
      select: {
        id: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const numPlayers = registrations.length
    const players = registrations.map(r => r.player)

    // Validar número de jugadores
    const isValidPlayerCount = numPlayers >= 4 && numPlayers % 4 === 0

    if (!isValidPlayerCount) {
      return NextResponse.json({
        isValid: false,
        numPlayers,
        error: numPlayers < 4
          ? "Se requieren al menos 4 jugadores confirmados/pagados"
          : `Americano Social requiere múltiplo de 4 jugadores. Hay ${numPlayers} jugadores.`,
        category: tournamentCategory.category,
        players
      })
    }

    // Calcular estadísticas
    const numPools = numPlayers / 4
    const roundsRecommendation = AmericanoSocialService.calculateOptimalRounds(numPlayers)

    // Verificar si ya existen pools
    const existingPools = await prisma.americanoPool.count({
      where: {
        tournamentId: id,
        categoryId
      }
    })

    return NextResponse.json({
      isValid: true,
      numPlayers,
      numPools,
      roundsRecommendation,
      currentRounds: tournament.americanoRounds || 1,
      hasExistingPools: existingPools > 0,
      existingPoolsCount: existingPools,
      category: tournamentCategory.category,
      players
    })

  } catch (error) {
    console.error("Error en preview:", error)
    return handleAuthError(error)
  }
}
