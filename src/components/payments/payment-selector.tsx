"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CreditCard, Wallet, DollarSign, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ManualPaymentDialog } from "./manual-payment-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PaymentSelectorProps {
  registrationId: string
  amount: number
  amountPaid?: number
  tournamentName: string
  categoryName: string
  currentStatus?: string
  onPaymentComplete?: () => void
}

export function PaymentSelector({
  registrationId,
  amount,
  amountPaid = 0,
  tournamentName,
  categoryName,
  currentStatus,
  onPaymentComplete,
}: PaymentSelectorProps) {
  const { isAdminOrClubAdmin } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false)

  // Check if MercadoPago is enabled via environment variable
  const isMercadoPagoEnabled = process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true'

  // Check if payment is complete based on amount, not just status
  const isPaid = amountPaid >= amount
  const isPending = currentStatus === 'PENDING' && amountPaid < amount
  const isPartial = amountPaid > 0 && amountPaid < amount

  const handleMercadoPagoPayment = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/registrations/${registrationId}/payment/mercadopago`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear preferencia de pago')
      }

      const data = await response.json()

      // Redirigir al link de pago de Mercado Pago
      window.location.href = data.paymentUrl

    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  const handleManualPaymentSuccess = () => {
    setManualPaymentOpen(false)
    toast.success('Pago registrado exitosamente')
    if (onPaymentComplete) {
      onPaymentComplete()
    } else {
      router.refresh()
    }
  }

  const handleCancelPendingPayment = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/registrations/${registrationId}/payment/cancel-pending`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cancelar el pago pendiente')
      }

      toast.success('Pago pendiente cancelado. Puedes intentar nuevamente.')

      // Forzar recarga completa de la página para asegurar datos frescos
      if (onPaymentComplete) {
        onPaymentComplete()
      }

      // Esperar un momento y luego hacer hard refresh
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cancelar el pago')
    } finally {
      setLoading(false)
    }
  }

  if (isPaid) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-700">Pago Completado</CardTitle>
          <CardDescription>
            Esta inscripción ya ha sido pagada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">${amountPaid.toFixed(2)} de ${amount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isPending) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-700">Pago Pendiente</CardTitle>
          <CardDescription>
            El pago está siendo procesado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Esperando confirmación del pago...</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelPendingPayment}
                disabled={loading}
                className="mt-2"
              >
                Cancelar e intentar de nuevo
              </Button>
              {isAdminOrClubAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualPaymentOpen(true)}
                  className="mt-2"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Confirmar pago manualmente
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const amountDue = amount - amountPaid

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Realizar Pago</CardTitle>
          <CardDescription>
            Monto a pagar: <span className="font-semibold">${amountDue.toFixed(2)}</span>
            {amountPaid > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                (pagado: ${amountPaid.toFixed(2)} de ${amount.toFixed(2)})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Botones en desktop: lado a lado, mobile: apilados */}
          <div className="flex flex-col md:flex-row gap-3 max-w-2xl">
            {/* Opción: Mercado Pago - Solo si está habilitado */}
            {isMercadoPagoEnabled && (
              <div className="flex-1 space-y-1.5">
                <Button
                  onClick={handleMercadoPagoPayment}
                  disabled={loading}
                  className="w-full"
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      Mercado Pago
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tarjeta de crédito/débito o wallet
                </p>
              </div>
            )}

            {/* Opción: Pago Manual (solo admins) */}
            {isAdminOrClubAdmin && (
              <div className="flex-1 space-y-1.5">
                <Button
                  variant="outline"
                  onClick={() => setManualPaymentOpen(true)}
                  className="w-full"
                  size="sm"
                >
                  <DollarSign className="mr-2 h-3.5 w-3.5" />
                  Pago Manual
                </Button>
                <p className="text-xs text-muted-foreground">
                  Efectivo, transferencia u otro
                </p>
              </div>
            )}
          </div>

          {/* Mensaje informativo si MercadoPago está deshabilitado */}
          {!isMercadoPagoEnabled && !isAdminOrClubAdmin && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Los pagos online están temporalmente deshabilitados. Por favor, contacta al organizador del torneo para coordinar el pago.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog para pago manual */}
      {isAdminOrClubAdmin && (
        <ManualPaymentDialog
          open={manualPaymentOpen}
          onOpenChange={setManualPaymentOpen}
          registrationId={registrationId}
          amount={amount}
          tournamentName={tournamentName}
          categoryName={categoryName}
          onSuccess={handleManualPaymentSuccess}
        />
      )}
    </>
  )
}
