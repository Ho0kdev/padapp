import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TournamentStatusService } from "@/lib/services/tournament-status-service"

// GET /api/tournaments/status-update - Obtener torneos que necesitan actualización automática
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const tournaments = await TournamentStatusService.getTournamentsNeedingStatusUpdate()

    return NextResponse.json({
      tournaments,
      count: tournaments.length
    })

  } catch (error) {
    console.error("Error checking tournament statuses:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/status-update - Ejecutar actualización automática de estados
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo permitir a administradores ejecutar esto manualmente
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden ejecutar actualizaciones automáticas" },
        { status: 403 }
      )
    }

    const result = await TournamentStatusService.updateTournamentStatusesAutomatically()

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error updating tournament statuses:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}