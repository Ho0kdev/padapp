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