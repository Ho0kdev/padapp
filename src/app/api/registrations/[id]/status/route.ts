import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { RegistrationLogService } from "@/lib/services/registration-log-service"

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
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/registrations/[id]/status
 *
 * Actualiza el estado de una inscripción.
 * Maneja dos casos:
 * 1. Torneos Americano Social: Se pasa un ID de Registration (individual)
 * 2. Torneos Convencionales: Se pasa un ID de Team (pareja)
 *    - Actualiza AMBAS registrations del equipo para mantener consistencia
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await authorize(Action.UPDATE, Resource.REGISTRATION)
    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)
    const { id } = await params

    // Paso 1: Determinar si es un Team (torneo convencional) o Registration (americano social)
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          }
        },
        registration1: {
          select: {
            id: true,
            registrationStatus: true,
            notes: true,
          }
        },
        registration2: {
          select: {
            id: true,
            registrationStatus: true,
            notes: true,
          }
        }
      }
    })

    if (team) {
      // Caso 1: Torneo Convencional (Team de pareja)
      return await handleTeamStatusUpdate(id, team, validatedData, session, request)
    } else {
      // Caso 2: Torneo Americano Social (Registration individual)
      const registration = await prisma.registration.findUnique({
        where: { id },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
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

      if (!registration) {
        return NextResponse.json(
          { error: "Inscripción no encontrada" },
          { status: 404 }
        )
      }

      return await handleIndividualRegistrationStatusUpdate(id, registration, validatedData, session, request)
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
 * Maneja la actualización de estado para equipos (torneos convencionales)
 * Actualiza ambas registrations del equipo para mantener consistencia
 */
async function handleTeamStatusUpdate(
  teamId: string,
  team: any,
  validatedData: z.infer<typeof updateStatusSchema>,
  session: any,
  request: NextRequest
) {
  const currentStatus = team.registration1.registrationStatus

  // Validaciones de negocio
  const validationError = validateStatusChange(
    validatedData.status,
    currentStatus,
    team.tournament.status
  )
  if (validationError) {
    return validationError
  }

  // Preparar datos de actualización
  const updateData = {
    registrationStatus: validatedData.status,
    ...(validatedData.notes && {
      notes: team.registration1.notes
        ? `${team.registration1.notes}\n[${new Date().toISOString()}] ${validatedData.notes}`
        : validatedData.notes
    })
  }

  // Actualizar AMBAS registrations del equipo en una transacción
  await prisma.$transaction([
    prisma.registration.update({
      where: { id: team.registration1.id },
      data: updateData,
    }),
    prisma.registration.update({
      where: { id: team.registration2.id },
      data: updateData,
    })
  ])

  // Obtener el team actualizado con todos los datos necesarios
  const updatedTeam = await prisma.team.findUnique({
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

  // Auditoría
  await AuditLogger.log(session, {
    action: Action.UPDATE,
    resource: Resource.REGISTRATION,
    resourceId: teamId,
    description: `Estado de equipo actualizado de ${currentStatus} a ${validatedData.status}`,
    oldData: { registrationStatus: currentStatus },
    newData: { registrationStatus: validatedData.status },
  }, request)

  return NextResponse.json(updatedTeam)
}

/**
 * Maneja la actualización de estado para inscripciones individuales (americano social)
 */
async function handleIndividualRegistrationStatusUpdate(
  registrationId: string,
  registration: any,
  validatedData: z.infer<typeof updateStatusSchema>,
  session: any,
  request: NextRequest
) {
  const currentStatus = registration.registrationStatus

  // Validaciones de negocio
  const validationError = validateStatusChange(
    validatedData.status,
    currentStatus,
    registration.tournament.status
  )
  if (validationError) {
    return validationError
  }

  // Preparar datos de actualización
  const updateData = {
    registrationStatus: validatedData.status,
    ...(validatedData.notes && {
      notes: registration.notes
        ? `${registration.notes}\n[${new Date().toISOString()}] ${validatedData.notes}`
        : validatedData.notes
    })
  }

  // Actualizar la registration
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
    description: `Estado de inscripción individual actualizado de ${currentStatus} a ${validatedData.status}`,
    oldData: { registrationStatus: currentStatus },
    newData: { registrationStatus: validatedData.status },
  }, request)

  // Log status change
  await RegistrationLogService.logRegistrationStatusChanged(
    {
      userId: session.user.id,
      registrationId
    },
    updatedRegistration,
    currentStatus,
    validatedData.status
  )

  return NextResponse.json(updatedRegistration)
}

/**
 * Valida el cambio de estado según reglas de negocio
 */
function validateStatusChange(
  newStatus: string,
  currentStatus: string,
  tournamentStatus: string
): NextResponse | null {
  // Advertencia: cambiar a PAID sin pasar por CONFIRMED
  if (newStatus === 'PAID' && currentStatus !== 'CONFIRMED') {
    console.warn(`Cambio de estado de ${currentStatus} a PAID sin pasar por CONFIRMED`)
  }

  // No permitir cancelar si el torneo está en progreso
  if (newStatus === 'CANCELLED' && tournamentStatus === 'IN_PROGRESS') {
    return NextResponse.json(
      { error: "No se puede cancelar una inscripción mientras el torneo está en progreso" },
      { status: 400 }
    )
  }

  // No permitir modificar inscripciones de torneos completados
  if (tournamentStatus === 'COMPLETED') {
    return NextResponse.json(
      { error: "No se pueden modificar inscripciones de torneos completados" },
      { status: 400 }
    )
  }

  return null
}
