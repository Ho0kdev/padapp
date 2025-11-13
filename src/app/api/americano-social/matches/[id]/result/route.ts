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

    // Validar que las rondas anteriores estén completadas (para torneos multi-ronda)
    const currentRound = match.pool.roundNumber
    if (currentRound > 1) {
      // Verificar si todos los partidos de rondas anteriores están completados
      const incompleteMatches = await prisma.americanoPoolMatch.count({
        where: {
          pool: {
            tournamentId: match.pool.tournamentId,
            roundNumber: {
              lt: currentRound // Rondas anteriores
            }
          },
          status: {
            not: 'COMPLETED'
          }
        }
      })

      if (incompleteMatches > 0) {
        return NextResponse.json(
          {
            error: `No se puede cargar el resultado de la Ronda ${currentRound}. Aún hay ${incompleteMatches} partido(s) pendiente(s) en rondas anteriores.`,
            incompleteMatches,
            currentRound
          },
          { status: 400 }
        )
      }
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

    // COMPLETAR TORNEO AUTOMÁTICAMENTE: Verificar si todos los partidos de Americano Social están completados
    try {
      const allAmericanoMatches = await prisma.americanoPoolMatch.findMany({
        where: {
          tournamentId: match.pool.tournamentId,
          categoryId: match.categoryId
        },
        select: {
          id: true,
          status: true
        }
      })

      const allMatchesCompleted = allAmericanoMatches.length > 0 && allAmericanoMatches.every(m =>
        m.status === 'COMPLETED' || m.status === 'WALKOVER'
      )

      if (allMatchesCompleted) {
        console.log('🏆 Todos los partidos de Americano Social completados. Completando torneo automáticamente...')

        // Actualizar estado del torneo a COMPLETED
        const tournament = await prisma.tournament.update({
          where: { id: match.pool.tournamentId },
          data: {
            status: 'COMPLETED'
          }
        })

        console.log(`✅ Torneo ${tournament.name} marcado como COMPLETED`)

        // Calcular posiciones finales y puntos automáticamente
        try {
          // Importar el servicio de cálculo de puntos
          const PointsCalculationService = (await import('@/lib/services/points-calculation-service')).default

          await PointsCalculationService.processCompletedTournament(match.pool.tournamentId)
          console.log('✅ Posiciones finales y puntos del torneo calculados automáticamente')

          // Registrar en auditoría
          await AuditLogger.log(
            session,
            {
              action: Action.UPDATE,
              resource: Resource.TOURNAMENT,
              resourceId: match.pool.tournamentId,
              description: `Torneo Americano Social completado automáticamente y puntos calculados`,
              metadata: {
                totalMatches: allAmericanoMatches.length,
                autoCompleted: true,
                tournamentType: 'AMERICANO_SOCIAL'
              }
            },
            request
          )
        } catch (pointsError) {
          console.error('⚠️ No se pudieron calcular los puntos automáticamente:', pointsError)
          // No fallar la operación completa si el cálculo de puntos falla
        }
      }
    } catch (completionError) {
      console.error('⚠️ No se pudo completar el torneo automáticamente:', completionError)
      // No fallar la operación completa si la finalización automática falla
    }

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
