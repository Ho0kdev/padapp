import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const scheduleSchema = z.object({
  scheduledFor: z.string().datetime().nullable().optional(),
}).refine(data => data.scheduledFor !== undefined, {
  message: "Debe proporcionar scheduledFor"
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/americano-matches/[id]/schedule
 *
 * Asigna o actualiza el horario de un partido Americano Social.
 *
 * **Permisos requeridos:** ADMIN o ORGANIZER
 *
 * **Request Body:**
 * ```json
 * {
 *   "scheduledFor": "2025-10-15T10:00:00Z" | null
 * }
 * ```
 *
 * **Validaciones:**
 * - El partido debe existir
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Partido programado exitosamente",
 *   "data": { ...match }
 * }
 * ```
 *
 * **Errores posibles:**
 * - 400: Datos inválidos
 * - 404: Partido no encontrado
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN y ORGANIZER pueden programar partidos
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Parsear y validar body
    const body = await request.json()
    const validatedData = scheduleSchema.parse(body)

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

    // Guardar valores anteriores para el log
    const oldData = {
      scheduledFor: match.scheduledFor
    }

    // Actualizar el partido
    const updatedMatch = await prisma.americanoPoolMatch.update({
      where: { id: matchId },
      data: {
        scheduledFor: validatedData.scheduledFor
          ? new Date(validatedData.scheduledFor)
          : null
      }
    })

    // Preparar descripción del cambio
    let changeDescription = `Partido Americano ${match.pool.name} - Ronda ${match.roundNumber} programado`

    if (validatedData.scheduledFor === null) {
      changeDescription += " - horario eliminado"
    } else if (validatedData.scheduledFor) {
      changeDescription += ` - horario: ${new Date(validatedData.scheduledFor).toLocaleString('es-AR')}`
    }

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: match.tournament.id,
        description: changeDescription,
        metadata: {
          matchId,
          tournamentName: match.tournament.name,
          poolName: match.pool.name,
          roundNumber: match.roundNumber,
          oldData,
          newData: {
            scheduledFor: updatedMatch.scheduledFor
          }
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Partido programado exitosamente",
      data: updatedMatch
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
