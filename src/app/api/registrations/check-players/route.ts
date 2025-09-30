import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkPlayersSchema = z.object({
  tournamentId: z.string().min(1, "El ID del torneo es requerido"),
  categoryId: z.string().min(1, "El ID de la categoría es requerido"),
})

/**
 * GET /api/registrations/check-players
 * Retorna los IDs de jugadores ya inscritos en una categoría de un torneo
 * Endpoint público (requiere autenticación pero no permisos especiales)
 * Usado para filtrar jugadores disponibles en el formulario de inscripción
 */
export async function GET(request: NextRequest) {
  try {
    // Solo requiere autenticación, no permisos especiales
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const validatedParams = checkPlayersSchema.parse(params)
    const { tournamentId, categoryId } = validatedParams

    // Buscar todos los equipos activos (no cancelados) en esta categoría
    const teams = await prisma.team.findMany({
      where: {
        tournamentId,
        categoryId,
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED', 'PAID', 'WAITLIST']
        }
      },
      select: {
        player1Id: true,
        player2Id: true,
      }
    })

    // Extraer IDs únicos de jugadores
    const playerIds = new Set<string>()
    teams.forEach(team => {
      playerIds.add(team.player1Id)
      playerIds.add(team.player2Id)
    })

    return NextResponse.json({
      playerIds: Array.from(playerIds)
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error checking registered players:", error)
    return NextResponse.json(
      { error: "Error al verificar jugadores inscritos" },
      { status: 500 }
    )
  }
}