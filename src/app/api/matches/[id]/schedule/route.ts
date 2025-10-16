import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { MatchLogService } from "@/lib/services/match-log-service"
import { z } from "zod"

const scheduleSchema = z.object({
  courtId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
}).refine(data => data.courtId !== undefined || data.scheduledAt !== undefined, {
  message: "Debe proporcionar al menos courtId o scheduledAt"
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/matches/[id]/schedule
 *
 * Asigna o actualiza la cancha y/o horario de un partido.
 *
 * **Permisos requeridos:** ADMIN o CLUB_ADMIN
 *
 * **Request Body:**
 * ```json
 * {
 *   "courtId": "court-id" | null,
 *   "scheduledAt": "2025-10-15T10:00:00Z" | null
 * }
 * ```
 *
 * **Validaciones:**
 * - El partido debe existir
 * - Si se proporciona courtId, la cancha debe existir y estar activa
 * - Al menos uno de los campos debe proporcionarse
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
 * - 404: Partido o cancha no encontrados
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN y CLUB_ADMIN pueden programar partidos
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Parsear y validar body
    const body = await request.json()
    const validatedData = scheduleSchema.parse(body)

    // Obtener el partido con todas las relaciones necesarias
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        court: {
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

    // Si se proporciona courtId, validar que la cancha existe y está disponible
    if (validatedData.courtId) {
      const court = await prisma.court.findUnique({
        where: { id: validatedData.courtId }
      })

      if (!court) {
        return NextResponse.json({
          error: "Cancha no encontrada"
        }, { status: 404 })
      }

      if (court.deleted || court.status === 'UNAVAILABLE') {
        return NextResponse.json({
          error: "La cancha seleccionada no está disponible"
        }, { status: 400 })
      }
    }

    // Guardar valores anteriores para el log
    const oldData = {
      courtId: match.courtId,
      courtName: match.court?.name || null,
      scheduledAt: match.scheduledAt
    }

    // Actualizar el partido
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        courtId: validatedData.courtId !== undefined ? validatedData.courtId : match.courtId,
        scheduledAt: validatedData.scheduledAt !== undefined
          ? (validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null)
          : match.scheduledAt
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            club: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Preparar descripción del cambio
    let changeDescription = `Partido ${match.matchNumber || matchId} programado`
    const changes: string[] = []

    if (validatedData.courtId !== undefined) {
      if (validatedData.courtId === null) {
        changes.push("cancha eliminada")
      } else {
        changes.push(`cancha asignada: ${updatedMatch.court?.name}`)
      }
    }

    if (validatedData.scheduledAt !== undefined) {
      if (validatedData.scheduledAt === null) {
        changes.push("horario eliminado")
      } else {
        changes.push(`horario: ${new Date(validatedData.scheduledAt).toLocaleString('es-AR')}`)
      }
    }

    if (changes.length > 0) {
      changeDescription += ` - ${changes.join(", ")}`
    }

    // Registrar auditoría general
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
          categoryName: match.category.name,
          oldData,
          newData: {
            courtId: updatedMatch.courtId,
            courtName: updatedMatch.court?.name || null,
            scheduledAt: updatedMatch.scheduledAt
          }
        }
      },
      request
    )

    // Registrar en log específico de matches
    await MatchLogService.logMatchUpdated(
      {
        userId: session.user.id,
        matchId
      },
      oldData,
      {
        courtId: updatedMatch.courtId,
        scheduledAt: updatedMatch.scheduledAt
      }
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
