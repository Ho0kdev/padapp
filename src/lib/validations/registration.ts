import { z } from "zod"

// Schema para crear una inscripción individual (API)
export const createRegistrationSchema = z.object({
  tournamentId: z.string().min(1, "El torneo es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  playerId: z.string().min(1, "El jugador es requerido"),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  registrationStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(), // Solo ADMINs pueden establecer el estado inicial
})

// Schema para formulario de inscripción (Frontend)
export const registrationFormSchema = z.object({
  tournamentId: z.string().min(1, "Debe seleccionar un torneo"),
  categoryId: z.string().min(1, "Debe seleccionar una categoría"),
  playerId: z.string().min(1, "Debe seleccionar un jugador"),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  acceptTerms: z.boolean().refine(val => val === true, "Debe aceptar los términos y condiciones"),
  registrationStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(), // Solo para ADMINs
})

// Alias para retrocompatibilidad (deprecado)
export const individualRegistrationSchema = registrationFormSchema

// Schema para actualizar una inscripción
export const updateRegistrationSchema = z.object({
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  registrationStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]).optional(),
})

// Schema para cambiar el estado de una inscripción
export const updateRegistrationStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]),
  notes: z.string().optional(),
})

// Schema para obtener inscripciones (query params)
export const getRegistrationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum([
    "all",
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

// Schema para crear un pago de inscripción
export const createRegistrationPaymentSchema = z.object({
  amount: z.number().min(0, "El monto no puede ser negativo"),
  paymentMethod: z.string().min(1, "El método de pago es requerido").max(50),
  transactionId: z.string().max(100).optional(),
})

// Schema para actualizar un pago de inscripción
export const updateRegistrationPaymentSchema = z.object({
  paymentStatus: z.enum([
    "PENDING",
    "PAID",
    "FAILED",
    "REFUNDED"
  ]),
  transactionId: z.string().max(100).optional(),
  paidAt: z.date().optional(),
})

// Tipos TypeScript derivados de los schemas
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>
export type RegistrationFormData = z.infer<typeof registrationFormSchema>
export type IndividualRegistrationData = RegistrationFormData // Alias para retrocompatibilidad
export type UpdateRegistrationInput = z.infer<typeof updateRegistrationSchema>
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>
export type GetRegistrationsInput = z.infer<typeof getRegistrationsSchema>
export type CreateRegistrationPaymentInput = z.infer<typeof createRegistrationPaymentSchema>
export type UpdateRegistrationPaymentInput = z.infer<typeof updateRegistrationPaymentSchema>

// Opciones para selects de estado
export const registrationStatusOptions = [
  { value: "PENDING", label: "Pendiente" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "PAID", label: "Pagada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "WAITLIST", label: "Lista de Espera" },
] as const

// Opciones para métodos de pago
export const paymentMethodOptions = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CREDIT_CARD", label: "Tarjeta de Crédito" },
  { value: "DEBIT_CARD", label: "Tarjeta de Débito" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "OTHER", label: "Otro" },
] as const

// Opciones para estado de pago
export const paymentStatusOptions = [
  { value: "PENDING", label: "Pendiente", color: "yellow" },
  { value: "PAID", label: "Pagado", color: "green" },
  { value: "FAILED", label: "Falló", color: "red" },
  { value: "REFUNDED", label: "Reembolsado", color: "gray" },
] as const
