import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/registrations/filters
 *
 * Retorna las categorías y torneos que tienen inscripciones reales
 * Usado para poblar los filtros dinámicamente con solo datos relevantes
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Obtener categorías únicas con inscripciones
    const categories = await prisma.category.findMany({
      where: {
        registrations: {
          some: {} // Solo categorías que tienen al menos una inscripción
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

    // Obtener torneos únicos con inscripciones
    const tournaments = await prisma.tournament.findMany({
      where: {
        registrations: {
          some: {} // Solo torneos que tienen al menos una inscripción
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
