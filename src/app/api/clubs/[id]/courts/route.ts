import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { courtFormSchema } from "@/lib/validations/court"
import { CourtLogService } from "@/lib/services/court-log-service"
import { z } from "zod"

// GET /api/clubs/[id]/courts - Obtener canchas de un club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id: clubId } = await params

    // Verificar que el club existe
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true }
    })

    if (!club) {
      return NextResponse.json(
        { error: "Club no encontrado" },
        { status: 404 }
      )
    }

    const courts = await prisma.court.findMany({
      where: { clubId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            matches: true
          }
        }
      }
    })

    return NextResponse.json({ courts, club })

  } catch (error) {
    console.error("Error fetching courts:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/clubs/[id]/courts - Crear nueva cancha
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin o tenga permisos sobre el club
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden crear canchas" },
        { status: 403 }
      )
    }

    const { id: clubId } = await params
    const body = await request.json()

    // Agregar clubId al body para validación
    const validatedData = courtFormSchema.parse({ ...body, clubId })

    // Verificar que el club existe y está activo
    const club = await prisma.club.findUnique({
      where: { id: clubId, status: "ACTIVE" }
    })

    if (!club) {
      return NextResponse.json(
        { error: "Club no encontrado o inactivo" },
        { status: 404 }
      )
    }

    // Verificar que no exista otra cancha con el mismo nombre en el club
    const existingCourt = await prisma.court.findFirst({
      where: {
        clubId,
        name: validatedData.name
      }
    })

    if (existingCourt) {
      return NextResponse.json(
        { error: "Ya existe una cancha con ese nombre en este club" },
        { status: 400 }
      )
    }

    const court = await prisma.court.create({
      data: {
        clubId,
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

    // Log la creación de la cancha
    await CourtLogService.logCourtCreated(
      { userId: session.user.id, courtId: court.id, clubId },
      court
    )

    return NextResponse.json(court, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating court:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}