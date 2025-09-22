import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/clubs - Obtener lista de clubes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const clubs = await prisma.club.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        email: true,
        _count: {
          select: {
            courts: true
          }
        }
      }
    })

    return NextResponse.json({ clubs })

  } catch (error) {
    console.error("Error fetching clubs:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}