import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]),
  notes: z.string().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await authorize(Action.UPDATE, Resource.REGISTRATION)

    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)

    // Await params before accessing properties
    const { id } = await params

    // Buscar la inscripción - puede ser Registration (individual) o Team (pareja)
    let currentRegistration = await prisma.registration.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
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

    let isTeam = false
    let currentTeam = null
    let tournament = null

    // Si no se encuentra como Registration, buscar como Team
    if (!currentRegistration) {
      currentTeam = await prisma.team.findUnique({
        where: { id },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
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

      if (!currentTeam) {
        return NextResponse.json(
          { error: "Inscripción no encontrada" },
          { status: 404 }
        )
      }

      isTeam = true
      tournament = currentTeam.tournament
      // Usar registration1 como referencia para validaciones
      currentRegistration = currentTeam.registration1
    } else {
      tournament = currentRegistration.tournament
    }

    // Validaciones de negocio según el cambio de estado
    if (validatedData.status === 'PAID' && currentRegistration.registrationStatus !== 'CONFIRMED') {
      // Advertencia: permitir el cambio pero loguear
      console.warn(`Cambio de estado de ${currentRegistration.registrationStatus} a PAID sin pasar por CONFIRMED`)
    }

    if (validatedData.status === 'CANCELLED' && tournament.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: "No se puede cancelar una inscripción mientras el torneo está en progreso" },
        { status: 400 }
      )
    }

    if (tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden modificar inscripciones de torneos completados" },
        { status: 400 }
      )
    }

    const oldStatus = currentRegistration.registrationStatus

    // Actualizar el estado
    if (isTeam && currentTeam) {
      // Para Teams, actualizar ambas registrations
      const updatedData: any = {
        registrationStatus: validatedData.status,
      }

      // Si se agregan notas, agregarlas
      if (validatedData.notes) {
        updatedData.notes = currentRegistration.notes
          ? `${currentRegistration.notes}\n[${new Date().toISOString()}] ${validatedData.notes}`
          : validatedData.notes
      }

      await prisma.$transaction([
        prisma.registration.update({
          where: { id: currentTeam.registration1.id },
          data: updatedData,
        }),
        prisma.registration.update({
          where: { id: currentTeam.registration2.id },
          data: updatedData,
        })
      ])

      // Obtener el team actualizado para retornar
      const updatedTeam = await prisma.team.findUnique({
        where: { id },
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
        description: `Estado de inscripción de equipo actualizado de ${oldStatus} a ${validatedData.status}`,
        oldData: { registrationStatus: oldStatus },
        newData: { registrationStatus: validatedData.status },
      }, request)

      return NextResponse.json(updatedTeam)
    } else {
      // Para Registration individual
      const updatedData: any = {
        registrationStatus: validatedData.status,
      }

      // Si se agregan notas, agregarlas
      if (validatedData.notes) {
        updatedData.notes = currentRegistration.notes
          ? `${currentRegistration.notes}\n[${new Date().toISOString()}] ${validatedData.notes}`
          : validatedData.notes
      }

      const updatedRegistration = await prisma.registration.update({
        where: { id },
        data: updatedData,
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
        resourceId: id,
        description: `Estado de inscripción actualizado de ${oldStatus} a ${validatedData.status}`,
        oldData: { registrationStatus: oldStatus },
        newData: { registrationStatus: validatedData.status },
      }, request)

      return NextResponse.json(updatedRegistration)
    }

    // TODO: Enviar notificación por email sobre cambio de estado
    // TODO: Si el estado cambia a PAID, verificar si hay pago pendiente

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
