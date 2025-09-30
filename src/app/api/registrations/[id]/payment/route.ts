import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  paymentMethod: z.enum(["STRIPE", "CASH", "TRANSFER", "OTHER"]).default("STRIPE"),
  transactionId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Verificar que la inscripción existe
    const registration = await prisma.team.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            organizerId: true,
            status: true,
          }
        },
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        },
        payments: {
          where: {
            paymentStatus: 'PAID'
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

    // Verificar permisos contextuales para pagos
    await authorize(Action.CREATE, Resource.PAYMENT, registration)

    // Verificar que no esté ya pagado
    const totalPaid = registration.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const registrationFee = registration.tournamentCategory?.registrationFee || 0

    if (totalPaid >= registrationFee) {
      return NextResponse.json(
        { error: "Esta inscripción ya está completamente pagada" },
        { status: 400 }
      )
    }

    // Verificar que el monto no exceda lo que falta por pagar
    const remainingAmount = registrationFee - totalPaid
    if (validatedData.amount > remainingAmount) {
      return NextResponse.json(
        { error: `El monto excede lo que falta por pagar (${remainingAmount})` },
        { status: 400 }
      )
    }

    // TODO: Aquí se integrará con Stripe para pagos reales
    // Por ahora creamos el registro de pago

    const payment = await prisma.teamPayment.create({
      data: {
        teamId: params.id,
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        transactionId: validatedData.transactionId,
        paymentStatus: validatedData.paymentMethod === 'STRIPE' ? 'PENDING' : 'PAID',
        paidAt: validatedData.paymentMethod !== 'STRIPE' ? new Date() : null,
      }
    })

    // Si el pago está completado y cubre toda la tarifa, actualizar el estado de la inscripción
    if (payment.paymentStatus === 'PAID') {
      const newTotalPaid = totalPaid + validatedData.amount
      if (newTotalPaid >= registrationFee) {
        await prisma.team.update({
          where: { id: params.id },
          data: {
            registrationStatus: 'PAID'
          }
        })

        // TODO: Mover equipos de lista de espera si hay cupo
        // TODO: Enviar notificación de confirmación
      }
    }

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.PAYMENT,
      resourceId: payment.id,
      description: `Pago creado para inscripción ${params.id}: ${validatedData.amount}`,
      newData: payment,
    }, request)

    return NextResponse.json(payment, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth()
    const { id } = await params

    // Verificar que la inscripción existe
    const registration = await prisma.team.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      )
    }

    // Verificar permisos contextuales
    await authorize(Action.READ, Resource.PAYMENT, registration)

    // Obtener todos los pagos de la inscripción
    const payments = await prisma.teamPayment.findMany({
      where: { teamId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(payments)

  } catch (error) {
    return handleAuthError(error)
  }
}