import { NextRequest, NextResponse } from "next/server"
import { requireAuth, handleAuthError } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const eligibilityCheckSchema = z.object({
  tournamentId: z.string().min(1, "ID del torneo requerido"),
  categoryId: z.string().min(1, "ID de categoría requerido"),
  player1Id: z.string().min(1, "ID del jugador 1 requerido"),
  player2Id: z.string().min(1, "ID del jugador 2 requerido"),
}).refine((data) => {
  return data.player1Id !== data.player2Id
}, {
  message: "Los jugadores deben ser diferentes",
  path: ["player2Id"]
})

interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  warnings: string[]
  info: {
    tournament: {
      id: string
      name: string
      status: string
      registrationStart: Date | null
      registrationEnd: Date | null
      maxParticipants: number | null
    }
    category: {
      id: string
      name: string
      type: string
      genderRestriction: string | null
      minAge: number | null
      maxAge: number | null
      minRankingPoints: number | null
      maxRankingPoints: number | null
    }
    currentTeamsCount: number
    maxTeamsAllowed: number | null
    registrationFee: number | null
    isWaitlistAvailable: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const validatedData = eligibilityCheckSchema.parse(body)

    // Obtener información del torneo y categoría
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

    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "Categoría no disponible en este torneo" },
        { status: 404 }
      )
    }

    // Obtener información de los jugadores
    const [player1, player2] = await Promise.all([
      prisma.player.findUnique({
        where: { id: validatedData.player1Id },
        include: {
          user: {
            select: {
              email: true,
              status: true
            }
          }
        }
      }),
      prisma.player.findUnique({
        where: { id: validatedData.player2Id },
        include: {
          user: {
            select: {
              email: true,
              status: true
            }
          }
        }
      })
    ])

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: "Uno o ambos jugadores no existen" },
        { status: 404 }
      )
    }

    // Contar equipos actuales en la categoría
    const currentTeamsCount = await prisma.team.count({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        status: {
          in: ['DRAFT', 'CONFIRMED']
        }
      }
    })

    // Inicializar resultado
    const result: EligibilityResult = {
      eligible: true,
      reasons: [],
      warnings: [],
      info: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          registrationStart: tournament.registrationStart,
          registrationEnd: tournament.registrationEnd,
          maxParticipants: tournament.maxParticipants
        },
        category: {
          id: tournamentCategory.category.id,
          name: tournamentCategory.category.name,
          type: tournamentCategory.category.type,
          genderRestriction: tournamentCategory.category.genderRestriction,
          minAge: tournamentCategory.category.minAge,
          maxAge: tournamentCategory.category.maxAge,
          minRankingPoints: tournamentCategory.category.minRankingPoints,
          maxRankingPoints: tournamentCategory.category.maxRankingPoints
        },
        currentTeamsCount,
        maxTeamsAllowed: tournamentCategory.maxTeams,
        registrationFee: tournamentCategory.registrationFee,
        isWaitlistAvailable: false
      }
    }

    // Verificar estado del torneo
    if (tournament.status !== 'REGISTRATION_OPEN') {
      result.eligible = false
      result.reasons.push(`Las inscripciones para este torneo no están abiertas (Estado: ${tournament.status})`)
    }

    // Verificar fechas de inscripción
    const now = new Date()
    if (tournament.registrationStart && now < tournament.registrationStart) {
      result.eligible = false
      result.reasons.push(`Las inscripciones aún no han iniciado (Inician: ${tournament.registrationStart.toLocaleDateString()})`)
    }

    if (tournament.registrationEnd && now > tournament.registrationEnd) {
      result.eligible = false
      result.reasons.push(`El período de inscripciones ha terminado (Terminó: ${tournament.registrationEnd.toLocaleDateString()})`)
    }

    // Verificar estado de los usuarios
    if (player1.user?.status !== 'ACTIVE') {
      result.eligible = false
      result.reasons.push(`El jugador ${player1.firstName} ${player1.lastName} no tiene cuenta activa`)
    }

    if (player2.user?.status !== 'ACTIVE') {
      result.eligible = false
      result.reasons.push(`El jugador ${player2.firstName} ${player2.lastName} no tiene cuenta activa`)
    }

    // Verificar si ya están inscritos en esta categoría
    const existingRegistration = await prisma.team.findFirst({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        OR: [
          {
            AND: [
              { registration1: { playerId: validatedData.player1Id } },
              { registration2: { playerId: validatedData.player2Id } }
            ]
          },
          {
            AND: [
              { registration1: { playerId: validatedData.player2Id } },
              { registration2: { playerId: validatedData.player1Id } }
            ]
          }
        ],
        status: {
          not: 'CANCELLED'
        }
      }
    })

    if (existingRegistration) {
      result.eligible = false
      result.reasons.push("Estos jugadores ya están inscritos juntos en esta categoría")
    }

    // Verificar si algún jugador ya está inscrito con otra pareja
    const player1OtherRegistration = await prisma.team.findFirst({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        OR: [
          { registration1: { playerId: validatedData.player1Id } },
          { registration2: { playerId: validatedData.player1Id } }
        ],
        status: {
          not: 'CANCELLED'
        }
      }
    })

    const player2OtherRegistration = await prisma.team.findFirst({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        OR: [
          { registration1: { playerId: validatedData.player2Id } },
          { registration2: { playerId: validatedData.player2Id } }
        ],
        status: {
          not: 'CANCELLED'
        }
      }
    })

    if (player1OtherRegistration) {
      result.eligible = false
      result.reasons.push(`${player1.firstName} ${player1.lastName} ya está inscrito en esta categoría con otra pareja`)
    }

    if (player2OtherRegistration) {
      result.eligible = false
      result.reasons.push(`${player2.firstName} ${player2.lastName} ya está inscrito en esta categoría con otra pareja`)
    }

    // Verificar restricciones de categoría por género
    if (tournamentCategory.category.genderRestriction) {
      const restriction = tournamentCategory.category.genderRestriction

      if (restriction === 'MALE' && (player1.gender !== 'MALE' || player2.gender !== 'MALE')) {
        result.eligible = false
        result.reasons.push("Esta categoría es solo para hombres")
      }

      if (restriction === 'FEMALE' && (player1.gender !== 'FEMALE' || player2.gender !== 'FEMALE')) {
        result.eligible = false
        result.reasons.push("Esta categoría es solo para mujeres")
      }

      if (restriction === 'MIXED' && (player1.gender === player2.gender)) {
        result.eligible = false
        result.reasons.push("Esta categoría requiere equipos mixtos (un hombre y una mujer)")
      }
    }

    // Verificar restricciones de edad
    if (tournamentCategory.category.minAge || tournamentCategory.category.maxAge) {
      const today = new Date()

      for (const player of [player1, player2]) {
        if (player.dateOfBirth) {
          const age = today.getFullYear() - player.dateOfBirth.getFullYear()

          if (tournamentCategory.category.minAge && age < tournamentCategory.category.minAge) {
            result.eligible = false
            result.reasons.push(`${player.firstName} ${player.lastName} es menor a la edad mínima requerida (${tournamentCategory.category.minAge} años)`)
          }

          if (tournamentCategory.category.maxAge && age > tournamentCategory.category.maxAge) {
            result.eligible = false
            result.reasons.push(`${player.firstName} ${player.lastName} excede la edad máxima permitida (${tournamentCategory.category.maxAge} años)`)
          }
        }
      }
    }

    // Verificar restricciones de ranking
    if (tournamentCategory.category.minRankingPoints || tournamentCategory.category.maxRankingPoints) {
      for (const player of [player1, player2]) {
        if (tournamentCategory.category.minRankingPoints && player.rankingPoints < tournamentCategory.category.minRankingPoints) {
          result.eligible = false
          result.reasons.push(`${player.firstName} ${player.lastName} no alcanza el puntaje mínimo de ranking (${tournamentCategory.category.minRankingPoints} puntos)`)
        }

        if (tournamentCategory.category.maxRankingPoints && player.rankingPoints > tournamentCategory.category.maxRankingPoints) {
          result.eligible = false
          result.reasons.push(`${player.firstName} ${player.lastName} excede el puntaje máximo de ranking (${tournamentCategory.category.maxRankingPoints} puntos)`)
        }
      }
    }

    // Verificar cupos disponibles
    if (tournamentCategory.maxTeams) {
      if (currentTeamsCount >= tournamentCategory.maxTeams) {
        if (result.eligible) {
          result.eligible = false
          result.reasons.push("No hay cupos disponibles en esta categoría")
          result.info.isWaitlistAvailable = true
          result.warnings.push("Puedes inscribirte en la lista de espera")
        }
      } else {
        const remainingSpots = tournamentCategory.maxTeams - currentTeamsCount
        if (remainingSpots <= 3) {
          result.warnings.push(`Quedan solo ${remainingSpots} cupos disponibles`)
        }
      }
    }

    // Advertencias adicionales
    if (tournamentCategory.registrationFee && tournamentCategory.registrationFee > 0) {
      result.warnings.push(`Esta categoría tiene una tarifa de inscripción de $${tournamentCategory.registrationFee}`)
    }

    return NextResponse.json(result)

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