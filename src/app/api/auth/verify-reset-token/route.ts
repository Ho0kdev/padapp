// src/app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenSchema } from '@/lib/validations/password-reset'
import { PasswordResetService } from '@/lib/services/password-reset-service'

/**
 * POST /api/auth/verify-reset-token
 * Verifica la validez de un token de recuperación de contraseña
 * Endpoint PÚBLICO (no requiere autenticación)
 *
 * Se usa en el frontend para validar el token antes de mostrar el formulario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyTokenSchema.parse(body)

    const validation = await PasswordResetService.validateResetToken(
      validatedData.token
    )

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: true, message: 'Token válido' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error en verify-reset-token:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { valid: false, error: 'Token inválido' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: false, error: 'Error al verificar el token' },
      { status: 500 }
    )
  }
}
