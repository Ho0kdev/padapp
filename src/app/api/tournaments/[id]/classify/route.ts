import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { BracketService } from "@/lib/services/bracket-service"
import { z } from "zod"

const classifySchema = z.object({
  categoryId: z.string().min(1, "La categoría es requerida")
})

/**
 * POST /api/tournaments/[id]/classify
 * Clasifica equipos de fase de grupos a fase eliminatoria
 * (Asigna top 2 de cada grupo a los cuartos de final)
 *
 * Requiere: ADMIN o ORGANIZER
 *
 * Body:
 * {
 *   "categoryId": "string"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: tournamentId } = await params

    const body = await request.json()
    const { categoryId } = classifySchema.parse(body)

    // Clasificar equipos a fase eliminatoria
    await BracketService.classifyTeamsToEliminationPhase(tournamentId, categoryId)

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: tournamentId,
        description: `Equipos clasificados a fase eliminatoria - categoría ${categoryId}`,
        metadata: {
          categoryId,
          phase: "GROUP_TO_ELIMINATION"
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Equipos clasificados exitosamente a fase eliminatoria"
    }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Datos inválidos",
        details: error.issues
      }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
