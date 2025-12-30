// src/lib/validations/password-reset.ts
import { z } from 'zod'

/**
 * Schema para solicitar recuperación de contraseña
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Formato de email inválido')
    .toLowerCase()
    .trim(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/**
 * Schema para restablecer contraseña con token
 */
export const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'El token es requerido' })
      .min(64, 'Token inválido')
      .max(64, 'Token inválido'),
    password: z
      .string({ required_error: 'La contraseña es requerida' })
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .max(100, 'La contraseña debe tener máximo 100 caracteres'),
    confirmPassword: z
      .string({ required_error: 'La confirmación de contraseña es requerida' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Schema para verificar validez del token
 */
export const verifyTokenSchema = z.object({
  token: z
    .string({ required_error: 'El token es requerido' })
    .min(64, 'Token inválido')
    .max(64, 'Token inválido'),
})

export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>
