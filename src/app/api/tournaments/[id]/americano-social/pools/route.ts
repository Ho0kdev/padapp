import { NextRequest, NextResponse } from "next/server"
import { AmericanoSocialService } from "@/lib/services/americano-social-service"
import { requireAuth, handleAuthError } from "@/lib/rbac"

// GET /api/tournaments/[id]/americano-social/pools - Obtener pools y ranking
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
        { error: "categoryId es requerido" },
        { status: 400 }
      )
    }

    const pools = await AmericanoSocialService.getPools(id, categoryId)
    // Obtener ranking de TODAS las categorías del torneo
    const allRankings = await AmericanoSocialService.getAllCategoriesRanking(id)

    return NextResponse.json({
      pools,
      ranking: allRankings
    })

  } catch (error) {
    return handleAuthError(error)
  }
}
