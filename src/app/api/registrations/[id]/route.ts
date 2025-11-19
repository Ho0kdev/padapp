import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { RegistrationLogService } from "@/lib/services/registration-log-service"

const updateRegistrationSchema = z.object({
  name: z.string().min(1, "El nombre del equipo es requerido").max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  registrationStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(),
  seed: z.number().int().positive().optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/registrations/[id]
 *
 * Obtiene los detalles de una inscripción.
 * El ID puede ser:
 * - Team ID (torneos convencionales)
 * - Registration ID (americano social - NO IMPLEMENTADO AÚN en GET)
 *
 * Actualmente solo soporta Team IDs.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    // Buscar como Team (torneos convencionales)
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            registrationStart: true,
            registrationEnd: true,
            organizerId: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            genderRestriction: true,
            minAge: true,
            maxAge: true,
            minRankingPoints: true,
            maxRankingPoints: true,
          }
        },
        registration1: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
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
                    image: true,
                  }
                }
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentStatus: true,
                paymentMethod: true,
                transactionId: true,
                paidAt: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc'
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
                dateOfBirth: true,
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
                    image: true,
                  }
                }
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentStatus: true,
                paymentMethod: true,
                transactionId: true,
                paidAt: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
            prizePool: true,
            maxTeams: true,
          }
        },
        team1Matches: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            team2: {
              select: {
                name: true,
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
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        },
        team2Matches: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            team1: {
              select: {
                name: true,
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
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
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
 * PUT /api/registrations/[id]
 *
 * Actualiza una inscripción.
 * Maneja dos casos:
 * 1. Torneos Americano Social: ID de Registration (individual)
 * 2. Torneos Convencionales: ID de Team (pareja)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()
    const body = await request.json()
    const validatedData = updateRegistrationSchema.parse(body)

    // Determinar si es Team o Registration
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
            type: true,
          }
        },
        registration1: {
          select: {
            id: true,
          }
        },
        registration2: {
          select: {
            id: true,
          }
        }
      }
    })

    if (team) {
      // Caso 1: Torneo Convencional (Team)
      return await handleTeamUpdate(id, team, validatedData, session, request)
    } else {
      // Caso 2: Torneo Americano Social (Registration individual)
      const registration = await prisma.registration.findUnique({
        where: { id },
        include: {
          tournament: {
            select: {
              organizerId: true,
              status: true,
              type: true,
            }
          }
        }
      })

      if (!registration) {
        return NextResponse.json(
          { error: "Inscripción no encontrada" },
          { status: 404 }
        )
      }

      return await handleIndividualRegistrationUpdate(id, registration, validatedData, session, request)
    }

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
 * DELETE /api/registrations/[id]
 *
 * Elimina una inscripción.
 * El ID debe ser un Registration ID (no Team ID).
 *
 * Para torneos convencionales: elimina la registration y el team asociado si no tiene partidos.
 * Para americano social: elimina solo la registration.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()

    // Buscar la registration
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
            type: true,
          }
        },
        player: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.DELETE, Resource.REGISTRATION, registration)

    // Validar estado del torneo
    if (['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)) {
      return NextResponse.json(
        { error: "No se pueden eliminar inscripciones de torneos en progreso o completados" },
        { status: 400 }
      )
    }

    // Procesar eliminación según tipo de torneo
    if (registration.tournament.type === 'AMERICANO_SOCIAL') {
      await handleAmericanoSocialDeletion(id)
    } else {
      await handleConventionalTournamentDeletion(id)
    }

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.REGISTRATION,
      resourceId: id,
      description: `Inscripción eliminada: ${registration.player.firstName} ${registration.player.lastName}`,
      oldData: registration,
    }, request)

    // Log registration deletion
    await RegistrationLogService.logRegistrationDeleted(
      {
        userId: session.user.id,
        registrationId: id
      },
      registration
    )

    return NextResponse.json({
      message: "Inscripción eliminada exitosamente"
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Actualiza un Team (torneo convencional)
 * Actualiza tanto el Team como las Registrations subyacentes
 */
async function handleTeamUpdate(
  teamId: string,
  team: any,
  validatedData: z.infer<typeof updateRegistrationSchema>,
  session: any,
  request: NextRequest
) {
  // Verificar permisos
  await authorize(Action.UPDATE, Resource.REGISTRATION, team)

  // Validar estado del torneo
  if (team.tournament.status === 'COMPLETED') {
    return NextResponse.json(
      { error: "No se pueden modificar inscripciones de torneos completados" },
      { status: 400 }
    )
  }

  // Separar datos de Team vs Registrations
  const teamUpdateData: Partial<{ name: string; seed: number; notes: string }> = {}
  const registrationUpdateData: Partial<{ registrationStatus: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'WAITLIST' }> = {}

  if (validatedData.name !== undefined) {
    teamUpdateData.name = validatedData.name
  }
  if (validatedData.seed !== undefined) {
    teamUpdateData.seed = validatedData.seed
  }
  if (validatedData.notes !== undefined) {
    teamUpdateData.notes = validatedData.notes
  }
  if (validatedData.registrationStatus !== undefined) {
    registrationUpdateData.registrationStatus = validatedData.registrationStatus
  }

  // Actualizar en una transacción
  const updatedTeam = await prisma.$transaction(async (tx) => {
    // Actualizar Team si hay cambios
    if (Object.keys(teamUpdateData).length > 0) {
      await tx.team.update({
        where: { id: teamId },
        data: teamUpdateData,
      })
    }

    // Actualizar AMBAS Registrations si hay cambio de estado
    if (Object.keys(registrationUpdateData).length > 0) {
      await tx.registration.update({
        where: { id: team.registration1.id },
        data: registrationUpdateData,
      })
      await tx.registration.update({
        where: { id: team.registration2.id },
        data: registrationUpdateData,
      })
    }

    // Retornar Team actualizado
    return tx.team.findUnique({
      where: { id: teamId },
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
  })

  // Auditoría
  await AuditLogger.log(session, {
    action: Action.UPDATE,
    resource: Resource.REGISTRATION,
    resourceId: teamId,
    description: `Equipo actualizado: ${updatedTeam?.name || 'Sin nombre'}`,
    oldData: team,
    newData: updatedTeam,
  }, request)

  return NextResponse.json(updatedTeam)
}

/**
 * Actualiza una Registration individual (americano social)
 */
async function handleIndividualRegistrationUpdate(
  registrationId: string,
  registration: any,
  validatedData: z.infer<typeof updateRegistrationSchema>,
  session: any,
  request: NextRequest
) {
  // Verificar permisos
  await authorize(Action.UPDATE, Resource.REGISTRATION, registration)

  // Validar estado del torneo
  if (registration.tournament.status === 'COMPLETED') {
    return NextResponse.json(
      { error: "No se pueden modificar inscripciones de torneos completados" },
      { status: 400 }
    )
  }

  // Preparar datos de actualización (solo campos permitidos para Registration)
  const updateData: Partial<{ registrationStatus: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'WAITLIST'; notes: string }> = {}

  if (validatedData.registrationStatus) {
    updateData.registrationStatus = validatedData.registrationStatus
  }
  if (validatedData.notes !== undefined) {
    updateData.notes = validatedData.notes
  }

  // Actualizar
  const updatedRegistration = await prisma.registration.update({
    where: { id: registrationId },
    data: updateData,
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
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  })

  // Auditoría
  await AuditLogger.log(session, {
    action: Action.UPDATE,
    resource: Resource.REGISTRATION,
    resourceId: registrationId,
    description: `Inscripción individual actualizada: ${updatedRegistration.player.firstName} ${updatedRegistration.player.lastName}`,
    oldData: registration,
    newData: updatedRegistration,
  }, request)

  // Log registration update
  await RegistrationLogService.logRegistrationUpdated(
    {
      userId: session.user.id,
      registrationId
    },
    registration,
    updatedRegistration
  )

  // Log status change if applicable
  if (validatedData.registrationStatus && registration.registrationStatus !== validatedData.registrationStatus) {
    await RegistrationLogService.logRegistrationStatusChanged(
      { userId: session.user.id, registrationId },
      updatedRegistration,
      registration.registrationStatus,
      validatedData.registrationStatus
    )
  }

  return NextResponse.json(updatedRegistration)
}

/**
 * Elimina una inscripción de torneo americano social
 */
async function handleAmericanoSocialDeletion(registrationId: string) {
  await prisma.registration.delete({
    where: { id: registrationId }
  })
}

/**
 * Elimina una inscripción de torneo convencional
 * También elimina el Team asociado si existe y no tiene partidos
 */
async function handleConventionalTournamentDeletion(registrationId: string) {
  // Buscar team asociado
  const team = await prisma.team.findFirst({
    where: {
      OR: [
        { registration1Id: registrationId },
        { registration2Id: registrationId }
      ]
    }
  })

  if (!team) {
    // Si no hay team, solo eliminar la registration
    await prisma.registration.delete({
      where: { id: registrationId }
    })
    return
  }

  // Verificar si el team tiene partidos asignados
  const matchesCount = await prisma.match.count({
    where: {
      OR: [
        { team1Id: team.id },
        { team2Id: team.id }
      ]
    }
  })

  if (matchesCount > 0) {
    throw new Error("No se puede eliminar una inscripción que ya tiene partidos asignados")
  }

  // Eliminar team y ambas registrations en transacción
  await prisma.$transaction(async (tx) => {
    // 1. Eliminar el team
    await tx.team.delete({
      where: { id: team.id }
    })

    // 2. Eliminar ambas registrations
    await tx.registration.delete({
      where: { id: team.registration1Id }
    })
    await tx.registration.delete({
      where: { id: team.registration2Id }
    })
  })
}
