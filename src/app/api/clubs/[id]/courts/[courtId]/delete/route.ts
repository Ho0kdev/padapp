import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// POST /api/clubs/[id]/courts/[courtId]/delete - Eliminar cancha lógicamente
export async function POST(
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

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.COURT,
      resourceId: courtId,
      description: `Cancha ${existingCourt.name} eliminada lógicamente del club ${court.club.name}`,
      oldData: existingCourt,
      newData: { deleted: true, deletedAt: court.deletedAt, status: "UNAVAILABLE" },
    }, request)

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
    return handleAuthError(error)
  }
}