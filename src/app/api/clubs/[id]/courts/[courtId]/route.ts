import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { courtEditSchema } from "@/lib/validations/court"
import { z } from "zod"

// GET /api/clubs/[id]/courts/[courtId] - Obtener una cancha específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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
    console.error("Error fetching court:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/clubs/[id]/courts/[courtId] - Actualizar cancha
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden editar canchas" },
        { status: 403 }
      )
    }

    const { id: clubId, courtId } = await params
    const body = await request.json()
    const validatedData = courtEditSchema.parse(body)

    // Verificar que la cancha existe y pertenece al club
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId
      }
    })

    if (!existingCourt) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no exista otra cancha con el mismo nombre en el club
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

    const court = await prisma.court.update({
      where: { id: courtId },
      data: {
        name: validatedData.name,
        surface: validatedData.surface,
        hasLighting: validatedData.hasLighting,
        hasRoof: validatedData.hasRoof,
        isOutdoor: validatedData.isOutdoor,
        hasPanoramicGlass: validatedData.hasPanoramicGlass,
        hasConcreteWall: validatedData.hasConcreteWall,
        hasNet4m: validatedData.hasNet4m,
        status: validatedData.status,
        hourlyRate: validatedData.hourlyRate,
        notes: validatedData.notes,
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

    return NextResponse.json(court)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating court:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/clubs/[id]/courts/[courtId] - Eliminar cancha
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden eliminar canchas" },
        { status: 403 }
      )
    }

    const { id: clubId, courtId } = await params

    // Verificar que la cancha existe y pertenece al club
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId
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
        { error: "No se puede eliminar una cancha con partidos programados o en progreso" },
        { status: 400 }
      )
    }

    // En lugar de eliminar, cambiar status a UNAVAILABLE
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

    return NextResponse.json({
      message: "Cancha desactivada exitosamente",
      court
    })

  } catch (error) {
    console.error("Error deleting court:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}

// PATCH /api/clubs/[id]/courts/[courtId] - Activar cancha desactivada
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden activar canchas" },
        { status: 403 }
      )
    }

    const { id: clubId, courtId } = await params

    // Verificar que la cancha existe y pertenece al club
    const existingCourt = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId
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

    return NextResponse.json({
      message: "Cancha activada exitosamente",
      court
    })

  } catch (error) {
    console.error("Error activating court:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}