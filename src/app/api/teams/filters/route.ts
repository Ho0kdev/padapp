import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/teams/filters
 *
 * Retorna las categorías y torneos que tienen equipos reales
 * Usado para poblar los filtros dinámicamente con solo datos relevantes
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Obtener categorías únicas con equipos
    const categories = await prisma.category.findMany({
      where: {
        teams: {
          some: {} // Solo categorías que tienen al menos un equipo
        }
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Obtener torneos únicos con equipos
    const tournaments = await prisma.tournament.findMany({
      where: {
        teams: {
          some: {} // Solo torneos que tienen al menos un equipo
        }
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      categories,
      tournaments
    })

  } catch (error) {
    return handleAuthError(error)
  }
}
