import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AmericanoSocialService } from "@/lib/services/americano-social-service"
import { authorize, handleAuthError, AuditLogger, Action, Resource } from "@/lib/rbac"
import { matchResultSchema } from "@/lib/validations/americano-social"
import { z } from "zod"

// POST /api/americano-social/matches/[id]/result - Cargar resultado de partido
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const validatedData = matchResultSchema.parse(body)

    // Verificar que el partido existe y obtener datos para auditoría
    const match = await prisma.americanoPoolMatch.findUnique({
      where: { id },
      include: {
        pool: {
          include: {
            tournament: {
              select: { id: true, name: true, organizerId: true }
            }
          }
        },
        player1: { select: { firstName: true, lastName: true } },
        player2: { select: { firstName: true, lastName: true } },
        player3: { select: { firstName: true, lastName: true } },
        player4: { select: { firstName: true, lastName: true } }
      }
    })

    if (!match) {
      return NextResponse.json(
        { error: "Partido no encontrado" },
        { status: 404 }
      )
    }

    if (match.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Este partido ya fue completado" },
        { status: 400 }
      )
    }

    // Autorización - solo organizador o admin
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT, match.pool.tournament.id)

    // Actualizar resultado
    await AmericanoSocialService.updateMatchResult(
      id,
      validatedData.teamAScore,
      validatedData.teamBScore,
      validatedData.sets
    )

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.MATCH,
      resourceId: id,
      description: `Resultado cargado: ${match.player1.firstName}+${match.player2.firstName} (${validatedData.teamAScore}) vs ${match.player3.firstName}+${match.player4.firstName} (${validatedData.teamBScore}) - ${match.pool.name} - ${match.pool.tournament.name}`,
      newData: {
        teamAScore: validatedData.teamAScore,
        teamBScore: validatedData.teamBScore,
        sets: validatedData.sets
      }
    }, request)

    return NextResponse.json({
      success: true,
      message: "Resultado cargado exitosamente"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}
