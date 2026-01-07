import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { updateTeamStatusSchema } from "@/lib/validations/team"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/teams/[id]/status
 *
 * Actualiza el estado de un equipo
 * Solo ADMIN y ORGANIZER pueden cambiar estados
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Obtener equipo con relaciones necesarias para RBAC
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            organizerId: true
          }
        },
        registration1: {
          include: {
            player: {
              select: {
                userId: true
              }
            }
          }
        },
        registration2: {
          include: {
            player: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // El sistema RBAC verifica automáticamente ownership y permisos
    await authorize(Action.UPDATE, Resource.TEAM, team, request)

    // Validar datos
    const body = await request.json()
    const validation = updateTeamStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.issues.map(issue => issue.message)
        },
        { status: 400 }
      )
    }

    const { status, notes } = validation.data

    // Validar transición de estado
    const currentStatus = team.status
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["DRAFT", "CANCELLED"],
      CANCELLED: ["DRAFT", "CONFIRMED"]
    }

    const allowedTransitions = validTransitions[currentStatus] || []
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `No se puede cambiar de ${currentStatus} a ${status}` },
        { status: 400 }
      )
    }

    // Actualizar estado del equipo
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes: team.notes ? `${team.notes}\n\n[${new Date().toLocaleString()}] ${notes}` : notes })
      }
    })

    return NextResponse.json({
      message: "Estado actualizado exitosamente",
      team: updatedTeam
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}
