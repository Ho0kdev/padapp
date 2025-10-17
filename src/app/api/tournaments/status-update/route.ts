import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { TournamentStatusService } from "@/lib/services/tournament-status-service"

// GET /api/tournaments/status-update - Obtener torneos que necesitan actualización automática
export async function GET(request: NextRequest) {
  try {
    // Requiere autenticación básica (cualquier usuario autenticado)
    await requireAuth(request, 'read')

    const tournaments = await TournamentStatusService.getTournamentsNeedingStatusUpdate()

    return NextResponse.json({
      tournaments,
      count: tournaments.length
    })

  } catch (error) {
    return handleAuthError(error, request)
  }
}

// POST /api/tournaments/status-update - Ejecutar actualización automática de estados
export async function POST(request: NextRequest) {
  try {
    // Solo admins pueden ejecutar actualizaciones masivas
    await authorize(Action.UPDATE, Resource.TOURNAMENT, undefined, request)

    const result = await TournamentStatusService.updateTournamentStatusesAutomatically()

    return NextResponse.json(result)

  } catch (error) {
    return handleAuthError(error, request)
  }
}