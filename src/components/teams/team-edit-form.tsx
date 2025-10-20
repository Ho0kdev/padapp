"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, FileText, Trophy } from "lucide-react"

const teamEditSchema = z.object({
  name: z.string().max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  seed: z.number().int().positive("La semilla debe ser un número positivo").optional().or(z.literal(undefined)),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]),
})

type TeamEditData = z.infer<typeof teamEditSchema>

interface TeamEditFormProps {
  initialData?: {
    name?: string
    seed?: number
    notes?: string
    status: string
  }
  teamId: string
  tournamentStatus: string
}

export function TeamEditForm({ initialData, teamId, tournamentStatus }: TeamEditFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<TeamEditData>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: {
      name: initialData?.name || "",
      seed: initialData?.seed || undefined,
      notes: initialData?.notes || "",
      status: initialData?.status as "DRAFT" | "CONFIRMED" | "CANCELLED" || "DRAFT",
    },
  })

  const isTournamentCompleted = tournamentStatus === "COMPLETED"

  const onSubmit = async (data: TeamEditData) => {
    try {
      setLoading(true)

      const submitData = {
        name: data.name,
        seed: data.seed,
        notes: data.notes,
        status: data.status,
      }

      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar el equipo")
      }

      toast({
        title: "✅ Éxito",
        description: "Equipo actualizado correctamente",
        variant: "success",
      })

      router.push(`/dashboard/teams/${teamId}`)
    } catch (error) {
      console.error("Error updating team:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar el equipo",
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
          {/* Información Básica del Equipo */}
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
                        disabled={isTournamentCompleted}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Si no se especifica, se usará el nombre de los jugadores
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semilla (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Posición inicial del equipo"
                        disabled={isTournamentCompleted}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === '' ? undefined : parseInt(value))
                        }}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      La semilla determina la posición inicial del equipo en el torneo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Estado del Equipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Estado del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isTournamentCompleted}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Estado actual del equipo en el torneo
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
                        placeholder="Información adicional sobre el equipo"
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
              Actualizar Equipo
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
              No se puede editar un equipo de un torneo completado
            </p>
          )}
        </form>
      </Form>
    </div>
  )
}
