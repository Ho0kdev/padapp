// src/lib/eligibility.ts
import { prisma } from "@/lib/prisma"

export type EligibilityResult = {
  eligible: boolean
  reason?: string
  requiresManualReview?: boolean
}

/**
 * Verifica si un jugador es elegible para inscribirse en una categoría de torneo
 * basándose en el nivel de categoría
 *
 * Reglas:
 * - Si la categoría NO tiene level definido → todos son elegibles
 * - Si el jugador NO tiene categoría principal con level → requiere revisión manual
 * - Si el jugador tiene level MENOR que la categoría → NO elegible (es demasiado bueno)
 * - Si el jugador tiene level MAYOR O IGUAL que la categoría → elegible
 */
export async function checkCategoryEligibility(
  playerId: string,
  categoryId: string
): Promise<EligibilityResult> {
  try {
    // Obtener jugador con su categoría principal
    const player = await prisma.player.findUnique({
      where: { id: playerId },
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
      return {
        eligible: false,
        reason: "Jugador no encontrado"
      }
    }

    // Obtener categoría del torneo
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        level: true
      }
    })

    if (!category) {
      return {
        eligible: false,
        reason: "Categoría no encontrada"
      }
    }

    // Si la categoría NO tiene level definido → todos son elegibles
    if (!category.level) {
      return {
        eligible: true
      }
    }

    // Si el jugador NO tiene categoría principal → requiere revisión manual
    if (!player.primaryCategory) {
      return {
        eligible: true, // Permitir inscripción pero marcar para revisión
        requiresManualReview: true,
        reason: "El jugador no tiene categoría principal definida. La inscripción requiere aprobación del organizador."
      }
    }

    // Si la categoría principal del jugador NO tiene level → requiere revisión manual
    if (!player.primaryCategory.level) {
      return {
        eligible: true, // Permitir inscripción pero marcar para revisión
        requiresManualReview: true,
        reason: "La categoría principal del jugador no tiene nivel definido. La inscripción requiere aprobación del organizador."
      }
    }

    // Validar niveles
    // Jugador con level MENOR es MEJOR (ej: nivel 3 es mejor que nivel 7)
    // Solo puede jugar en su nivel o niveles MENORES (más bajos en habilidad)
    if (player.primaryCategory.level < category.level) {
      return {
        eligible: false,
        reason: `No elegible. Tu categoría principal es "${player.primaryCategory.name}" (nivel ${player.primaryCategory.level}) que es superior a la categoría del torneo "${category.name}" (nivel ${category.level}). Solo puedes inscribirte en categorías de nivel ${player.primaryCategory.level} o menor.`
      }
    }

    // Elegible
    return {
      eligible: true
    }

  } catch (error) {
    console.error('Error checking eligibility:', error)
    return {
      eligible: false,
      reason: "Error al verificar elegibilidad"
    }
  }
}

/**
 * Verifica elegibilidad para múltiples jugadores (para equipos)
 */
export async function checkTeamEligibility(
  player1Id: string,
  player2Id: string,
  categoryId: string
): Promise<{
  eligible: boolean
  player1Result: EligibilityResult
  player2Result: EligibilityResult
  reason?: string
}> {
  const [player1Result, player2Result] = await Promise.all([
    checkCategoryEligibility(player1Id, categoryId),
    checkCategoryEligibility(player2Id, categoryId)
  ])

  // Ambos jugadores deben ser elegibles
  const eligible = player1Result.eligible && player2Result.eligible

  let reason: string | undefined
  if (!eligible) {
    const reasons = []
    if (!player1Result.eligible) reasons.push(`Jugador 1: ${player1Result.reason}`)
    if (!player2Result.eligible) reasons.push(`Jugador 2: ${player2Result.reason}`)
    reason = reasons.join(' | ')
  }

  return {
    eligible,
    player1Result,
    player2Result,
    reason
  }
}
