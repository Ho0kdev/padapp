import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { updateTeamStatusSchema } from "@/lib/validations/team"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/teams/[id]/status
 *
 * Actualiza el estado de un equipo
 * Solo ADMIN y CLUB_ADMIN pueden cambiar estados
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    // Solo admins pueden cambiar estados
    if (session.user.role !== "ADMIN" && session.user.role !== "CLUB_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para cambiar el estado de equipos" },
        { status: 403 }
      )
    }

    // Obtener equipo
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
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que sea organizador o ADMIN
    const isOrganizer = team.tournament.organizerId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isAdmin && !isOrganizer) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar este equipo" },
        { status: 403 }
      )
    }

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
    console.error("Error updating team status:", error)
    return NextResponse.json(
      { error: "Error al actualizar el estado del equipo" },
      { status: 500 }
    )
  }
}
