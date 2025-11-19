import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  paymentMethod: z.enum([
    "MERCADOPAGO_CARD",
    "MERCADOPAGO_WALLET",
    "BANK_TRANSFER",
    "MANUAL",
    "CASH"
  ]),
  transactionId: z.string().optional(),
  paymentProofUrl: z.string().url().optional(), // Para transferencias bancarias
  metadata: z.record(z.string(), z.any()).optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/registrations/[id]/payment
 *
 * Crea un pago para una inscripción.
 * Maneja dos casos:
 * 1. Torneos Convencionales: ID de Team (actualiza payment en ambas registrations)
 * 2. Torneos Americano Social: ID de Registration (actualiza solo esa registration)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Determinar si es Team o Registration
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            organizerId: true,
            status: true,
            type: true,
          }
        },
        registration1: {
          select: {
            id: true,
            payments: {
              where: {
                paymentStatus: 'PAID'
              }
            }
          }
        },
        registration2: {
          select: {
            id: true,
          }
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        }
      }
    })

    if (team) {
      // Caso 1: Torneo Convencional (Team)
      return await handleTeamPayment(id, team, validatedData, session, request)
    } else {
      // Caso 2: Torneo Americano Social (Registration individual)
      const registration = await prisma.registration.findUnique({
        where: { id },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              organizerId: true,
              status: true,
              type: true,
            }
          },
          payments: {
            where: {
              paymentStatus: 'PAID'
            }
          },
          tournamentCategory: {
            select: {
              registrationFee: true,
            }
          }
        }
      })

      if (!registration) {
        return NextResponse.json(
          { error: "Inscripción no encontrada" },
          { status: 404 }
        )
      }

      return await handleIndividualRegistrationPayment(id, registration, validatedData, session, request)
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}

/**
 * GET /api/registrations/[id]/payment
 *
 * Obtiene el historial de pagos de una inscripción.
 * Funciona tanto para Teams como para Registrations individuales.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    // Intentar buscar como Team primero
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        registration1: {
          select: {
            payments: true
          }
        }
      }
    })

    if (team) {
      // Verificar permisos
      await authorize(Action.READ, Resource.PAYMENT, team)

      // Retornar payments de registration1 (ambas registrations tienen el mismo payment)
      return NextResponse.json(team.registration1.payments || [])
    }

    // Si no es Team, buscar como Registration
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        payments: true
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.READ, Resource.PAYMENT, registration)

    return NextResponse.json(registration.payments || [])

  } catch (error) {
    return handleAuthError(error)
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Procesa el pago para un Team (torneo convencional)
 * Crea/actualiza el payment en ambas registrations
 */
async function handleTeamPayment(
  teamId: string,
  team: any,
  validatedData: z.infer<typeof createPaymentSchema>,
  session: any,
  request: NextRequest
) {
  // Verificar permisos
  await authorize(Action.CREATE, Resource.PAYMENT, team)

  const registrationFee = team.tournamentCategory?.registrationFee || 0

  // Calcular total pagado (basado en registration1, que es igual a registration2)
  const totalPaid = team.registration1.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0

  // Validar que no esté ya pagado
  if (totalPaid >= registrationFee) {
    return NextResponse.json(
      { error: "Esta inscripción ya está completamente pagada" },
      { status: 400 }
    )
  }

  // Validar que el monto no exceda lo que falta
  const remainingAmount = registrationFee - totalPaid
  if (validatedData.amount > remainingAmount) {
    return NextResponse.json(
      { error: `El monto excede lo que falta por pagar (${remainingAmount})` },
      { status: 400 }
    )
  }

  // Determinar estado del pago según método
  // MERCADOPAGO_* siempre inicia como PENDING (se actualiza vía webhook)
  // MANUAL, CASH, BANK_TRANSFER son PAID inmediatamente
  const isAutomaticPayment = validatedData.paymentMethod === 'MERCADOPAGO_CARD' ||
                             validatedData.paymentMethod === 'MERCADOPAGO_WALLET'
  const paymentStatus: 'PENDING' | 'PAID' = isAutomaticPayment ? 'PENDING' : 'PAID'
  const paidAt = !isAutomaticPayment ? new Date() : null

  // Crear payment para ambas registrations en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear payment para registration1
    const payment1 = await tx.registrationPayment.create({
      data: {
        registrationId: team.registration1.id,
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        transactionId: validatedData.transactionId,
        paymentStatus,
        paidAt,
      }
    })

    // Crear payment para registration2 (mismo monto y datos)
    await tx.registrationPayment.create({
      data: {
        registrationId: team.registration2.id,
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        transactionId: validatedData.transactionId,
        paymentStatus,
        paidAt,
      }
    })

    // Si el pago está completado y cubre toda la tarifa, actualizar estado de ambas registrations
    if (paymentStatus === 'PAID') {
      const newTotalPaid = totalPaid + validatedData.amount
      if (newTotalPaid >= registrationFee) {
        await tx.registration.update({
          where: { id: team.registration1.id },
          data: { registrationStatus: 'PAID' }
        })
        await tx.registration.update({
          where: { id: team.registration2.id },
          data: { registrationStatus: 'PAID' }
        })
      }
    }

    return payment1
  })

  // Auditoría
  await AuditLogger.log(session, {
    action: Action.CREATE,
    resource: Resource.PAYMENT,
    resourceId: result.id,
    description: `Pago creado para equipo ${teamId}: ${validatedData.amount}`,
    newData: result,
  }, request)

  return NextResponse.json(result, { status: 201 })
}

