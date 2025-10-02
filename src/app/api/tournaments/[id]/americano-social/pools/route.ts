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
    const ranking = await AmericanoSocialService.getGlobalRanking(id, categoryId)

    return NextResponse.json({
      pools,
      ranking
    })

  } catch (error) {
    return handleAuthError(error)
  }
}
