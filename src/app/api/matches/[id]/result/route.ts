import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BracketService } from "@/lib/services/bracket-service"
import { MatchLogService } from "@/lib/services/match-log-service"
import { PhaseType } from "@prisma/client"
import { z } from "zod"

const matchResultSchema = z.object({
  winnerTeamId: z.string().min(1, "El equipo ganador es requerido"),
  sets: z.array(z.object({
    team1Games: z.number().int().min(0, "Los games deben ser positivos"),
    team2Games: z.number().int().min(0, "Los games deben ser positivos"),
    team1TiebreakPoints: z.number().int().min(0, "Los puntos de tiebreak deben ser positivos").optional(),
    team2TiebreakPoints: z.number().int().min(0, "Los puntos de tiebreak deben ser positivos").optional(),
  })).min(1, "Debe cargar al menos un set"),
  durationMinutes: z.number().int().positive("La duración debe ser positiva").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  status: z.enum(["COMPLETED", "WALKOVER"], {
    message: "El status debe ser COMPLETED o WALKOVER"
  }).optional()
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/matches/[id]/result
 *
 * Carga el resultado de un partido y progresa automáticamente al ganador en el bracket.
 * Soporta tanto partidos jugados normalmente como walkovers.
 *
 * **Permisos requeridos:** ADMIN, CLUB_ADMIN o REFEREE
 *
 * **Request Body:**
 * ```json
 * {
 *   "winnerTeamId": "string",          // ID del equipo ganador
 *   "sets": [                           // Array de sets jugados
 *     {
 *       "team1Games": 6,                // Games ganados por equipo 1
 *       "team2Games": 4,                // Games ganados por equipo 2
 *       "team1TiebreakPoints": 7,       // Puntos de tiebreak equipo 1 (opcional)
 *       "team2TiebreakPoints": 5        // Puntos de tiebreak equipo 2 (opcional)
 *     }
 *   ],
 *   "durationMinutes": 90,              // Duración del partido en minutos (opcional)
 *   "notes": "Observaciones",           // Notas adicionales (opcional, max 500 chars)
 *   "status": "COMPLETED"               // COMPLETED o WALKOVER (opcional, default: COMPLETED)
 * }
 * ```
 *
 * **Validaciones:**
 * - El partido debe existir y tener ambos equipos asignados
 * - El partido no puede estar ya completado
 * - El ganador debe ser uno de los equipos del partido
 * - Debe haber al menos un set
 *
 * **Funcionalidad:**
 * 1. Elimina sets anteriores si existen (permite re-cargar resultados)
 * 2. Actualiza el partido con el resultado
 * 3. Crea los sets en la base de datos
 * 4. Progresa automáticamente al ganador al siguiente partido del bracket
 * 5. En doble eliminación, mueve al perdedor al lower bracket
 * 6. Registra auditoría y logs específicos
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Resultado cargado exitosamente",
 *   "data": { ...match }
 * }
 * ```
 *
 * **Errores posibles:**
 * - 400: Datos inválidos (validación de Zod)
 * - 400: Partido ya completado
 * - 400: Partido sin equipos asignados
 * - 400: Ganador inválido
 * - 404: Partido no encontrado
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN, CLUB_ADMIN y REFEREE pueden cargar resultados
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Parsear y validar body
    const body = await request.json()
    console.log('📝 Body recibido en API:', body)
    const validatedData = matchResultSchema.parse(body)
    console.log('✅ Datos validados:', validatedData)

    // Obtener el partido con todas las relaciones necesarias
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

    // Validación: Partido debe existir
    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    // Validación: Partido no debe estar completado
    if (match.status === "COMPLETED" || match.status === "WALKOVER") {
      return NextResponse.json({
        error: "El partido ya tiene resultado cargado. Para modificar el resultado, primero debe cambiar el estado del partido."
      }, { status: 400 })
    }

    // Validación: Partido debe tener ambos equipos asignados
    if (!match.team1Id || !match.team2Id) {
      return NextResponse.json({
        error: "El partido no tiene ambos equipos asignados"
      }, { status: 400 })
    }

    // Validación: El ganador debe ser uno de los equipos del partido
    if (validatedData.winnerTeamId !== match.team1Id && validatedData.winnerTeamId !== match.team2Id) {
      return NextResponse.json({
        error: "El equipo ganador debe ser uno de los participantes del partido"
      }, { status: 400 })
    }

    // Calcular sets ganados por cada equipo
    const team1SetsWon = validatedData.sets.filter(set => set.team1Games > set.team2Games).length
    const team2SetsWon = validatedData.sets.filter(set => set.team2Games > set.team1Games).length

    console.log('📊 Sets calculados:', {
      team1SetsWon,
      team2SetsWon,
      sets: validatedData.sets,
      status: validatedData.status
    })

    // Eliminar sets anteriores si existen (para permitir re-cargar resultado)
    await prisma.matchSet.deleteMany({
      where: { matchId }
    })

    // Actualizar el partido con el resultado
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerTeamId: validatedData.winnerTeamId,
        status: validatedData.status || "COMPLETED",
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
            registration1: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        },
        team2: {
          include: {
            registration1: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
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

    // CLASIFICACIÓN AUTOMÁTICA: Si es fase de grupos, verificar si se completó la fase
    // y automáticamente clasificar equipos a fase eliminatoria
    if (match.tournament.type === 'GROUP_STAGE_ELIMINATION' && match.phaseType === 'GROUP_STAGE') {
      try {
        // Verificar si todos los partidos de fase de grupos están completados
        const allGroupMatches = await prisma.match.findMany({
          where: {
            tournamentId: match.tournament.id,
            categoryId: match.categoryId,
            phaseType: 'GROUP_STAGE'
          }
        })

        const allCompleted = allGroupMatches.every(m =>
          m.status === 'COMPLETED' || m.status === 'WALKOVER'
        )

        if (allCompleted) {
          console.log('📊 Todos los partidos de fase de grupos completados. Calculando tablas y clasificando equipos...')

          // Primero calcular las posiciones de todos los grupos
          const zones = await prisma.tournamentZone.findMany({
            where: {
              tournamentId: match.tournament.id,
              categoryId: match.categoryId,
              phaseType: 'GROUP_STAGE'
            }
          })

          for (const zone of zones) {
            await BracketService.calculateGroupStandings(zone.id)
            console.log(`📊 Tabla de ${zone.name} calculada`)
          }

          // Luego clasificar a la fase eliminatoria
          await BracketService.classifyTeamsToEliminationPhase(match.tournament.id, match.categoryId)
          console.log('✅ Equipos clasificados automáticamente a fase eliminatoria')
        }
      } catch (classifyError) {
        console.error('⚠️ No se pudo clasificar automáticamente:', classifyError)
        // No fallar la operación completa si la clasificación falla
      }
    }

    // Registrar auditoría general
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

    // Registrar en log específico de matches
    await MatchLogService.logMatchResultAdded(
      {
        userId: session.user.id,
        matchId
      },
      updatedMatch,
      validatedData
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

/**
 * DELETE /api/matches/[id]/result
 *
 * Revierte el resultado de un partido que ya fue cargado.
 * Limpia el resultado, los sets, y revierte la progresión en el bracket.
 *
 * **Permisos requeridos:** ADMIN o CLUB_ADMIN
 *
 * **Funcionalidad:**
 * 1. Valida que el partido tenga resultado cargado
 * 2. Valida que no haya partidos posteriores ya jugados (opcional: advertencia)
 * 3. Elimina los sets del partido
 * 4. Limpia el resultado del partido (winnerTeamId, sets ganados, etc)
 * 5. Revierte la progresión en el bracket (quita el equipo del siguiente match)
 * 6. Cambia el estado del partido a SCHEDULED
 * 7. Registra auditoría y logs
 *
 * **Response exitoso (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Resultado revertido exitosamente",
 *   "data": { ...match }
 * }
 * ```
 *
 * **Errores posibles:**
 * - 400: El partido no tiene resultado cargado
 * - 400: No se puede revertir porque hay partidos posteriores jugados
 * - 404: Partido no encontrado
 * - 403: Sin permisos (solo ADMIN y CLUB_ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Autorización: Solo ADMIN y CLUB_ADMIN pueden revertir resultados
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: matchId } = await params

    // Obtener el partido con todas las relaciones necesarias
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
        },
        sets: true,
        nextMatchesTeam1: true,
        nextMatchesTeam2: true
      }
    })

    // Validación: Partido debe existir
    if (!match) {
      return NextResponse.json({
        error: "Partido no encontrado"
      }, { status: 404 })
    }

    // Validación: Partido debe tener resultado cargado
    if (match.status !== "COMPLETED" && match.status !== "WALKOVER") {
      return NextResponse.json({
        error: "El partido no tiene resultado cargado para revertir"
      }, { status: 400 })
    }

    // Validación: Verificar si hay partidos posteriores ya jugados
    const nextMatches = [...match.nextMatchesTeam1, ...match.nextMatchesTeam2]
    const nextMatchesPlayed = nextMatches.filter(m =>
      m.status === "COMPLETED" || m.status === "WALKOVER"
    )

    if (nextMatchesPlayed.length > 0) {
      return NextResponse.json({
        error: "No se puede revertir este resultado porque hay partidos posteriores ya jugados. Primero debe revertir esos resultados.",
        details: {
          nextMatchesPlayed: nextMatchesPlayed.map(m => ({
            id: m.id,
            matchNumber: m.matchNumber,
            status: m.status
          }))
        }
      }, { status: 400 })
    }

    // Guardar datos del match antes de revertir (para logging)
    const oldMatchData = {
      winnerTeamId: match.winnerTeamId,
      status: match.status,
      team1SetsWon: match.team1SetsWon,
      team2SetsWon: match.team2SetsWon,
      durationMinutes: match.durationMinutes,
      notes: match.notes,
      sets: match.sets
    }

    // PASO 1: Revertir progresión en el bracket (llamar al nuevo método unprogress)
    try {
      await BracketService.unprogress(matchId, match.winnerTeamId || undefined)
      console.log(`✅ Progresión revertida en el bracket`)
    } catch (unprogressError) {
      console.error(`⚠️ No se pudo revertir la progresión:`, unprogressError)
      // Continuar de todas formas con la reversión del resultado
    }

    // PASO 2: Eliminar sets
    await prisma.matchSet.deleteMany({
      where: { matchId }
    })

    // PASO 3: Limpiar resultado del partido
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerTeamId: null,
        status: "SCHEDULED",
        team1SetsWon: 0,
        team2SetsWon: 0,
        durationMinutes: null,
        notes: null
      },
      include: {
        team1: {
          include: {
            registration1: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        },
        team2: {
          include: {
            registration1: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        }
      }
    })

    // Registrar auditoría general
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: match.tournament.id,
        description: `Resultado revertido para partido ${match.matchNumber || matchId}`,
        metadata: {
          matchId,
          oldWinnerTeamId: oldMatchData.winnerTeamId,
          oldScore: `${oldMatchData.team1SetsWon}-${oldMatchData.team2SetsWon}`,
          tournamentType: match.tournament.type
        }
      },
      request
    )

    // Registrar en log específico de matches
    await MatchLogService.logMatchResultReverted(
      {
        userId: session.user.id,
        matchId
      },
      oldMatchData
    )

    return NextResponse.json({
      success: true,
      message: "Resultado revertido exitosamente",
      data: updatedMatch
    }, { status: 200 })

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 })
    }

    return handleAuthError(error)
  }
}