/**
 * Procesa el pago para una Registration individual (americano social)
 */
async function handleIndividualRegistrationPayment(
  registrationId: string,
  registration: any,
  validatedData: z.infer<typeof createPaymentSchema>,
  session: any,
  request: NextRequest
) {
  // Verificar permisos
  await authorize(Action.CREATE, Resource.PAYMENT, registration)

  const registrationFee = registration.tournamentCategory?.registrationFee || 0
  const totalPaid = registration.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0

  // Validar que no esté ya pagado
  if (registration.payments && registration.payments.length > 0 && totalPaid >= registrationFee) {
    return NextResponse.json(
      { error: "Esta inscripción ya está completamente pagada" },
      { status: 400 }
    )
  }

  // Validar que el monto no exceda lo que falta
  const remainingAmount = registrationFee - totalPaid
  if (validatedData.amount > remainingAmount) {
    return NextResponse.json(
      { error: `El monto excede lo que falta por pagar (${remainingAmount})` },
      { status: 400 }
    )
  }

  // Determinar estado del pago según método
  // MERCADOPAGO_* siempre inicia como PENDING (se actualiza vía webhook)
  // MANUAL, CASH, BANK_TRANSFER son PAID inmediatamente
  const isAutomaticPayment = validatedData.paymentMethod === 'MERCADOPAGO_CARD' ||
                             validatedData.paymentMethod === 'MERCADOPAGO_WALLET'
  const paymentStatus: 'PENDING' | 'PAID' = isAutomaticPayment ? 'PENDING' : 'PAID'
  const paidAt = !isAutomaticPayment ? new Date() : null

  // Crear payment (siempre crear uno nuevo, ya que es un array de pagos)
  const payment = await prisma.$transaction(async (tx) => {
    const paymentData = {
      registrationId,
      amount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod,
      transactionId: validatedData.transactionId,
      paymentStatus,
      paidAt,
    }

    // Crear nuevo payment
    const createdPayment = await tx.registrationPayment.create({
      data: paymentData
    })

    // Si el pago está completado y cubre toda la tarifa, actualizar estado
    if (paymentStatus === 'PAID') {
      const newTotalPaid = totalPaid + validatedData.amount
      if (newTotalPaid >= registrationFee) {
        await tx.registration.update({
          where: { id: registrationId },
          data: { registrationStatus: 'PAID' }
        })
      }
    }

    return createdPayment
  })

  // Auditoría
  await AuditLogger.log(session, {
    action: Action.CREATE,
    resource: Resource.PAYMENT,
    resourceId: payment.id,
    description: `Pago creado para inscripción individual ${registrationId}: ${validatedData.amount}`,
    newData: payment,
  }, request)

  return NextResponse.json(payment, { status: 201 })
}
