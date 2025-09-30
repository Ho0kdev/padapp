import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { BracketService } from "@/lib/services/bracket-service"

/**
 * GET /api/tournaments/[id]/bracket?categoryId=xxx
 * Obtiene el bracket de un torneo para una categoría específica
 *
 * Query params:
 * - categoryId: ID de la categoría (requerido)
 *
 * Retorna:
 * {
 *   matches: Match[],
 *   rounds: Record<number, Match[]>,
 *   totalRounds: number,
 *   totalMatches: number
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")

    if (!categoryId) {
      return NextResponse.json({
        error: "El parámetro categoryId es requerido"
      }, { status: 400 })
    }

    const { id: tournamentId } = await params

    // Obtener bracket
    const bracket = await BracketService.getBracket(tournamentId, categoryId)

    return NextResponse.json(bracket, { status: 200 })

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
