import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BracketService } from "@/lib/services/bracket-service"
import { z } from "zod"

const matchResultSchema = z.object({
  winnerTeamId: z.string().min(1, "El equipo ganador es requerido"),
  sets: z.array(z.object({
    team1Games: z.number().int().min(0),
    team2Games: z.number().int().min(0),
    team1TiebreakPoints: z.number().int().min(0).optional(),
    team2TiebreakPoints: z.number().int().min(0).optional(),
  })).min(1, "Debe cargar al menos un set"),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional()
})

/**
 * POST /api/matches/[id]/result
 * Carga el resultado de un partido y progresa automáticamente al ganador
 *
 * Requiere permisos: ADMIN, CLUB_ADMIN o REFEREE
 *
 * Body:
 * {
 *   "winnerTeamId": "string",
 *   "sets": [
 *     {
 *       "team1Games": 6,
 *       "team2Games": 4,
 *       "team1TiebreakPoints": 7,
 *       "team2TiebreakPoints": 5
 *     }
 *   ],
 *   "durationMinutes": 90,
 *   "notes": "Observaciones"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo ADMIN, CLUB_ADMIN y REFEREE pueden cargar resultados
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    const body = await request.json()
    const validatedData = matchResultSchema.parse(body)

    // Verificar que el match existe y está en estado válido
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: true,
        team2: true,
        tournament: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    if (match.status === "COMPLETED") {
      return NextResponse.json({
        error: "El partido ya tiene resultado cargado"
      }, { status: 400 })
    }

    if (!match.team1Id || !match.team2Id) {
      return NextResponse.json({
        error: "El partido no tiene ambos equipos asignados"
      }, { status: 400 })
    }

    // Validar que el ganador sea uno de los equipos del partido
    if (validatedData.winnerTeamId !== match.team1Id && validatedData.winnerTeamId !== match.team2Id) {
      return NextResponse.json({
        error: "El equipo ganador debe ser uno de los participantes del partido"
      }, { status: 400 })
    }

    // Calcular sets ganados por cada equipo
    const team1SetsWon = validatedData.sets.filter(set => set.team1Games > set.team2Games).length
    const team2SetsWon = validatedData.sets.filter(set => set.team2Games > set.team1Games).length

    // Actualizar el partido con el resultado
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerTeamId: validatedData.winnerTeamId,
        status: "COMPLETED",
        team1SetsWon,
        team2SetsWon,
        durationMinutes: validatedData.durationMinutes,
        notes: validatedData.notes,
        sets: {
          create: validatedData.sets.map((set, index) => ({
            setNumber: index + 1,
            team1Games: set.team1Games,
            team2Games: set.team2Games,
            team1TiebreakPoints: set.team1TiebreakPoints,
            team2TiebreakPoints: set.team2TiebreakPoints,
            winnerTeamId: set.team1Games > set.team2Games ? match.team1Id : match.team2Id
          }))
        }
      },
      include: {
        sets: true,
        team1: {
          include: {
            player1: { select: { firstName: true, lastName: true } },
            player2: { select: { firstName: true, lastName: true } }
          }
        },
        team2: {
          include: {
            player1: { select: { firstName: true, lastName: true } },
            player2: { select: { firstName: true, lastName: true } }
          }
        }
      }
    })

    // PROGRESIÓN AUTOMÁTICA: Mover el ganador al siguiente partido del bracket
    // Y en doble eliminación, también mover al perdedor al lower bracket
    try {
      const loserTeamId = validatedData.winnerTeamId === match.team1Id ? match.team2Id : match.team1Id
      await BracketService.progressWinner(matchId, validatedData.winnerTeamId, loserTeamId || undefined)
      console.log(`✅ Ganador progresado automáticamente en el bracket`)
    } catch (progressError) {
      console.error(`⚠️ No se pudo progresar automáticamente:`, progressError)
      // No fallar la operación completa si la progresión falla
    }

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: match.tournament.id,
        description: `Resultado cargado para partido ${match.matchNumber || matchId}`,
        metadata: {
          matchId,
          winnerTeamId: validatedData.winnerTeamId,
          score: `${team1SetsWon}-${team2SetsWon}`,
          tournamentType: match.tournament.type
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Resultado cargado exitosamente",
      data: updatedMatch
    }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Datos inválidos",
        details: error.issues
      }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
