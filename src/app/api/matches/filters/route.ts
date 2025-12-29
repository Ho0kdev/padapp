import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, handleAuthError } from "@/lib/rbac"

/**
 * GET /api/matches/filters
 * Endpoint para obtener filtros dinámicos (torneos y categorías) basados en partidos existentes
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Obtener todos los torneos únicos que tienen partidos
    const tournaments = await prisma.tournament.findMany({
      where: {
        matches: {
          some: {} // Solo torneos con al menos un partido
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Obtener todas las categorías únicas que tienen partidos
    const categories = await prisma.category.findMany({
      where: {
        matches: {
          some: {} // Solo categorías con al menos un partido
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      tournaments,
      categories
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
