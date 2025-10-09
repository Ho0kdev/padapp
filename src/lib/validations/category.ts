import { z } from "zod"

export const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().max(500, "La descripción no puede tener más de 500 caracteres").optional(),
  type: z.enum([
    "AGE",
    "SKILL",
    "RANKING",
    "GENDER",
    "MIXED"
  ], {
    message: "El tipo de categoría es requerido"
  }),
  level: z.union([
    z.string().transform((val) => val === "" ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (val >= 1 && val <= 20), "El nivel debe estar entre 1 y 20").optional(),
  minAge: z.union([
    z.string().transform((val) => val === "" ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (val >= 0 && val <= 100), "La edad mínima debe estar entre 0 y 100"),
  maxAge: z.union([
    z.string().transform((val) => val === "" ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (val >= 0 && val <= 100), "La edad máxima debe estar entre 0 y 100"),
  genderRestriction: z.union([
    z.string().transform((val) => val === "NONE" ? undefined : val),
    z.enum(["MALE", "FEMALE", "MIXED"]),
    z.undefined()
  ]).optional(),
  minRankingPoints: z.union([
    z.string().transform((val) => val === "" ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || val >= 0, "Los puntos mínimos deben ser mayor o igual a 0"),
  maxRankingPoints: z.union([
    z.string().transform((val) => val === "" ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || val >= 0, "Los puntos máximos deben ser mayor o igual a 0"),
  isActive: z.boolean().default(true)
}).refine((data) => {
  if (data.minAge !== undefined && data.maxAge !== undefined) {
    return data.maxAge >= data.minAge
  }
  return true
}, {
  message: "La edad máxima debe ser mayor o igual a la mínima",
  path: ["maxAge"]
}).refine((data) => {
  if (data.minRankingPoints !== undefined && data.maxRankingPoints !== undefined) {
    return data.maxRankingPoints >= data.minRankingPoints
  }
  return true
}, {
  message: "Los puntos máximos deben ser mayor o igual a los mínimos",
  path: ["maxRankingPoints"]
})

export type CategoryFormData = z.infer<typeof categoryFormSchema>

// Schema para edición (mismos campos)
export const categoryEditSchema = categoryFormSchema
export type CategoryEditData = z.infer<typeof categoryEditSchema>

export const categoryFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  type: z.enum(["AGE", "SKILL", "RANKING", "GENDER", "MIXED"]).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
})

export type CategoryFilters = z.infer<typeof categoryFilterSchema>

// Opciones para los selects del formulario
export const categoryTypeOptions = [
  { value: "AGE", label: "Por Edad", color: "blue" },
  { value: "SKILL", label: "Por Habilidad", color: "green" },
  { value: "RANKING", label: "Por Ranking", color: "purple" },
  { value: "GENDER", label: "Por Género", color: "pink" },
  { value: "MIXED", label: "Mixta", color: "orange" },
] as const

export const genderOptions = [
  { value: "MALE", label: "Masculino", color: "blue" },
  { value: "FEMALE", label: "Femenino", color: "pink" },
  { value: "MIXED", label: "Mixto", color: "purple" },
] as const

export const categoryStatusOptions = [
  { value: true, label: "Activa", color: "green" },
  { value: false, label: "Inactiva", color: "red" },
] as const