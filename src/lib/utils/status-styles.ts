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