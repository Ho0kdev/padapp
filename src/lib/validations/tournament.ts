import { z } from "zod"

export const tournamentFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO",
    "AMERICANO_SOCIAL"
  ], {
    message: "El tipo de torneo es requerido"
  }),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).default("PUBLIC"),
  registrationStart: z.date({
    message: "La fecha de inicio de inscripciones es requerida"
  }),
  registrationEnd: z.date({
    message: "La fecha de fin de inscripciones es requerida"
  }),
  tournamentStart: z.date({
    message: "La fecha de inicio del torneo es requerida"
  }),
  tournamentEnd: z.date().optional(),
  maxParticipants: z.number().int().positive("Debe ser un número positivo").optional(),
  minParticipants: z.number().int().positive("Debe ser un número positivo").min(2, "Mínimo 2 participantes"),
  registrationFee: z.number().min(0, "La tarifa no puede ser negativa").default(0),
  prizePool: z.number().min(0, "El premio no puede ser negativo").default(0),
  rankingPoints: z.number().int().positive("Debe ser un número positivo").min(100, "Mínimo 100 puntos").max(5000, "Máximo 5000 puntos").default(1000),
  setsToWin: z.number().int().positive("Debe ser un número positivo").default(2),
  gamesToWinSet: z.number().int().positive("Debe ser un número positivo").default(6),
  tiebreakAt: z.number().int().positive("Debe ser un número positivo").default(6),
  goldenPoint: z.boolean().default(true),
  mainClubId: z.string().optional(),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
  categories: z.array(z.object({
    categoryId: z.string(),
    maxTeams: z.number().int().positive().optional(),
    registrationFee: z.number().min(0).optional(),
    prizePool: z.number().min(0).optional(),
  })).optional(),
  clubs: z.array(z.string()).optional(),
}).refine((data) => {
  return data.registrationEnd > data.registrationStart
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["registrationEnd"]
}).refine((data) => {
  return data.tournamentStart > data.registrationEnd
}, {
  message: "La fecha de inicio del torneo debe ser posterior al fin de inscripciones",
  path: ["tournamentStart"]
}).refine((data) => {
  if (data.tournamentEnd) {
    return data.tournamentEnd >= data.tournamentStart
  }
  return true
}, {
  message: "La fecha de fin del torneo debe ser igual o posterior al inicio",
  path: ["tournamentEnd"]
}).refine((data) => {
  if (data.maxParticipants) {
    return data.maxParticipants >= data.minParticipants
  }
  return true
}, {
  message: "El máximo de participantes debe ser mayor o igual al mínimo",
  path: ["maxParticipants"]
})

export type TournamentFormData = z.infer<typeof tournamentFormSchema>

export const tournamentFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]).optional(),
  search: z.string().optional(),
  organizerId: z.string().optional(),
  clubId: z.string().optional(),
})

export type TournamentFilters = z.infer<typeof tournamentFilterSchema>

//TODO: mp23530 se inhabilitan los tipos de torneo no probados
// Opciones para los selects del formulario
export const tournamentTypeOptions = [
  // { value: "SINGLE_ELIMINATION", label: "Eliminación Simple" },
  // { value: "DOUBLE_ELIMINATION", label: "Eliminación Doble" },
  // { value: "ROUND_ROBIN", label: "Todos contra Todos" },
  // { value: "SWISS", label: "Sistema Suizo" },
  { value: "GROUP_STAGE_ELIMINATION", label: "Grupos + Eliminatoria" },
  // { value: "AMERICANO", label: "Americano (Parejas Fijas)" },
  { value: "AMERICANO_SOCIAL", label: "Americano Social (Pools con Rotación)" },
] as const

export const tournamentStatusOptions = [
  { value: "DRAFT", label: "Borrador", color: "gray" },
  { value: "PUBLISHED", label: "Publicado", color: "blue" },
  { value: "REGISTRATION_OPEN", label: "Inscripciones Abiertas", color: "green" },
  { value: "REGISTRATION_CLOSED", label: "Inscripciones Cerradas", color: "yellow" },
  { value: "IN_PROGRESS", label: "En Progreso", color: "orange" },
  { value: "COMPLETED", label: "Completado", color: "purple" },
  { value: "CANCELLED", label: "Cancelado", color: "red" },
] as const

export const tournamentVisibilityOptions = [
  { value: "PUBLIC", label: "Público" },
  { value: "PRIVATE", label: "Privado" },
  { value: "CLUB_MEMBERS", label: "Solo Miembros del Club" },
] as const

export const tournamentStatusOptionsForForm = [
  { value: "DRAFT", label: "Borrador" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "REGISTRATION_OPEN", label: "Inscripciones Abiertas" },
  { value: "REGISTRATION_CLOSED", label: "Inscripciones Cerradas" },
] as const