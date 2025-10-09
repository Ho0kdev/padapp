import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { courtEditSchema, courtStatusSchema } from "@/lib/validations/court"
import { z } from "zod"

// GET /api/clubs/[id]/courts/[courtId] - Obtener una cancha específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    await requireAuth()
    const { id: clubId, courtId } = await params

    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId // Verificar que la cancha pertenece al club
      },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            matches: true
          }
        }
      }
    })

    if (!court) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(court)

  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT /api/clubs/[id]/courts/[courtId] - Actualizar cancha
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.COURT)
    const { id: clubId, courtId } = await params
    const body = await request.json()

    // Detectar si es solo un cambio de estado o una edición completa
    const isStatusChange = Object.keys(body).length === 1 && 'status' in body

    let validatedData
    if (isStatusChange) {
      validatedData = courtStatusSchema.parse(body)
    } else {
      validatedData = courtEditSchema.parse(body)
    }

    // Verificar que la cancha existe y pertenece al club (no eliminada)
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId,
        deleted: false
      },
      include: {
        club: {
          select: { status: true }
        }
      }
    })

    if (!existingCourt) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      )
    }

    // Validar jerarquía club-cancha para cambios de estado
    if (isStatusChange) {
      // No permitir activar cancha si el club no está activo
      if (validatedData.status !== "UNAVAILABLE" && existingCourt.club.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "No se puede activar una cancha mientras el club no esté activo" },
          { status: 400 }
        )
      }
    } else {
      // En edición completa, validar estado de cancha vs club
      if (validatedData.status !== "UNAVAILABLE" && existingCourt.club.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "No se puede cambiar el estado de una cancha a disponible mientras el club no esté activo" },
          { status: 400 }
        )
      }
    }

    let court
    if (isStatusChange) {
      // Solo cambiar el estado
      court = await prisma.court.update({
        where: { id: courtId },
        data: {
          status: validatedData.status,
        },
        include: {
          club: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              matches: true
            }
          }
        }
      })

      // Auditoría
      await AuditLogger.log(session, {
        action: Action.UPDATE,
        resource: Resource.COURT,
        resourceId: courtId,
        description: `Estado de cancha ${court.name} cambiado de ${existingCourt.status} a ${validatedData.status}`,
        oldData: { status: existingCourt.status },
        newData: { status: validatedData.status },
      }, request)
    } else {
      // Edición completa - verificar nombre duplicado si se está cambiando el nombre
      if ('name' in validatedData && typeof validatedData.name === 'string') {
        const duplicateCourt = await prisma.court.findFirst({
          where: {
            clubId,
            name: validatedData.name,
            id: { not: courtId }
          }
        })

        if (duplicateCourt) {
          return NextResponse.json(
            { error: "Ya existe otra cancha con ese nombre en este club" },
            { status: 400 }
          )
        }
      }

      // Type assertion needed because TS can't narrow the union type properly
      const editData = validatedData as z.infer<typeof courtEditSchema>

      court = await prisma.court.update({
        where: { id: courtId },
        data: {
          name: editData.name,
          surface: editData.surface,
          hasLighting: editData.hasLighting,
          hasRoof: editData.hasRoof,
          isOutdoor: editData.isOutdoor,
          hasPanoramicGlass: editData.hasPanoramicGlass,
          hasConcreteWall: editData.hasConcreteWall,
          hasNet4m: editData.hasNet4m,
          status: editData.status,
          hourlyRate: editData.hourlyRate,
          notes: editData.notes,
        },
        include: {
          club: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              matches: true
            }
          }
        }
      })

      // Auditoría
      await AuditLogger.log(session, {
        action: Action.UPDATE,
        resource: Resource.COURT,
        resourceId: courtId,
        description: `Cancha ${court.name} actualizada en club ${court.club.name}`,
        oldData: existingCourt,
        newData: court,
      }, request)
    }

    return NextResponse.json(court)

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

// DELETE /api/clubs/[id]/courts/[courtId] - Desactivar cancha (cambiar status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await authorize(Action.DELETE, Resource.COURT)
    const { id: clubId, courtId } = await params

    // Verificar que la cancha existe y pertenece al club
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId,
        deleted: false // Solo canchas no eliminadas
      }
    })

    if (!existingCourt) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no tenga partidos programados o en progreso
    const activeMatches = await prisma.match.count({
      where: {
        courtId,
        status: {
          in: ["SCHEDULED", "IN_PROGRESS"]
        }
      }
    })

    if (activeMatches > 0) {
      return NextResponse.json(
        { error: "No se puede desactivar una cancha con partidos programados o en progreso" },
        { status: 400 }
      )
    }

    // Cambiar status a UNAVAILABLE
    const court = await prisma.court.update({
      where: { id: courtId },
      data: { status: "UNAVAILABLE" },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.COURT,
      resourceId: courtId,
      description: `Cancha ${court.name} desactivada (status: ${existingCourt.status} → UNAVAILABLE)`,
      oldData: { status: existingCourt.status },
      newData: { status: "UNAVAILABLE" },
    }, request)

    return NextResponse.json({
      message: "Cancha desactivada exitosamente",
      court
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

// PATCH /api/clubs/[id]/courts/[courtId] - Activar cancha desactivada
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.COURT)
    const { id: clubId, courtId } = await params

    // Verificar que la cancha existe y pertenece al club (no eliminada)
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId,
        deleted: false
      },
      include: {
        club: {
          select: { status: true }
        }
      }
    })

    if (!existingCourt) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      )
    }

    if (existingCourt.status === "AVAILABLE") {
      return NextResponse.json(
        { error: "La cancha ya está disponible" },
        { status: 400 }
      )
    }

    // Validar que el club esté activo antes de activar la cancha
    if (existingCourt.club.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No se puede activar una cancha mientras el club no esté activo. Active primero el club." },
        { status: 400 }
      )
    }

    // Activar la cancha cambiando el status a AVAILABLE
    const court = await prisma.court.update({
      where: { id: courtId },
      data: { status: "AVAILABLE" },
      include: {
        club: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            matches: true
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.COURT,
      resourceId: courtId,
      description: `Cancha ${court.name} activada (status: ${existingCourt.status} → AVAILABLE)`,
      oldData: { status: existingCourt.status },
      newData: { status: "AVAILABLE" },
    }, request)

    return NextResponse.json({
      message: "Cancha activada exitosamente",
      court
    })

  } catch (error) {
    return handleAuthError(error)
  }
}