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
 * Y también información sobre restricciones de género de la categoría
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

    // Obtener información de la categoría para conocer restricciones de género y nivel
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        genderRestriction: true,
        level: true,
      }
    })

    // Buscar todas las registrations activas en esta categoría
    const registrations = await prisma.registration.findMany({
      where: {
        tournamentId,
        categoryId,
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED', 'WAITLIST']
        }
      },
      select: {
        playerId: true,
      }
    })

    // Extraer IDs únicos de jugadores
    const playerIds = new Set<string>()
    registrations.forEach(reg => {
      playerIds.add(reg.playerId)
    })

    return NextResponse.json(
      {
        playerIds: Array.from(playerIds),
        genderRestriction: category?.genderRestriction || null,
        categoryLevel: category?.level || null
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error checking registered players:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Error al verificar jugadores inscritos",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
