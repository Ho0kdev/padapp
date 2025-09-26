import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const registration = await prisma.team.findUnique({
      where: { id: params.id },
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

    // Verificar permisos: solo el admin, organizador del torneo o los jugadores pueden ver la inscripción
    const userPlayer = await prisma.player.findUnique({
      where: { userId: session.user.id }
    })

    const hasPermission =
      session.user.role === 'ADMIN' ||
      registration.tournament.organizerId === session.user.id ||
      (userPlayer && (registration.player1Id === userPlayer.id || registration.player2Id === userPlayer.id))

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tienes permisos para ver esta inscripción" },
        { status: 403 }
      )
    }

    return NextResponse.json(registration)

  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateRegistrationSchema.parse(body)

    // Buscar la inscripción actual
    const currentRegistration = await prisma.team.findUnique({
      where: { id: params.id },
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

    // Verificar permisos
    const userPlayer = await prisma.player.findUnique({
      where: { userId: session.user.id }
    })

    const hasPermission =
      session.user.role === 'ADMIN' ||
      currentRegistration.tournament.organizerId === session.user.id ||
      (userPlayer && (currentRegistration.player1Id === userPlayer.id || currentRegistration.player2Id === userPlayer.id))

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar esta inscripción" },
        { status: 403 }
      )
    }

    // Restricciones según el estado del torneo
    if (currentRegistration.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden modificar inscripciones de torneos completados" },
        { status: 400 }
      )
    }

    // Solo admins y organizadores pueden cambiar ciertos campos
    const restrictedFields = ['registrationStatus', 'seed']
    const isRestrictedUpdate = restrictedFields.some(field => field in validatedData)

    if (isRestrictedUpdate && session.user.role !== 'ADMIN' && currentRegistration.tournament.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permisos para cambiar el estado o seed" },
        { status: 403 }
      )
    }

    const updatedRegistration = await prisma.team.update({
      where: { id: params.id },
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

    // TODO: Crear log de cambios
    // TODO: Enviar notificaciones si cambió el estado

    return NextResponse.json(updatedRegistration)

  } catch (error) {
    console.error('Error updating registration:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Buscar la inscripción
    const registration = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        tournament: {
          select: {
            organizerId: true,
            status: true,
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
    const userPlayer = await prisma.player.findUnique({
      where: { userId: session.user.id }
    })

    const hasPermission =
      session.user.role === 'ADMIN' ||
      registration.tournament.organizerId === session.user.id ||
      (userPlayer && (registration.player1Id === userPlayer.id || registration.player2Id === userPlayer.id))

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar esta inscripción" },
        { status: 403 }
      )
    }

    // No permitir eliminar si el torneo ya está en progreso
    if (['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)) {
      return NextResponse.json(
        { error: "No se pueden eliminar inscripciones de torneos en progreso o completados" },
        { status: 400 }
      )
    }

    // Verificar si hay partidos asignados
    const matchesCount = await prisma.match.count({
      where: {
        OR: [
          { team1Id: params.id },
          { team2Id: params.id }
        ]
      }
    })

    if (matchesCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una inscripción que ya tiene partidos asignados" },
        { status: 400 }
      )
    }

    // Eliminar la inscripción
    await prisma.team.delete({
      where: { id: params.id }
    })

    // TODO: Crear log de eliminación
    // TODO: Mover equipos de lista de espera si corresponde
    // TODO: Procesar reembolsos si hay pagos

    return NextResponse.json({
      message: "Inscripción eliminada exitosamente"
    })

  } catch (error) {
    console.error('Error deleting registration:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}