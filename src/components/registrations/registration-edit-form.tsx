"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2, Users, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"

const registrationEditSchema = z.object({
  name: z.string().max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
})

type RegistrationEditData = z.infer<typeof registrationEditSchema>

interface RegistrationEditFormProps {
  initialData?: {
    name?: string
    notes?: string
  }
  registrationId?: string
}

export function RegistrationEditForm({ initialData, registrationId }: RegistrationEditFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<RegistrationEditData>({
    resolver: zodResolver(registrationEditSchema),
    defaultValues: {
      name: initialData?.name || "",
      notes: initialData?.notes || "",
    }
  })

  const onSubmit = async (data: RegistrationEditData) => {
    try {
      setLoading(true)

      const url = `/api/registrations/${registrationId}`
      const method = "PUT"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar la inscripción")
      }

      toast({
        title: "¡Éxito!",
        description: "Inscripción actualizada correctamente",
      })

      // Redirigir a la página de detalle
      router.push(`/dashboard/registrations/${registrationId}`)
    } catch (error) {
      console.error("Error updating registration:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la inscripción",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información del Equipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Información del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Equipo (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre personalizado para el equipo"
                        {...field}
                      />
                    </FormControl>
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
              disabled={loading}
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
        </form>
      </Form>
    </div>
  )
}