import { z } from "zod"

export const courtFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  surface: z.enum(["CONCRETE", "ARTIFICIAL_GRASS", "CERAMIC", "OTHER"], {
    message: "La superficie es requerida"
  }),
  hasLighting: z.boolean().default(false),
  hasRoof: z.boolean().default(false),
  isOutdoor: z.boolean().default(false),
  hasPanoramicGlass: z.boolean().default(false),
  hasConcreteWall: z.boolean().default(false),
  hasNet4m: z.boolean().default(false),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RESERVED", "UNAVAILABLE"]).default("AVAILABLE"),
  hourlyRate: z.union([
    z.string().transform((val) => val === "" ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || val >= 0, "El precio por hora debe ser mayor o igual a 0"),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  clubId: z.string().min(1, "El ID del club es requerido")
})

export type CourtFormData = z.infer<typeof courtFormSchema>

// Schema para edición (sin clubId ya que no se puede cambiar)
export const courtEditSchema = courtFormSchema.omit({ clubId: true })
export type CourtEditData = z.infer<typeof courtEditSchema>

// Schema para cambios de estado solamente
export const courtStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RESERVED", "UNAVAILABLE"])
})
export type CourtStatusData = z.infer<typeof courtStatusSchema>

export const courtFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RESERVED", "UNAVAILABLE"]).optional(),
  surface: z.enum(["CONCRETE", "ARTIFICIAL_GRASS", "CERAMIC", "OTHER"]).optional(),
  search: z.string().optional(),
  hasLighting: z.boolean().optional(),
  hasRoof: z.boolean().optional(),
})

export type CourtFilters = z.infer<typeof courtFilterSchema>

// Opciones para los selects del formulario
export const courtSurfaceOptions = [
  { value: "CONCRETE", label: "Concreto", color: "gray" },
  { value: "ARTIFICIAL_GRASS", label: "Césped Artificial", color: "green" },
  { value: "CERAMIC", label: "Cerámica", color: "orange" },
  { value: "OTHER", label: "Otra", color: "blue" },
] as const

export const courtStatusOptions = [
  { value: "AVAILABLE", label: "Disponible", color: "green" },
  { value: "MAINTENANCE", label: "Mantenimiento", color: "yellow" },
  { value: "RESERVED", label: "Reservada", color: "blue" },
  { value: "UNAVAILABLE", label: "No Disponible", color: "red" },
] as const