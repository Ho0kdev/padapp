/**
 * Validaciones compartidas para el módulo de registrations
 * Evita duplicación de código y centraliza la lógica de validación
 */

import { NextResponse } from "next/server"

interface Tournament {
  status: string
  registrationStart: Date | null
  registrationEnd: Date | null
}

/**
 * Valida que el torneo esté en estado de inscripciones abiertas
 */
export function validateTournamentStatus(tournament: Tournament): NextResponse | null {
  if (tournament.status !== 'REGISTRATION_OPEN') {
    return NextResponse.json(
      { error: "Las inscripciones para este torneo no están abiertas" },
      { status: 400 }
    )
  }

  return null
}

/**
 * Valida que las fechas de inscripción sean válidas
 * Compara solo fechas (sin hora) para que el último día incluya todo el día
 */
export function validateRegistrationDates(tournament: Tournament): NextResponse | null {
  const now = new Date()
  const registrationStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
  const registrationEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null

  // Validar fecha de inicio
  if (registrationStart) {
    const startDate = new Date(
      registrationStart.getFullYear(),
      registrationStart.getMonth(),
      registrationStart.getDate()
    )
    const currentDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

    if (currentDate < startDate) {
      return NextResponse.json(
        { error: "Las inscripciones aún no han comenzado" },
        { status: 400 }
      )
    }
  }

  // Validar fecha de fin
  if (registrationEnd) {
    const endDate = new Date(
      registrationEnd.getFullYear(),
      registrationEnd.getMonth(),
      registrationEnd.getDate()
    )
    const currentDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

    if (currentDate > endDate) {
      return NextResponse.json(
        { error: "Las inscripciones ya han finalizado" },
        { status: 400 }
      )
    }
  }

  return null
}

/**
 * Valida el nivel de categoría de un jugador
 * Nivel más bajo = mejor jugador (ej: nivel 1 o 2 = profesional)
 * Nivel más alto = principiante (ej: nivel 8 = principiante)
 * Un jugador puede jugar en su nivel o en niveles más bajos (con mejores jugadores)
 * pero NO puede jugar en niveles más altos (con principiantes) - sería injusto
 */
export function validatePlayerCategoryLevel(
  playerLevel: number | null | undefined,
  categoryLevel: number | null | undefined,
  playerName: string,
  playerCategoryName: string | null | undefined,
  tournamentCategoryName: string
): NextResponse | null {
  // Si alguno no tiene nivel definido, no validar
  if (!playerLevel || !categoryLevel) {
    return null
  }

  if (playerLevel < categoryLevel) {
    return NextResponse.json(
      {
        error: `El nivel del jugador ${playerName} (${playerCategoryName} - Nivel ${playerLevel}) es superior para la categoría del torneo (${tournamentCategoryName} - Nivel ${categoryLevel}). Solo puede jugar en categorías de su nivel o superior.`
      },
      { status: 400 }
    )
  }

  return null
}

/**
 * Calcula si una inscripción debe ir a lista de espera
 */
export function shouldBeWaitlisted(
  currentCount: number,
  maxAllowed: number | null
): boolean {
  if (!maxAllowed) return false
  return currentCount >= maxAllowed
}

/**
 * Determina el estado inicial de una registration
 */
export function getInitialRegistrationStatus(isWaitlist: boolean): 'PENDING' | 'WAITLIST' {
  return isWaitlist ? 'WAITLIST' : 'PENDING'
}
