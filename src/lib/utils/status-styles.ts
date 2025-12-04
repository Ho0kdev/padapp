// Opciones de estados de torneo con labels, colores y estilos CSS
export const tournamentStatusOptions = [
  { value: "DRAFT", label: "Borrador", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "PUBLISHED", label: "Publicado", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "REGISTRATION_OPEN", label: "Inscripciones Abiertas", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "REGISTRATION_CLOSED", label: "Inscripciones Cerradas", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "IN_PROGRESS", label: "En Progreso", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "COMPLETED", label: "Completado", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "CANCELLED", label: "Cancelado", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
] as const

// Opciones de estados de inscripción con labels, colores y estilos CSS
export const registrationStatusOptions = [
  { value: "PENDING", label: "Pendiente", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "CONFIRMED", label: "Confirmado", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "PAID", label: "Pagado", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "CANCELLED", label: "Cancelado", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
  { value: "WAITLIST", label: "Lista de Espera", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
] as const

// Opciones de tipos de categoría con labels, colores y estilos CSS
export const categoryTypeStyleOptions = [
  { value: "AGE", label: "Por Edad", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "SKILL", label: "Por Habilidad", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "RANKING", label: "Por Ranking", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "GENDER", label: "Por Género", color: "pink", css: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "MIXED", label: "Mixta", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
] as const

// Helper para obtener estilos de estado de torneo
export const getTournamentStatusStyle = (status: string) => {
  const option = tournamentStatusOptions.find(opt => opt.value === status)
  return option ? option.css : tournamentStatusOptions[0].css
}

// Helper para obtener label de estado de torneo
export const getTournamentStatusLabel = (status: string) => {
  const option = tournamentStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Helper para obtener estilos de estado de inscripción
export const getRegistrationStatusStyle = (status: string) => {
  const option = registrationStatusOptions.find(opt => opt.value === status)
  return option ? option.css : registrationStatusOptions[0].css
}

// Helper para obtener label de estado de inscripción
export const getRegistrationStatusLabel = (status: string) => {
  const option = registrationStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Helper para obtener estilos de tipo de categoría
export const getCategoryTypeStyle = (type: string) => {
  const option = categoryTypeStyleOptions.find(opt => opt.value === type)
  return option ? option.css : categoryTypeStyleOptions[0].css
}

// Helper para obtener label de tipo de categoría
export const getCategoryTypeLabel = (type: string) => {
  const option = categoryTypeStyleOptions.find(opt => opt.value === type)
  return option ? option.label : type
}

// Opciones de género con estilos CSS
export const genderRestrictionOptions = [
  { value: "MALE", label: "Masculino", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "FEMALE", label: "Femenino", color: "pink", css: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "MIXED", label: "Mixto", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
] as const

// Helper para obtener estilos de restricción de género
export const getGenderRestrictionStyle = (gender: string) => {
  const option = genderRestrictionOptions.find(opt => opt.value === gender)
  return option ? option.css : genderRestrictionOptions[2].css
}

// Helper para obtener label de restricción de género
export const getGenderRestrictionLabel = (gender: string) => {
  const option = genderRestrictionOptions.find(opt => opt.value === gender)
  return option ? option.label : gender
}

// Helper para formatear rango de edad
export const formatAgeRange = (minAge?: number, maxAge?: number) => {
  if (!minAge && !maxAge) return null
  if (minAge && maxAge) return `${minAge}-${maxAge} años`
  if (minAge) return `+${minAge} años`
  if (maxAge) return `-${maxAge} años`
  return null
}

// Helper para formatear rango de ranking
export const formatRankingRange = (minPoints?: number, maxPoints?: number) => {
  if (!minPoints && !maxPoints) return null
  if (minPoints && maxPoints) return `${minPoints}-${maxPoints} pts`
  if (minPoints) return `+${minPoints} pts`
  if (maxPoints) return `-${maxPoints} pts`
  return null
}

// Helper para formatear todas las restricciones de categoría como string
export const formatCategoryRestrictions = (category: {
  genderRestriction?: string | null
  minAge?: number | null
  maxAge?: number | null
  minRankingPoints?: number | null
  maxRankingPoints?: number | null
}) => {
  const restrictions: string[] = []

  if (category.genderRestriction && category.genderRestriction !== 'MIXED') {
    restrictions.push(getGenderRestrictionLabel(category.genderRestriction))
  }

  const ageRange = formatAgeRange(category.minAge || undefined, category.maxAge || undefined)
  if (ageRange) {
    restrictions.push(ageRange)
  }

  const rankingRange = formatRankingRange(category.minRankingPoints || undefined, category.maxRankingPoints || undefined)
  if (rankingRange) {
    restrictions.push(rankingRange)
  }

  return restrictions.join(' • ')
}

// Helper para obtener array de restricciones como objetos (para generar badges)
export const getCategoryRestrictionsArray = (category: {
  genderRestriction?: string | null
  minAge?: number | null
  maxAge?: number | null
  minRankingPoints?: number | null
  maxRankingPoints?: number | null
}) => {
  const restrictions: Array<{ type: 'gender' | 'age' | 'ranking', label: string, style?: string }> = []

  if (category.genderRestriction && category.genderRestriction !== 'MIXED') {
    restrictions.push({
      type: 'gender',
      label: getGenderRestrictionLabel(category.genderRestriction),
      style: getGenderRestrictionStyle(category.genderRestriction)
    })
  }

  const ageRange = formatAgeRange(category.minAge || undefined, category.maxAge || undefined)
  if (ageRange) {
    restrictions.push({
      type: 'age',
      label: ageRange,
      style: 'bg-orange-100 text-orange-800 border-orange-200'
    })
  }

  const rankingRange = formatRankingRange(category.minRankingPoints || undefined, category.maxRankingPoints || undefined)
  if (rankingRange) {
    restrictions.push({
      type: 'ranking',
      label: rankingRange,
      style: 'bg-purple-100 text-purple-800 border-purple-200'
    })
  }

  return restrictions
}

// Opciones de estado de jugador (activo/inactivo)
export const playerStatusOptions = [
  { value: true, label: "Activo", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: false, label: "Inactivo", color: "gray", css: "bg-red-100 text-red-800 border-red-200" },
] as const

// Helper para obtener estilos de estado de jugador
export const getPlayerStatusStyle = (isActive: boolean) => {
  const option = playerStatusOptions.find(opt => opt.value === isActive)
  return option ? option.css : playerStatusOptions[1].css
}

// Helper para obtener label de estado de jugador
export const getPlayerStatusLabel = (isActive: boolean) => {
  const option = playerStatusOptions.find(opt => opt.value === isActive)
  return option ? option.label : "Desconocido"
}

// Opciones de estado de club
export const clubStatusOptions = [
  { value: "ACTIVE", label: "Activo", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "INACTIVE", label: "Inactivo", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
  { value: "MAINTENANCE", label: "Mantenimiento", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
] as const

// Helper para obtener estilos de estado de club
export const getClubStatusStyle = (status: string) => {
  const option = clubStatusOptions.find(opt => opt.value === status)
  return option ? option.css : clubStatusOptions[0].css
}

// Helper para obtener label de estado de club
export const getClubStatusLabel = (status: string) => {
  const option = clubStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Opciones de estado de cancha
export const courtStatusOptions = [
  { value: "AVAILABLE", label: "Disponible", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "MAINTENANCE", label: "Mantenimiento", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "RESERVED", label: "Reservada", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "UNAVAILABLE", label: "No Disponible", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
] as const

// Helper para obtener estilos de estado de cancha
export const getCourtStatusStyle = (status: string) => {
  const option = courtStatusOptions.find(opt => opt.value === status)
  return option ? option.css : courtStatusOptions[0].css
}

// Helper para obtener label de estado de cancha
export const getCourtStatusLabel = (status: string) => {
  const option = courtStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Opciones de superficie de cancha
export const courtSurfaceOptions = [
  { value: "CONCRETE", label: "Concreto", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "ARTIFICIAL_GRASS", label: "Césped Artificial", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "CERAMIC", label: "Cerámica", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "OTHER", label: "Otra", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
] as const

// Helper para obtener estilos de superficie de cancha
export const getCourtSurfaceStyle = (surface: string) => {
  const option = courtSurfaceOptions.find(opt => opt.value === surface)
  return option ? option.css : courtSurfaceOptions[0].css
}

// Helper para obtener label de superficie de cancha
export const getCourtSurfaceLabel = (surface: string) => {
  const option = courtSurfaceOptions.find(opt => opt.value === surface)
  return option ? option.label : surface
}

// Opciones de estado de partido
export const matchStatusOptions = [
  { value: "SCHEDULED", label: "Programado", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "IN_PROGRESS", label: "En Progreso", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "COMPLETED", label: "Completado", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "CANCELLED", label: "Cancelado", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
  { value: "WALKOVER", label: "Walkover", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
] as const

// Helper para obtener estilos de estado de partido
export const getMatchStatusStyle = (status: string) => {
  const option = matchStatusOptions.find(opt => opt.value === status)
  return option ? option.css : matchStatusOptions[0].css
}

// Helper para obtener label de estado de partido
export const getMatchStatusLabel = (status: string) => {
  const option = matchStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Opciones de nivel de categoría - Niveles más bajos = mejores jugadores
export const categoryLevelOptions = [
  { level: 1, color: "red", css: "bg-red-100 text-red-800 border-red-200" },
  { level: 2, color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
  { level: 3, color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { level: 4, color: "lime", css: "bg-lime-100 text-lime-800 border-lime-200" },
  { level: 5, color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { level: 6, color: "teal", css: "bg-teal-100 text-teal-800 border-teal-200" },
  { level: 7, color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { level: 8, color: "indigo", css: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { level: 9, color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { level: 10, color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
] as const

// Helper para obtener estilos de nivel de categoría
export const getCategoryLevelStyle = (level: number) => {
  const option = categoryLevelOptions.find(opt => opt.level === level)
  return option ? option.css : "bg-gray-100 text-gray-800 border-gray-200"
}

// Helper para formatear label de nivel de categoría con nombre
export const formatCategoryLevel = (categoryName: string, level: number) => {
  return `${categoryName} - Nivel ${level}`
}

// Opciones de estado de equipo
export const teamStatusOptions = [
  { value: "DRAFT", label: "Borrador", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "CONFIRMED", label: "Confirmado", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "CANCELLED", label: "Cancelado", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
] as const

// Helper para obtener estilos de estado de equipo
export const getTeamStatusStyle = (status: string) => {
  const option = teamStatusOptions.find(opt => opt.value === status)
  return option ? option.css : teamStatusOptions[0].css
}

// Helper para obtener label de estado de equipo
export const getTeamStatusLabel = (status: string) => {
  const option = teamStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Opciones de estado de formación de equipo (para inscripciones)
export const teamFormationStatusOptions = [
  { value: "HAS_TEAM", label: "Formado", color: "blue", css: "bg-blue-600 hover:bg-blue-700" },
  { value: "NO_TEAM", label: "Sin Equipo", color: "gray", css: "text-muted-foreground" },
] as const

// Helper para obtener estilos de formación de equipo
export const getTeamFormationStatusStyle = (hasTeam: boolean) => {
  const option = teamFormationStatusOptions.find(opt => opt.value === (hasTeam ? "HAS_TEAM" : "NO_TEAM"))
  return option ? option.css : teamFormationStatusOptions[1].css
}

// Helper para obtener label de formación de equipo
export const getTeamFormationStatusLabel = (hasTeam: boolean) => {
  const option = teamFormationStatusOptions.find(opt => opt.value === (hasTeam ? "HAS_TEAM" : "NO_TEAM"))
  return option ? option.label : "Desconocido"
}

// Opciones de fase de partido (PhaseType)
export const phaseTypeOptions = [
  { value: "GROUP_STAGE", label: "Fase de Grupos", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "ROUND_OF_32", label: "32avos de Final", color: "cyan", css: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "ROUND_OF_16", label: "Octavos de Final", color: "teal", css: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "QUARTERFINALS", label: "Cuartos de Final", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "SEMIFINALS", label: "Semifinales", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "FINAL", label: "Final", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "THIRD_PLACE", label: "Tercer Puesto", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
] as const

// Helper para obtener estilos de fase de partido
export const getPhaseTypeStyle = (phaseType: string) => {
  const option = phaseTypeOptions.find(opt => opt.value === phaseType)
  return option ? option.css : phaseTypeOptions[0].css
}

// Helper para obtener label de fase de partido
export const getPhaseTypeLabel = (phaseType: string) => {
  const option = phaseTypeOptions.find(opt => opt.value === phaseType)
  return option ? option.label : phaseType
}

// Opciones de estado de pago
export const paymentStatusOptions = [
  { value: "PENDING", label: "Pendiente", color: "yellow", css: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "PAID", label: "Pagado", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "FAILED", label: "Fallido", color: "red", css: "bg-red-100 text-red-800 border-red-200" },
  { value: "REFUNDED", label: "Reembolsado", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "CANCELLED", label: "Cancelado", color: "gray", css: "bg-gray-100 text-gray-800 border-gray-200" },
] as const

// Helper para obtener estilos de estado de pago
export const getPaymentStatusStyle = (status: string) => {
  const option = paymentStatusOptions.find(opt => opt.value === status)
  return option ? option.css : paymentStatusOptions[0].css
}

// Helper para obtener label de estado de pago
export const getPaymentStatusLabel = (status: string) => {
  const option = paymentStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// Opciones de método de pago
export const paymentMethodOptions = [
  { value: "MERCADOPAGO_CARD", label: "Tarjeta (MercadoPago)", color: "blue", css: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "MERCADOPAGO_WALLET", label: "Wallet Digital", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "BANK_TRANSFER", label: "Transferencia Bancaria", color: "teal", css: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "CASH", label: "Efectivo", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "MANUAL", label: "Manual", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
] as const

// Helper para obtener estilos de método de pago
export const getPaymentMethodStyle = (method: string) => {
  const option = paymentMethodOptions.find(opt => opt.value === method)
  return option ? option.css : paymentMethodOptions[0].css
}

// Helper para obtener label de método de pago
export const getPaymentMethodLabel = (method: string) => {
  const option = paymentMethodOptions.find(opt => opt.value === method)
  return option ? option.label : method
}

// ============================================================================
// ESTADO DE PAGO DE INSCRIPCIONES (Registration Payment Status)
// ============================================================================

// Tipo para pagos de inscripción
export interface RegistrationPayment {
  id: string
  amount: number
  paymentStatus: string
  paymentMethod: string
  paidAt: Date | null
}

// Opciones de estado de pago de inscripción (calculado)
export const registrationPaymentStatusOptions = [
  { value: "PAID", label: "Pagado", color: "green", css: "bg-green-100 text-green-800 border-green-200" },
  { value: "PARTIAL", label: "Parcial", color: "purple", css: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "PENDING", label: "Pendiente", color: "orange", css: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "FREE", label: "Sin Costo", color: "teal", css: "bg-teal-100 text-teal-800 border-teal-200" },
] as const

// Helper para calcular el total pagado de una inscripción
export const getTotalPaid = (payments: RegistrationPayment[]): number => {
  if (!payments || payments.length === 0) return 0
  return payments
    .filter(p => p.paymentStatus === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0)
}

// Helper para obtener el estado de pago de una inscripción
export const getRegistrationPaymentStatus = (
  registrationFee: number | null | undefined,
  payments: RegistrationPayment[]
): { status: 'PAID' | 'PARTIAL' | 'PENDING' | 'FREE', label: string, css: string } => {
  const fee = registrationFee ?? 0
  const totalPaid = getTotalPaid(payments)
  const hasPayments = payments && payments.length > 0

  // Si hay pagos registrados, evaluar según el monto
  if (hasPayments && totalPaid > 0) {
    if (totalPaid >= fee && fee > 0) {
      return {
        status: 'PAID',
        label: `$${totalPaid}`,
        css: 'bg-green-100 text-green-800 border-green-200'
      }
    }
    if (fee > 0) {
      return {
        status: 'PARTIAL',
        label: `$${totalPaid} / $${fee}`,
        css: 'bg-purple-100 text-purple-800 border-purple-200'
      }
    }
    // Si hay pagos pero registrationFee es 0, mostrar que se pagó
    return {
      status: 'PAID',
      label: `$${totalPaid}`,
      css: 'bg-green-100 text-green-800 border-green-200'
    }
  }

  // Si no hay pagos y el registrationFee es 0, es sin costo
  if (fee === 0) {
    return {
      status: 'FREE',
      label: 'Sin Costo',
      css: 'bg-teal-100 text-teal-800 border-teal-200'
    }
  }

  // Si no hay pagos y hay registrationFee, está pendiente
  return {
    status: 'PENDING',
    label: `$0 / $${fee}`,
    css: 'bg-orange-100 text-orange-800 border-orange-200'
  }
}

// Helper para obtener solo el label del estado de pago
export const getRegistrationPaymentLabel = (
  registrationFee: number | null | undefined,
  payments: RegistrationPayment[]
): string => {
  return getRegistrationPaymentStatus(registrationFee, payments).label
}

// Helper para obtener solo el CSS del estado de pago
export const getRegistrationPaymentStyle = (
  registrationFee: number | null | undefined,
  payments: RegistrationPayment[]
): string => {
  return getRegistrationPaymentStatus(registrationFee, payments).css
}