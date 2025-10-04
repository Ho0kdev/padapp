"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"

const registrationEditSchema = z.object({
  registrationStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
    "WAITLIST"
  ]),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
})

type RegistrationEditData = z.infer<typeof registrationEditSchema>

interface RegistrationEditFormProps {
  initialData?: {
    registrationStatus: string
    notes?: string
  }
  registrationId: string
  tournamentStatus: string
}

export function RegistrationEditForm({
  initialData,
  registrationId,
  tournamentStatus
}: RegistrationEditFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<RegistrationEditData>({
    resolver: zodResolver(registrationEditSchema),
    defaultValues: {
      registrationStatus: initialData?.registrationStatus as any || "PENDING",
      notes: initialData?.notes || "",
    }
  })

  const isTournamentCompleted = tournamentStatus === 'COMPLETED'

  const onSubmit = async (data: RegistrationEditData) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationStatus: data.registrationStatus,
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar la inscripción")
      }

      toast({
        title: "Éxito",
        description: "Inscripción actualizada correctamente",
        variant: "success"
      })

      router.push(`/dashboard/registrations/${registrationId}`)
    } catch (error) {
      console.error("Error updating registration:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la inscripción",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Estado de la Inscripción */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estado de la Inscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="registrationStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isTournamentCompleted}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                        <SelectItem value="PAID">Pagado</SelectItem>
                        <SelectItem value="WAITLIST">Lista de Espera</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Estado actual de la inscripción
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional sobre la inscripción"
                        className="min-h-[80px]"
                        disabled={isTournamentCompleted}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || isTournamentCompleted}
              className="min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Actualizar Inscripción
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>

          {isTournamentCompleted && (
            <p className="text-sm text-muted-foreground text-center">
              No se puede editar una inscripción de un torneo completado
            </p>
          )}
        </form>
      </Form>
    </div>
  )
}