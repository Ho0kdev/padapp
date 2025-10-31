"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const scheduleSchema = z.object({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
}).refine(data => data.scheduledDate && data.scheduledTime, {
  message: "Debe proporcionar fecha y hora"
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

interface AmericanoMatch {
  id: string
  roundNumber: number
  scheduledFor: string | null
  pool: {
    name: string
  }
  tournament: {
    id: string
    name: string
  }
  player1: {
    firstName: string
    lastName: string
  }
  player2: {
    firstName: string
    lastName: string
  }
  player3: {
    firstName: string
    lastName: string
  }
  player4: {
    firstName: string
    lastName: string
  }
}

interface AmericanoMatchScheduleDialogProps {
  match: AmericanoMatch
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AmericanoMatchScheduleDialog({
  match,
  open,
  onOpenChange,
  onSuccess
}: AmericanoMatchScheduleDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Helper to convert scheduledFor to Date object
  const getScheduledDate = () => {
    if (!match.scheduledFor) return null
    return typeof match.scheduledFor === 'string'
      ? parseISO(match.scheduledFor)
      : match.scheduledFor
  }

  const scheduledDate = getScheduledDate()

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduledDate: scheduledDate
        ? format(scheduledDate, "yyyy-MM-dd")
        : undefined,
      scheduledTime: scheduledDate
        ? format(scheduledDate, "HH:mm")
        : undefined
    }
  })

  useEffect(() => {
    if (open) {
      const currentScheduledDate = getScheduledDate()
      // Reset form with current values when dialog opens
      form.reset({
        scheduledDate: currentScheduledDate
          ? format(currentScheduledDate, "yyyy-MM-dd")
          : undefined,
        scheduledTime: currentScheduledDate
          ? format(currentScheduledDate, "HH:mm")
          : undefined
      })
    }
  }, [open, match])

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setLoading(true)

      // Combinar fecha y hora en un solo datetime
      const dateTimeString = `${data.scheduledDate}T${data.scheduledTime}`
      const payload = {
        scheduledFor: new Date(dateTimeString).toISOString()
      }

      const response = await fetch(`/api/americano-matches/${match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al programar partido")
      }

      toast({
        title: "✅ Partido programado",
        description: "El partido ha sido programado exitosamente",
        variant: "success",
      })

      form.reset()
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo programar el partido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearSchedule = async () => {
    try {
      setLoading(true)

      const payload = {
        scheduledFor: null
      }

      const response = await fetch(`/api/americano-matches/${match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al limpiar programación")
      }

      toast({
        title: "✅ Programación eliminada",
        description: "Se ha eliminado el horario del partido",
        variant: "success",
      })

      form.reset({
        scheduledDate: undefined,
        scheduledTime: undefined
      })
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo limpiar la programación",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar Partido Americano
          </DialogTitle>
          <DialogDescription>
            {match.tournament.name}
          </DialogDescription>
        </DialogHeader>

        {/* Información del partido */}
        <div className="space-y-2 py-2 border-y">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pool:</span>
            <span className="font-medium">{match.pool.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ronda:</span>
            <span className="font-medium">Ronda {match.roundNumber}</span>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Jugadores:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium text-xs">Equipo A:</p>
                <p className="text-xs">{match.player1.firstName} {match.player1.lastName}</p>
                <p className="text-xs">{match.player2.firstName} {match.player2.lastName}</p>
              </div>
              <div>
                <p className="font-medium text-xs">Equipo B:</p>
                <p className="text-xs">{match.player3.firstName} {match.player3.lastName}</p>
                <p className="text-xs">{match.player4.firstName} {match.player4.lastName}</p>
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fecha */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Selecciona la fecha del partido
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hora */}
            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {Array.from({ length: 96 }, (_, i) => {
                        const hours = Math.floor(i / 4)
                        const minutes = (i % 4) * 15
                        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                        return (
                          <SelectItem key={timeString} value={timeString}>
                            {timeString}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona la hora del partido (intervalos de 15 minutos)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {match.scheduledFor && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearSchedule}
                  disabled={loading}
                >
                  Limpiar programación
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
