"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const manualPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  paymentMethod: z.enum(["MANUAL", "CASH", "BANK_TRANSFER"]),
  transactionId: z.string().optional(),
  paymentProofUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  notes: z.string().optional(),
})

type ManualPaymentFormData = z.infer<typeof manualPaymentSchema>

interface ManualPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationId: string
  amount: number
  tournamentName: string
  categoryName: string
  onSuccess?: () => void
}

export function ManualPaymentDialog({
  open,
  onOpenChange,
  registrationId,
  amount,
  tournamentName,
  categoryName,
  onSuccess,
}: ManualPaymentDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<ManualPaymentFormData>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: {
      amount,
      paymentMethod: "MANUAL",
      transactionId: "",
      paymentProofUrl: "",
      notes: "",
    },
  })

  const onSubmit = async (data: ManualPaymentFormData) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/registrations/${registrationId}/payment/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al registrar el pago')
      }

      const result = await response.json()
      console.log('✅ Pago registrado:', result)

      if (onSuccess) {
        onSuccess()
      }

      form.reset()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al registrar el pago')
    } finally {
      setLoading(false)
    }
  }

  const paymentMethodValue = form.watch("paymentMethod")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago Manual</DialogTitle>
          <DialogDescription>
            {tournamentName} - {categoryName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Monto */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Tarifa de inscripción: ${amount.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Método de pago */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">Confirmación Manual</SelectItem>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona cómo se recibió el pago
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ID de transacción (opcional) */}
            <FormField
              control={form.control}
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de Transacción (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 123456789"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Número de transacción bancaria, recibo, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL de comprobante (opcional, para transferencias) */}
            {paymentMethodValue === "BANK_TRANSFER" && (
              <FormField
                control={form.control}
                name="paymentProofUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprobante de pago (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://ejemplo.com/comprobante.pdf"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL del comprobante de transferencia
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notas (opcional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre el pago..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Confirmar pago'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
