import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/rankings/seasons - Obtener años disponibles en rankings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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
    console.error("Error fetching available seasons:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}