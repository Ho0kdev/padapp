import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  validateTournamentStatus,
  validateRegistrationDates,
  validatePlayerCategoryLevel,
  shouldBeWaitlisted,
  getInitialRegistrationStatus
} from "@/lib/validations/registration-validations"

const individualRegistrationSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  playerId: z.string().min(1, "El jugador es requerido"),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debe aceptar los términos y condiciones"
  }),
})

/**
 * POST /api/registrations/individual
 * Crea una inscripción individual (para Americano Social)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.REGISTRATION)

    const body = await request.json()
    const validatedData = individualRegistrationSchema.parse(body)

    // Verificar que el torneo existe y es AMERICANO_SOCIAL
    const tournament = await prisma.tournament.findUnique({
      where: { id: validatedData.tournamentId },
      include: {
        categories: {
          where: { categoryId: validatedData.categoryId },
          include: {
            category: true
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    if (tournament.type !== 'AMERICANO_SOCIAL') {
      return NextResponse.json(
        { error: "Este endpoint es solo para torneos de tipo Americano Social" },
        { status: 400 }
      )
    }

    // Validar estado del torneo
    const statusError = validateTournamentStatus(tournament)
    if (statusError) return statusError

    // Validar fechas de inscripción
    const datesError = validateRegistrationDates(tournament)
    if (datesError) return datesError

    // Verificar que la categoría existe en el torneo
    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "Categoría no disponible en este torneo" },
        { status: 400 }
      )
    }

    // Verificar que el jugador existe y obtener su categoría principal
    const player = await prisma.player.findUnique({
      where: { id: validatedData.playerId },
      include: {
        primaryCategory: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    })

    if (!player) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 400 }
      )
    }

    // Validar nivel de categoría
    const levelError = validatePlayerCategoryLevel(
      player.primaryCategory?.level,
      tournamentCategory.category.level,
      `${player.firstName} ${player.lastName}`,
      player.primaryCategory?.name,
      tournamentCategory.category.name
    )
    if (levelError) return levelError

    // Verificar que el jugador no esté ya inscrito en esta categoría del torneo
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        tournamentId_categoryId_playerId: {
          tournamentId: validatedData.tournamentId,
          categoryId: validatedData.categoryId,
          playerId: validatedData.playerId
        }
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: `${player.firstName} ${player.lastName} ya está inscrito en esta categoría` },
        { status: 400 }
      )
    }

    // Verificar cupo disponible
    const currentRegistrationsCount = await prisma.registration.count({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        registrationStatus: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    })

    const isWaitlist = shouldBeWaitlisted(currentRegistrationsCount, tournamentCategory.maxTeams)
    const registrationStatus = getInitialRegistrationStatus(isWaitlist)

    // Crear la registration
    const registration = await prisma.registration.create({
      data: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        playerId: validatedData.playerId,
        registrationStatus,
        notes: validatedData.notes,
      },
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
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.REGISTRATION,
      resourceId: registration.id,
      description: `Inscripción individual creada: ${registration.player.firstName} ${registration.player.lastName} - ${registration.tournament.name}`,
      newData: registration,
    }, request)

    return NextResponse.json(registration, { status: 201 })

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
