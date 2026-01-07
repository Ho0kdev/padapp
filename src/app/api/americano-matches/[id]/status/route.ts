import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "WALKOVER"], {
    message: "El status debe ser uno de: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, WALKOVER"
  })
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/americano-matches/[id]/status
 *
 * Cambia el estado de un partido Americano Social.
 *
 * **Permisos requeridos:** ADMIN, ORGANIZER o REFEREE
 *
 * **Request Body:**
 * ```json
 * {
 *   "status": "SCHEDULED" | "IN_PROGRESS" | "CANCELLED" | "WALKOVER"
 * }
 * ```
 *
 * **Validaciones:**
 * - El partido debe existir
 * - No se puede cambiar el estado de un partido completado (excepto para reprogramarlo a SCHEDULED)
 * - No se puede usar este endpoint para marcar como COMPLETED (usar el diálogo de resultado en su lugar)
 *
 * **Transiciones de estado válidas:**
 * - SCHEDULED → IN_PROGRESS, CANCELLED
 * - IN_PROGRESS → SCHEDULED, CANCELLED, WALKOVER
 * - COMPLETED → SCHEDULED (solo para reprogramar)
 * - CANCELLED → SCHEDULED
 * - WALKOVER → SCHEDULED
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Estado actualizado exitosamente",
 *   "data": { ...match }
 * }
 * ```
 *
 * **Errores posibles:**
 * - 400: Estado inválido
 * - 400: Transición de estado no permitida
 * - 404: Partido no encontrado
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN, ORGANIZER y REFEREE pueden cambiar estados
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Parsear y validar body
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    // Obtener el partido con todas las relaciones necesarias
    const match = await prisma.americanoPoolMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true
          }
        },
        pool: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Validación: Partido debe existir
    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    // Validación: Transiciones de estado
    if ((match.status === "COMPLETED" || match.status === "WALKOVER") && status !== "SCHEDULED") {
      return NextResponse.json({
        error: "No se puede cambiar el estado de un partido completado o con walkover (excepto para reprogramarlo a SCHEDULED)"
      }, { status: 400 })
    }

    if (status === "COMPLETED") {
      return NextResponse.json({
        error: "Use el diálogo de carga de resultado para marcar un partido como completado"
      }, { status: 400 })
    }

    const oldStatus = match.status

    // Actualizar estado del partido
    const updatedMatch = await prisma.americanoPoolMatch.update({
      where: { id: matchId },
      data: { status }
    })

    // Registrar auditoría general
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: match.tournament.id,
        description: `Estado de partido Americano cambiado: ${oldStatus} → ${status}`,
        metadata: {
          matchId,
          oldStatus,
          newStatus: status,
          tournamentName: match.tournament.name,
          poolName: match.pool.name,
          roundNumber: match.roundNumber
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Estado actualizado exitosamente",
      data: updatedMatch
    }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Estado inválido",
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
