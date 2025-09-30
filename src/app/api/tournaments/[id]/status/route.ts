import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TournamentLogService } from "@/lib/services/tournament-log-service"
import { z } from "zod"

const statusChangeSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ])
})

// Definir transiciones válidas de estados (incluyendo retrocesos permitidos)
const validTransitions: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["DRAFT", "REGISTRATION_OPEN", "CANCELLED"],
  REGISTRATION_OPEN: ["PUBLISHED", "REGISTRATION_CLOSED", "CANCELLED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REGISTRATION_CLOSED", "COMPLETED", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"], // Solo permitir volver a IN_PROGRESS si se necesita corrección
  CANCELLED: ["DRAFT", "PUBLISHED"] // Permitir reactivar torneos cancelados
}

// Definir qué transiciones son retrocesos que requieren validaciones especiales
const backwardTransitions: Record<string, string[]> = {
  PUBLISHED: ["DRAFT"],
  REGISTRATION_OPEN: ["PUBLISHED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN"],
  IN_PROGRESS: ["REGISTRATION_CLOSED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["DRAFT", "PUBLISHED"]
}

// PATCH /api/tournaments/[id]/status - Cambiar estado del torneo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status: newStatus } = statusChangeSchema.parse(body)

    // Verificar que el torneo existe y obtener su estado actual
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        organizerId: true,
        status: true,
        registrationStart: true,
        registrationEnd: true,
        tournamentStart: true,
        _count: { select: { teams: true } }
      }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isOwner = existingTournament.organizerId === session.user.id
    const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

    if (!isOwner && !isAdminOrClubAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para cambiar el estado de este torneo" },
        { status: 403 }
      )
    }

    // Verificar que la transición es válida
    const currentStatus = existingTournament.status
    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar de ${currentStatus} a ${newStatus}`,
          allowedTransitions
        },
        { status: 400 }
      )
    }

    // Verificar si es un retroceso y aplicar validaciones especiales
    const isBackwardTransition = backwardTransitions[currentStatus]?.includes(newStatus)

    if (isBackwardTransition) {
      // Validaciones especiales para retrocesos
      switch (currentStatus) {
        case "IN_PROGRESS":
          // Solo permitir retroceder si no hay partidos jugados
          const matchesPlayed = await prisma.match.count({
            where: {
              tournamentId: id,
              status: "COMPLETED"
            }
          })

          if (matchesPlayed > 0) {
            return NextResponse.json(
              { error: "No se puede retroceder un torneo que ya tiene partidos jugados" },
              { status: 400 }
            )
          }
          break

        case "COMPLETED":
          // Solo admins y club admins pueden retroceder torneos completados
          if (user?.role !== "ADMIN" && user?.role !== "CLUB_ADMIN") {
            return NextResponse.json(
              { error: "Solo los administradores pueden retroceder torneos completados" },
              { status: 403 }
            )
          }
          break

        case "REGISTRATION_CLOSED":
          // Si hay equipos registrados, advertir pero permitir
          if (existingTournament._count.teams > 0 && newStatus === "REGISTRATION_OPEN") {
            // Permitir pero registrar en logs
            console.log(`⚠️ Reopening registration for tournament ${id} with ${existingTournament._count.teams} teams registered`)
          }
          break
      }
    }

    // Validaciones específicas según el estado
    const now = new Date()

    switch (newStatus) {
      case "REGISTRATION_OPEN":
        if (existingTournament.registrationStart && existingTournament.registrationStart > now) {
          return NextResponse.json(
            { error: "No se puede abrir inscripciones antes de la fecha de inicio de inscripciones" },
            { status: 400 }
          )
        }
        if (existingTournament.registrationEnd && existingTournament.registrationEnd < now) {
          return NextResponse.json(
            { error: "No se puede abrir inscripciones después de la fecha de fin de inscripciones" },
            { status: 400 }
          )
        }
        break

      case "REGISTRATION_CLOSED":
        // Automáticamente cambiar si ya pasó la fecha de fin de inscripciones
        break

      case "IN_PROGRESS":
        if (existingTournament.tournamentStart > now) {
          return NextResponse.json(
            { error: "No se puede iniciar el torneo antes de la fecha de inicio" },
            { status: 400 }
          )
        }
        if (existingTournament._count.teams === 0) {
          return NextResponse.json(
            { error: "No se puede iniciar un torneo sin equipos registrados" },
            { status: 400 }
          )
        }
        break

      case "COMPLETED":
        // Podríamos verificar que todos los partidos estén jugados
        break

      case "CANCELLED":
        // Siempre permitido desde cualquier estado (excepto COMPLETED)
        if (currentStatus === "COMPLETED") {
          return NextResponse.json(
            { error: "No se puede cancelar un torneo completado" },
            { status: 400 }
          )
        }
        break
    }

    // Actualizar el estado del torneo
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        clubs: {
          include: {
            club: true
          }
        },
        _count: {
          select: {
            teams: true,
            matches: true
          }
        }
      }
    })

    // Registrar en el log
    await TournamentLogService.logTournamentStatusChanged(
      {
        userId: session.user.id,
        tournamentId: updatedTournament.id,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      updatedTournament,
      currentStatus,
      newStatus
    )

    return NextResponse.json(updatedTournament)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Estado inválido", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error changing tournament status:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}