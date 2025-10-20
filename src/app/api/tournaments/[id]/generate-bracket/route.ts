import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { BracketService } from "@/lib/services/bracket-service"
import { z } from "zod"

const generateBracketSchema = z.object({
  categoryId: z.string().min(1, "La categoría es requerida"),
  force: z.boolean().optional().default(false)
})

/**
 * POST /api/tournaments/[id]/generate-bracket
 * Genera el bracket de un torneo para una categoría específica
 *
 * Requiere permisos: ADMIN o CLUB_ADMIN
 *
 * Body:
 * {
 *   "categoryId": "string"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo ADMIN y CLUB_ADMIN pueden generar brackets
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: tournamentId } = await params

    const body = await request.json()
    const { categoryId, force } = generateBracketSchema.parse(body)

    // Validar que el torneo existe y el usuario tiene permisos
    const tournament = await BracketService.validateBracketGeneration(tournamentId, categoryId)

    if (!tournament.valid) {
      return NextResponse.json({
        error: "No se puede generar el bracket",
        details: tournament.errors
      }, { status: 400 })
    }

    // Verificar si hay partidos con resultados
    const existingMatches = await BracketService.checkExistingMatches(tournamentId, categoryId)

    if (existingMatches.hasMatches && !force) {
      return NextResponse.json({
        error: "CONFIRMATION_REQUIRED",
        message: "Ya existen partidos en esta categoría",
        details: {
          totalMatches: existingMatches.totalMatches,
          completedMatches: existingMatches.completedMatches,
          inProgressMatches: existingMatches.inProgressMatches,
          scheduledMatches: existingMatches.scheduledMatches
        },
        requiresConfirmation: true
      }, { status: 409 })
    }

    // Generar bracket (se borrarán todos los partidos existentes)
    await BracketService.generateBracket(tournamentId, categoryId)

    // Obtener bracket generado
    const bracket = await BracketService.getBracket(tournamentId, categoryId)

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: tournamentId,
        description: `Bracket generado para categoría ${categoryId}`,
        metadata: {
          categoryId,
          totalMatches: bracket.totalMatches,
          totalRounds: bracket.totalRounds
        }
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: "Bracket generado exitosamente",
      data: bracket
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
