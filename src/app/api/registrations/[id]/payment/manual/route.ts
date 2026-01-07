/**
 * POST /api/registrations/[id]/payment/manual
 *
 * Marca una inscripción como pagada manualmente
 * Solo puede ser usado por ADMIN o ORGANIZER
 * Se usa cuando el pago se recibe por efectivo, transferencia bancaria, etc.
 */

import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PaymentLogService } from "@/lib/services/payment-log-service"

const manualPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  paymentMethod: z.enum(["MANUAL", "CASH", "BANK_TRANSFER"]),
  transactionId: z.string().optional(),
  paymentProofUrl: z.string().url().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  notes: z.string().optional().transform(val => val === "" ? undefined : val),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Solo ADMIN y ORGANIZER pueden marcar pagos manualmente
    const session = await authorize(Action.CREATE, Resource.PAYMENT)

    const { id: registrationId } = await params
    const body = await request.json()
    const validatedData = manualPaymentSchema.parse(body)

    // Buscar la inscripción
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        payments: true,
        tournamentCategory: {
          select: {
            registrationFee: true,
          }
        },
        tournament: {
          select: {
            name: true,
            organizerId: true,
            registrationFee: true,
          }
        },
        player: {
          select: {
            firstName: true,
            lastName: true,
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

    // Verificar que el usuario sea ADMIN o el organizador del torneo (ORGANIZER)
    const isOrganizer = registration.tournament.organizerId === session.user.id
    if (session.user.role !== 'ADMIN' && !isOrganizer) {
      return NextResponse.json(
        { error: "No tienes permiso para confirmar pagos de este torneo" },
        { status: 403 }
      )
    }

    // Use tournamentCategory fee if available, otherwise use tournament fee
    const registrationFee = registration.tournamentCategory?.registrationFee ?? registration.tournament.registrationFee ?? 0

    // Calculate current total paid by summing only PAID payments
    const currentPaid = registration.payments
      .filter(p => p.paymentStatus === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Verificar que no esté ya completamente pagada
    if (currentPaid >= registrationFee) {
      return NextResponse.json(
        { error: "Esta inscripción ya está completamente pagada" },
        { status: 400 }
      )
    }

    // Validar que el nuevo pago no exceda el monto pendiente
    const amountDue = registrationFee - currentPaid
    if (validatedData.amount > amountDue) {
      return NextResponse.json(
        { error: `El monto excede lo que falta por pagar ($${amountDue.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Crear nuevo pago (siempre crear, nunca actualizar)
    const payment = await prisma.$transaction(async (tx) => {
      // Crear nuevo pago
      const createdPayment = await tx.registrationPayment.create({
        data: {
          registrationId,
          amount: validatedData.amount,
          paymentStatus: 'PAID',
          paymentMethod: validatedData.paymentMethod,
          transactionId: validatedData.transactionId,
          paymentProofUrl: validatedData.paymentProofUrl,
          confirmedBy: session.user.id,
          confirmedAt: new Date(),
          paidAt: new Date(),
          metadata: validatedData.notes ? { notes: validatedData.notes } : undefined,
        }
      })

      // Calcular nuevo total pagado
      const newTotalPaid = currentPaid + validatedData.amount

      // Solo actualizar estado de la inscripción a PAID si el monto total cubre la tarifa
      if (newTotalPaid >= registrationFee) {
        await tx.registration.update({
          where: { id: registrationId },
          data: { registrationStatus: 'PAID' }
        })
      }

      return createdPayment
    })

    // Log de auditoría
    await PaymentLogService.logPaymentConfirmedManually(
      { userId: session.user.id, paymentId: payment.id },
      payment
    )

    console.log('✅ Pago manual confirmado:', {
      registrationId,
      paymentId: payment.id,
      amount: validatedData.amount,
      method: validatedData.paymentMethod,
      confirmedBy: session.user.id,
    })

    return NextResponse.json(payment, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error confirmando pago manual:', error)
    return handleAuthError(error)
  }
}
