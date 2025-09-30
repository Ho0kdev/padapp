// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { rateLimit, RateLimitPresets } from "@/lib/rbac/rate-limit"

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting estricto: 5 intentos por minuto
    const rateLimitResponse = await rateLimit(request, {
      ...RateLimitPresets.STRICT,
      message: 'Demasiados intentos de registro. Por favor intenta de nuevo más tarde.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { email, password, firstName, lastName, phone } = registerSchema.parse(body)

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario y jugador en una transacción
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
          role: "PLAYER",
          status: "ACTIVE",
        }
      })

      await tx.player.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          phone,
          rankingPoints: 0,
        }
      })

      return newUser
    })

    // No devolver la contraseña
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { 
        message: "Usuario creado exitosamente",
        user: userWithoutPassword 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Error en registro:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
