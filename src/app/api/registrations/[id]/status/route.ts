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

    // Buscar la inscripción actual
    const currentRegistration = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
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
        },
      }
    })

    if (!currentRegistration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Validaciones de negocio según el cambio de estado
    if (validatedData.status === 'PAID' && currentRegistration.registrationStatus !== 'CONFIRMED') {
      // Advertencia: permitir el cambio pero loguear
      console.warn(`Cambio de estado de ${currentRegistration.registrationStatus} a PAID sin pasar por CONFIRMED`)
    }

    if (validatedData.status === 'CANCELLED' && currentRegistration.tournament.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: "No se puede cancelar una inscripción mientras el torneo está en progreso" },
        { status: 400 }
      )
    }

    if (currentRegistration.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden modificar inscripciones de torneos completados" },
        { status: 400 }
      )
    }

    // Actualizar el estado
    const updatedData: any = {
      registrationStatus: validatedData.status,
    }

    // Si se agregan notas, agregarlas
    if (validatedData.notes) {
      updatedData.notes = currentRegistration.notes
        ? `${currentRegistration.notes}\n[${new Date().toISOString()}] ${validatedData.notes}`
        : validatedData.notes
    }

    const updatedRegistration = await prisma.team.update({
      where: { id: params.id },
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
      resourceId: params.id,
      description: `Estado de inscripción actualizado de ${currentRegistration.registrationStatus} a ${validatedData.status}`,
      oldData: { registrationStatus: currentRegistration.registrationStatus },
      newData: { registrationStatus: validatedData.status },
    }, request)

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
