import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { updateTeamSchema } from "@/lib/validations/team"
import { TeamLogService } from "@/lib/services/team-log-service"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/teams/[id]
 *
 * Obtiene los detalles de un equipo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            organizerId: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        registration1: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                rankingPoints: true,
                primaryCategory: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                  }
                },
                user: {
                  select: {
                    id: true,
                    email: true,
                  }
                }
              }
            },
            payment: {
              select: {
                id: true,
                amount: true,
                paymentStatus: true,
              }
            }
          }
        },
        registration2: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                rankingPoints: true,
                primaryCategory: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                  }
                },
                user: {
                  select: {
                    id: true,
                    email: true,
                  }
                }
              }
            },
            payment: {
              select: {
                id: true,
                amount: true,
                paymentStatus: true,
              }
            }
          }
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
            maxTeams: true,
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos contextuales
    await authorize(Action.READ, Resource.REGISTRATION, team)

    return NextResponse.json(team)

  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * PUT /api/teams/[id]
 *
 * Actualiza un equipo (nombre, seed, notas)
 * NO permite cambiar los jugadores - para eso usar DELETE + POST
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()
    const body = await request.json()
    const validatedData = updateTeamSchema.parse(body)

    // Obtener el equipo actual
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
          }
        },
        registration1: {
          select: {
            player: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        registration2: {
          select: {
            player: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.UPDATE, Resource.REGISTRATION, team)

    // Validar estado del torneo
    if (team.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden modificar equipos de torneos completados" },
        { status: 400 }
      )
    }

    // Actualizar
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: validatedData,
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        registration1: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        registration2: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.REGISTRATION,
      resourceId: id,
      description: `Equipo actualizado: ${updatedTeam.name || 'Sin nombre'}`,
      oldData: team,
      newData: updatedTeam,
    }, request)

    // Log team update
    await TeamLogService.logTeamUpdated(
      {
        userId: session.user.id,
        teamId: id
      },
      team,
      updatedTeam
    )

    // Log status change if applicable
    if (validatedData.status && team.status !== validatedData.status) {
      await TeamLogService.logTeamStatusChanged(
        { userId: session.user.id, teamId: id },
        updatedTeam,
        team.status,
        validatedData.status
      )
    }

    return NextResponse.json(updatedTeam)

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

/**
 * DELETE /api/teams/[id]
 *
 * Disuelve un equipo sin eliminar las inscripciones individuales.
 * Los jugadores quedan inscritos individualmente y pueden formar otro equipo.
 *
 * Validaciones:
 * - El torneo no debe estar IN_PROGRESS o COMPLETED
 * - El equipo no debe tener partidos jugados
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()

    // Buscar el equipo
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
          }
        },
        registration1: {
          select: {
            player: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        registration2: {
          select: {
            player: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.DELETE, Resource.REGISTRATION, team)

    // Validar estado del torneo
    if (['IN_PROGRESS', 'COMPLETED'].includes(team.tournament.status)) {
      return NextResponse.json(
        { error: "No se pueden disolver equipos de torneos en progreso o completados" },
        { status: 400 }
      )
    }

    // Verificar si el equipo tiene partidos asignados
    const matchesCount = await prisma.match.count({
      where: {
        OR: [
          { team1Id: team.id },
          { team2Id: team.id }
        ]
      }
    })

    if (matchesCount > 0) {
      return NextResponse.json(
        { error: "No se puede disolver un equipo que ya tiene partidos asignados" },
        { status: 400 }
      )
    }

    // Eliminar solo el equipo (las inscripciones se mantienen)
    await prisma.team.delete({
      where: { id }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.REGISTRATION,
      resourceId: id,
      description: `Equipo disuelto: ${team.name || `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`}. Las inscripciones individuales se mantienen.`,
      oldData: team,
    }, request)

    // Log team deletion
    await TeamLogService.logTeamDeleted(
      {
        userId: session.user.id,
        teamId: id
      },
      team
    )

    return NextResponse.json({
      message: "Equipo disuelto exitosamente. Las inscripciones individuales se mantienen y pueden formar un nuevo equipo."
    })

  } catch (error) {
    return handleAuthError(error)
  }
}
