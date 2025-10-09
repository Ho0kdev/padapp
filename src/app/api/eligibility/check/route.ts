import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { checkCategoryEligibility } from "@/lib/eligibility"
import { z } from "zod"

const checkEligibilitySchema = z.object({
  playerId: z.string().min(1, "ID de jugador es requerido"),
  categoryId: z.string().min(1, "ID de categoría es requerido"),
})

// POST /api/eligibility/check - Verificar elegibilidad de un jugador para una categoría
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { playerId, categoryId } = checkEligibilitySchema.parse(body)

    const result = await checkCategoryEligibility(playerId, categoryId)

    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}
