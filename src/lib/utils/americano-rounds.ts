/**
 * Utilidades para cálculo de rondas en Americano Social
 */

/**
 * Calcula el número máximo de rondas que se pueden jugar sin que los jugadores se repitan en el mismo pool
 *
 * Este es un problema combinatorio conocido como "Social Golfer Problem":
 * - Formar grupos de 4 jugadores
 * - Maximizar rondas donde ninguna pareja se repite en el mismo grupo
 * - No existe fórmula exacta (problema NP-completo)
 *
 * Fórmula aproximada conservadora:
 * - Rondas máximas ≈ (N/4) - 1
 * - Basada en análisis de casos conocidos para pools de 4
 *
 * Explicación:
 * - Con N jugadores formamos N/4 pools por ronda
 * - Cada pool genera C(4,2) = 6 parejas únicas
 * - El límite práctico es aproximadamente un pool menos que el total
 * - Debido a restricciones combinatorias (no todas las parejas pueden coexistir en pools)
 *
 * Ejemplos verificados:
 * - 8 jugadores: (8/4)-1 = 1 ronda sin repetir
 * - 12 jugadores: (12/4)-1 = 2 rondas sin repetir
 * - 16 jugadores: (16/4)-1 = 3 rondas sin repetir
 * - 20 jugadores: (20/4)-1 = 4 rondas sin repetir
 *
 * NOTA: El algoritmo greedy intentará minimizar repeticiones más allá de este límite,
 * pero no puede garantizar 0 repeticiones después del límite calculado.
 *
 * @param numPlayers Número de jugadores confirmados
 * @returns Número máximo de rondas sin que los jugadores se repitan en pools
 */
export function calculateMaxRoundsWithoutRepetition(numPlayers: number): number {
  if (numPlayers < 4 || numPlayers % 4 !== 0) {
    return 0
  }

  // Fórmula conservadora: (N/4) - 1
  const numPools = numPlayers / 4
  return Math.max(1, numPools - 1)
}

/**
 * Genera un mensaje informativo sobre las rondas recomendadas
 *
 * @param numPlayers Número de jugadores confirmados
 * @returns Mensaje informativo
 */
export function getRoundsRecommendationMessage(numPlayers: number): string {
  if (numPlayers < 4) {
    return "Se requieren al menos 4 jugadores"
  }

  if (numPlayers % 4 !== 0) {
    return `Se requiere un múltiplo de 4 jugadores. Faltan ${4 - (numPlayers % 4)} jugador(es)`
  }

  const maxRounds = calculateMaxRoundsWithoutRepetition(numPlayers)
  const pools = numPlayers / 4

  return `Con ${numPlayers} jugadores (${pools} pool${pools > 1 ? 's' : ''} por ronda), se recomienda hasta ${maxRounds} ronda${maxRounds > 1 ? 's' : ''} para minimizar repeticiones. A partir de la ronda ${maxRounds + 1}, es inevitable que algunos jugadores compartan pool nuevamente (el algoritmo minimizará estas repeticiones).`
}

/**
 * Valida si el número de rondas es válido
 *
 * @param rounds Número de rondas deseadas
 * @param numPlayers Número de jugadores
 * @returns true si es válido
 */
export function isValidRoundsConfiguration(rounds: number, numPlayers: number): boolean {
  if (rounds < 1 || rounds > 10) return false
  if (numPlayers < 4 || numPlayers % 4 !== 0) return false

  return true
}
