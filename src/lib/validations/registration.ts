import { z } from "zod"

export const registrationFormSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  player1Id: z.string().min(1, "El jugador 1 es requerido"),
  player2Id: z.string().min(1, "El jugador 2 es requerido"),
  teamName: z.string().min(1, "El nombre del equipo es requerido").max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  // Datos de contacto para inscripciones públicas
  contactEmail: z.string().email("Email inválido").optional(),
  contactPhone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos").optional(),
  // Términos y condiciones
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debe aceptar los términos y condiciones"
  }),
  acceptPrivacyPolicy: z.boolean().refine(val => val === true, {
    message: "Debe aceptar la política de privacidad"
  }),
}).refine((data) => {
  return data.player1Id !== data.player2Id
}, {
  message: "Los jugadores deben ser diferentes",
  path: ["player2Id"]
})

export type RegistrationFormData = z.infer<typeof registrationFormSchema>

export const registrationFilterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(),
  search: z.string().optional(),
  tournamentId: z.string().optional(),
  categoryId: z.string().optional(),
  playerId: z.string().optional(),
})

export type RegistrationFilters = z.infer<typeof registrationFilterSchema>

// Esquema para el pago de inscripción
export const paymentSchema = z.object({
  registrationId: z.string().min(1, "ID de inscripción requerido"),
  amount: z.number().positive("El monto debe ser positivo"),
  paymentMethod: z.enum(["STRIPE", "CASH", "TRANSFER", "OTHER"]).default("STRIPE"),
  transactionId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

export type PaymentData = z.infer<typeof paymentSchema>

// Esquema para validación de elegibilidad
export const eligibilityCheckSchema = z.object({
  tournamentId: z.string().min(1, "ID del torneo requerido"),
  categoryId: z.string().min(1, "ID de categoría requerido"),
  player1Id: z.string().min(1, "ID del jugador 1 requerido"),
  player2Id: z.string().min(1, "ID del jugador 2 requerido"),
})

export type EligibilityCheckData = z.infer<typeof eligibilityCheckSchema>

// Opciones para los selects del formulario - importar desde status-styles.ts para mantener consistencia

export const paymentMethodOptions = [
  { value: "STRIPE", label: "Tarjeta de Crédito/Débito" },
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia Bancaria" },
  { value: "OTHER", label: "Otro" },
] as const

export const paymentStatusOptions = [
  { value: "PENDING", label: "Pendiente", color: "yellow" },
  { value: "PAID", label: "Pagado", color: "green" },
  { value: "FAILED", label: "Falló", color: "red" },
  { value: "REFUNDED", label: "Reembolsado", color: "gray" },
] as const