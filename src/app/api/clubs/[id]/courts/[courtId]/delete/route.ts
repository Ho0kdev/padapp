import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CourtLogService } from "@/lib/services/court-log-service"

// POST /api/clubs/[id]/courts/[courtId]/delete - Eliminar cancha lógicamente
export async function POST(
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

    // Verificar que no tenga partidos asociados (históricos o actuales)
    const totalMatches = await prisma.match.count({
      where: {
        courtId
      }
    })

    if (totalMatches > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar una cancha que tiene partidos asociados",
          details: `Esta cancha tiene ${totalMatches} partido(s) asociado(s). Las canchas con historial de partidos no pueden eliminarse para preservar la integridad de los datos.`,
          canDelete: false,
          matchCount: totalMatches
        },
        { status: 400 }
      )
    }

    // Marcar como eliminada lógicamente
    const court = await prisma.court.update({
      where: { id: courtId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        status: "UNAVAILABLE" // También cambiar el status por seguridad
      },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    })

    // Log de eliminación de cancha
    await CourtLogService.logCourtDeleted(
      { userId: session.user.id, courtId, clubId },
      existingCourt
    )

    return NextResponse.json({
      message: "Cancha eliminada exitosamente",
      court: {
        id: court.id,
        name: court.name,
        deleted: true,
        deletedAt: court.deletedAt
      }
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