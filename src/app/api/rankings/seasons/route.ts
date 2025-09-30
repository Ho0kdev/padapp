import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/rankings/seasons - Obtener años disponibles en rankings
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")

    // Construir where clause
    const where: any = {}
    if (categoryId) {
      where.categoryId = categoryId
    }

    // Obtener todos los años únicos de seasonYear en la tabla PlayerRanking
    const seasons = await prisma.playerRanking.findMany({
      where,
      select: {
        seasonYear: true
      },
      distinct: ['seasonYear'],
      orderBy: {
        seasonYear: 'desc'
      }
    })

    // Extraer solo los años y asegurarse de que siempre incluya el año actual
    const currentYear = new Date().getFullYear()
    const availableYears = [...new Set([
      currentYear,
      ...seasons.map(s => s.seasonYear)
    ])].sort((a, b) => b - a) // Ordenar descendente

    return NextResponse.json({
      seasons: availableYears
    })

  } catch (error) {
    return handleAuthError(error)
  }
}