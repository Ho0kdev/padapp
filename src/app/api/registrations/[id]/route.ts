import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const registration = await prisma.team.findUnique({
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
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            rankingPoints: true,
            user: {
              select: {
                id: true,
                email: true,
                image: true,
              }
            }
          }
        },
        player2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            rankingPoints: true,
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
                player1: { select: { firstName: true, lastName: true } },
                player2: { select: { firstName: true, lastName: true } }
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
                player1: { select: { firstName: true, lastName: true } },
                player2: { select: { firstName: true, lastName: true } }
              }
            }
          },
          orderBy: {
            scheduledAt: 'asc'
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

    // Verificar permisos contextuales: RBAC verifica automáticamente ownership
    await authorize(Action.READ, Resource.REGISTRATION, registration)

    return NextResponse.json(registration)

  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()

    const body = await request.json()
    const validatedData = updateRegistrationSchema.parse(body)

    // Buscar la inscripción actual
    const currentRegistration = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
          }
        }
      }
    })

    if (!currentRegistration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar permisos contextuales
    await authorize(Action.UPDATE, Resource.REGISTRATION, currentRegistration)

    // Restricciones según el estado del torneo
    if (currentRegistration.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden modificar inscripciones de torneos completados" },
        { status: 400 }
      )
    }

    const updatedRegistration = await prisma.team.update({
      where: { id: id },
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
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        player2: {
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
      resourceId: id,
      description: `Inscripción actualizada: ${updatedRegistration.name || 'Sin nombre'}`,
      oldData: currentRegistration,
      newData: updatedRegistration,
    }, request)

    return NextResponse.json(updatedRegistration)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await requireAuth()

    // Buscar la inscripción (Registration, no Team)
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

    // Verificar permisos contextuales
    await authorize(Action.DELETE, Resource.REGISTRATION, registration)

    // No permitir eliminar si el torneo ya está en progreso
    if (['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)) {
      return NextResponse.json(
        { error: "No se pueden eliminar inscripciones de torneos en progreso o completados" },
        { status: 400 }
      )
    }

    // Si es un torneo por equipos, verificar si hay team asociado y partidos
    if (registration.tournament.type !== 'AMERICANO_SOCIAL') {
      // Buscar el team asociado
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { registration1Id: id },
            { registration2Id: id }
          ]
        }
      })

      if (team) {
        // Verificar si hay partidos asignados
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
            { error: "No se puede eliminar una inscripción que ya tiene partidos asignados" },
            { status: 400 }
          )
        }

        // Eliminar el team y sus registrations asociadas
        await prisma.$transaction(async (tx) => {
          // Primero eliminar el team
          await tx.team.delete({
            where: { id: team.id }
          })

          // Luego eliminar ambas registrations
          await tx.registration.delete({
            where: { id: team.registration1Id }
          })
          await tx.registration.delete({
            where: { id: team.registration2Id }
          })
        })
      } else {
        // Si no hay team, solo eliminar la registration
        await prisma.registration.delete({
          where: { id: id }
        })
      }
    } else {
      // Para Americano Social, solo eliminar la registration
      await prisma.registration.delete({
        where: { id: id }
      })
    }

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.REGISTRATION,
      resourceId: id,
      description: `Inscripción eliminada: ${registration.player.firstName} ${registration.player.lastName}`,
      oldData: registration,
    }, request)

    // TODO: Mover equipos de lista de espera si corresponde
    // TODO: Procesar reembolsos si hay pagos

    return NextResponse.json({
      message: "Inscripción eliminada exitosamente"
    })

  } catch (error) {
    return handleAuthError(error)
  }
}