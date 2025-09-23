import { z } from "zod"

export const clubFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().optional(),
  address: z.string().min(1, "La dirección es requerida").max(200, "La dirección no puede tener más de 200 caracteres"),
  city: z.string().min(1, "La ciudad es requerida").max(100, "La ciudad no puede tener más de 100 caracteres"),
  state: z.string().max(100, "El estado no puede tener más de 100 caracteres").optional(),
  country: z.string().min(1, "El país es requerido").max(100, "El país no puede tener más de 100 caracteres"),
  postalCode: z.string().max(20, "El código postal no puede tener más de 20 caracteres").optional(),
  phone: z.string().max(20, "El teléfono no puede tener más de 20 caracteres").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  latitude: z.union([
    z.string().transform((val) => val === "" ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (val >= -90 && val <= 90), "Latitud inválida"),
  longitude: z.union([
    z.string().transform((val) => val === "" ? undefined : parseFloat(val)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (val >= -180 && val <= 180), "Longitud inválida"),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("ACTIVE"),
  logoUrl: z.string().url("URL del logo inválida").optional().or(z.literal(""))
})

export type ClubFormData = z.infer<typeof clubFormSchema>

// Schema para edición (sin campo status)
export const clubEditSchema = clubFormSchema.omit({ status: true })
export type ClubEditData = z.infer<typeof clubEditSchema>

export const clubFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

export type ClubFilters = z.infer<typeof clubFilterSchema>

// Opciones para los selects del formulario
export const clubStatusOptions = [
  { value: "ACTIVE", label: "Activo", color: "green" },
  { value: "INACTIVE", label: "Inactivo", color: "red" },
  { value: "MAINTENANCE", label: "Mantenimiento", color: "yellow" },
] as const

export const countryOptions = [
  { value: "Argentina", label: "Argentina" },
  { value: "España", label: "España" },
  { value: "México", label: "México" },
  { value: "Chile", label: "Chile" },
  { value: "Colombia", label: "Colombia" },
  { value: "Perú", label: "Perú" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Paraguay", label: "Paraguay" },
  { value: "Bolivia", label: "Bolivia" },
  { value: "Ecuador", label: "Ecuador" },
  { value: "Venezuela", label: "Venezuela" },
  { value: "Brasil", label: "Brasil" },
  { value: "Otro", label: "Otro" },
] as const