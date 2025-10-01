import { z } from "zod"

// Schema para crear un equipo
export const createTeamSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  registration1Id: z.string().min(1, "La inscripción del jugador 1 es requerida"),
  registration2Id: z.string().min(1, "La inscripción del jugador 2 es requerida"),
  name: z.string().max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  seed: z.number().int().positive("El seed debe ser un número positivo").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
}).refine((data) => {
  return data.registration1Id !== data.registration2Id
}, {
  message: "Las inscripciones deben ser de jugadores diferentes",
  path: ["registration2Id"]
})

// Schema para actualizar un equipo
export const updateTeamSchema = z.object({
  name: z.string().max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  seed: z.number().int().positive("El seed debe ser un número positivo").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  status: z.enum([
    "DRAFT",
    "CONFIRMED",
    "CANCELLED"
  ]).optional(),
})

// Schema para cambiar el estado de un equipo
export const updateTeamStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "CONFIRMED",
    "CANCELLED"
  ]),
  notes: z.string().optional(),
})

// Schema para obtener equipos (query params)
export const getTeamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum([
    "all",
    "DRAFT",
    "CONFIRMED",
    "CANCELLED"
  ]).optional(),
  search: z.string().optional(),
  tournamentId: z.string().optional(),
  categoryId: z.string().optional(),
  playerId: z.string().optional(), // Para buscar equipos de un jugador específico
})

// Schema para obtener jugadores elegibles para formar equipo
export const getEligiblePlayersSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
})

// Tipos TypeScript derivados de los schemas
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type UpdateTeamStatusInput = z.infer<typeof updateTeamStatusSchema>
export type GetTeamsInput = z.infer<typeof getTeamsSchema>
export type GetEligiblePlayersInput = z.infer<typeof getEligiblePlayersSchema>

// Opciones para selects de estado
export const teamStatusOptions = [
  { value: "DRAFT", label: "Borrador", color: "gray" },
  { value: "CONFIRMED", label: "Confirmado", color: "green" },
  { value: "CANCELLED", label: "Cancelado", color: "red" },
] as const
