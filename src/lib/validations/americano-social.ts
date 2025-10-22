import { z } from "zod"

// Schema para generar pools
export const generatePoolsSchema = z.object({
  categoryId: z.string().min(1, "La categoría es requerida"),
  force: z.boolean().optional() // Permite regenerar eliminando pools existentes
})

export type GeneratePoolsData = z.infer<typeof generatePoolsSchema>

// Schema para resultado de match
export const matchResultSchema = z.object({
  teamAScore: z.number().min(0, "El score debe ser mayor o igual a 0").max(50, "El score no puede ser mayor a 50"),
  teamBScore: z.number().min(0, "El score debe ser mayor o igual a 0").max(50, "El score no puede ser mayor a 50"),
  sets: z.array(
    z.object({
      teamAScore: z.number().min(0).max(7, "El score de un set no puede ser mayor a 7"),
      teamBScore: z.number().min(0).max(7, "El score de un set no puede ser mayor a 7")
    })
  ).min(1, "Debe haber al menos un set").max(5, "No puede haber más de 5 sets")
})

export type MatchResultData = z.infer<typeof matchResultSchema>

// Schema para query de pools
export const poolsQuerySchema = z.object({
  categoryId: z.string().optional()
})

export type PoolsQueryData = z.infer<typeof poolsQuerySchema>
