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
import { Loader2, Calendar, MapPin } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const scheduleSchema = z.object({
  courtId: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
}).refine(data => data.courtId || (data.scheduledDate && data.scheduledTime), {
  message: "Debe asignar al menos una cancha o un horario completo (fecha y hora)"
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

interface Court {
  id: string
  name: string
  club: {
    name: string
  }
}

interface Match {
  id: string
  tournamentId: string
  categoryId: string
  matchNumber: number | null
  phaseType: string
  scheduledAt: string | null
  court: {
    id: string
    name: string
    club: {
      name: string
    }
  } | null
  tournament: {
    id: string
    name: string
  }
  category: {
    id: string
    name: string
  }
  team1: {
    id: string
    name: string | null
    registration1: {
      player: {
        firstName: string
        lastName: string
      }
    }
    registration2: {
      player: {
        firstName: string
        lastName: string
      }
    }
  } | null
  team2: {
    id: string
    name: string | null
    registration1: {
      player: {
        firstName: string
        lastName: string
      }
    }
    registration2: {
      player: {
        firstName: string
        lastName: string
      }
    }
  } | null
}

interface MatchScheduleDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MatchScheduleDialog({
  match,
  open,
  onOpenChange,
  onSuccess
}: MatchScheduleDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [loadingCourts, setLoadingCourts] = useState(false)

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      courtId: match.court?.id || undefined,
      scheduledDate: match.scheduledAt
        ? format(parseISO(match.scheduledAt), "yyyy-MM-dd")
        : undefined,
      scheduledTime: match.scheduledAt
        ? format(parseISO(match.scheduledAt), "HH:mm")
        : undefined
    }
  })

  useEffect(() => {
    if (open) {
      fetchCourts()
      // Reset form with current values when dialog opens
      form.reset({
        courtId: match.court?.id || undefined,
        scheduledDate: match.scheduledAt
          ? format(parseISO(match.scheduledAt), "yyyy-MM-dd")
          : undefined,
        scheduledTime: match.scheduledAt
          ? format(parseISO(match.scheduledAt), "HH:mm")
          : undefined
      })
    }
  }, [open, match])

  const fetchCourts = async () => {
    try {
      setLoadingCourts(true)
      // Obtener torneo con clubes y sus canchas
      const response = await fetch(`/api/tournaments/${match.tournamentId}`)

      if (!response.ok) {
        throw new Error("Error al cargar canchas")
      }

      const tournament = await response.json()

      // Recopilar canchas de todos los clubes asociados al torneo
      // Usar un Map para evitar duplicados por ID
      const courtsMap = new Map<string, Court>()

      // Club principal
      if (tournament.mainClub?.courts) {
        tournament.mainClub.courts.forEach((court: any) => {
          // Solo agregar canchas activas y no eliminadas
          if (!court.deleted && court.status !== 'UNAVAILABLE') {
            courtsMap.set(court.id, {
              id: court.id,
              name: court.name,
              club: {
                name: tournament.mainClub.name
              }
            })
          }
        })
      }

      // Clubes adicionales
      if (tournament.clubs) {
        tournament.clubs.forEach((tc: any) => {
          if (tc.club?.courts) {
            tc.club.courts.forEach((court: any) => {
              // Solo agregar si no existe ya y si está activa
              if (!courtsMap.has(court.id) && !court.deleted && court.status !== 'UNAVAILABLE') {
                courtsMap.set(court.id, {
                  id: court.id,
                  name: court.name,
                  club: {
                    name: tc.club.name
                  }
                })
              }
            })
          }
        })
      }

      // Convertir el Map a array
      const activeCourts = Array.from(courtsMap.values())

      setCourts(activeCourts)
    } catch (error) {
      console.error("Error fetching courts:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las canchas",
        variant: "destructive",
      })
    } finally {
      setLoadingCourts(false)
    }
  }

  const getTeamDisplay = (team: Match["team1"]) => {
    if (!team) return "TBD"
    if (team.name) return team.name

    const p1 = `${team.registration1.player.firstName} ${team.registration1.player.lastName}`
    const p2 = `${team.registration2.player.firstName} ${team.registration2.player.lastName}`
    return `${p1} / ${p2}`
  }

  const getPhaseLabel = (phaseType: string) => {
    const phases: Record<string, string> = {
      FINAL: "Final",
      SEMIFINALS: "Semifinal",
      QUARTERFINALS: "Cuartos",
      ROUND_OF_16: "Octavos",
      ROUND_OF_32: "Dieciseisavos",
      GROUP_STAGE: "Fase de Grupos",
      THIRD_PLACE: "3er Lugar"
    }
    return phases[phaseType] || phaseType
  }

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setLoading(true)

      const payload: any = {}

      if (data.courtId) {
        payload.courtId = data.courtId
      }

      if (data.scheduledDate && data.scheduledTime) {
        // Combinar fecha y hora en un solo datetime
        const dateTimeString = `${data.scheduledDate}T${data.scheduledTime}`
        payload.scheduledAt = new Date(dateTimeString).toISOString()
      }

      const response = await fetch(`/api/matches/${match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al programar partido")
      }

      toast({
        title: "Partido programado",
        description: "El partido ha sido programado exitosamente",
      })

      form.reset()
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo programar el partido"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearSchedule = async () => {
    try {
      setLoading(true)

      const payload = {
        courtId: null,
        scheduledAt: null
      }

      const response = await fetch(`/api/matches/${match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al limpiar programación")
      }

      toast({
        title: "Programación eliminada",
        description: "Se ha eliminado la cancha y horario del partido",
      })

      form.reset({
        courtId: undefined,
        scheduledDate: undefined,
        scheduledTime: undefined
      })
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo limpiar la programación"
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
            Programar Partido
          </DialogTitle>
          <DialogDescription>
            {match.tournament.name} • {match.category.name}
          </DialogDescription>
        </DialogHeader>

        {/* Información del partido */}
        <div className="space-y-2 py-2 border-y">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fase:</span>
            <span className="font-medium">{getPhaseLabel(match.phaseType)}</span>
          </div>
          {match.matchNumber && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Partido #:</span>
              <span className="font-medium">{match.matchNumber}</span>
            </div>
          )}
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Equipos:</p>
            <p className="font-medium">{getTeamDisplay(match.team1)}</p>
            <p className="text-xs text-muted-foreground">vs</p>
            <p className="font-medium">{getTeamDisplay(match.team2)}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cancha */}
            <FormField
              control={form.control}
              name="courtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancha</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingCourts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cancha">
                          {field.value && courts.find(c => c.id === field.value) && (
                            <span className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {courts.find(c => c.id === field.value)?.name} - {courts.find(c => c.id === field.value)?.club.name}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCourts ? (
                        <SelectItem value="loading" disabled>
                          Cargando canchas...
                        </SelectItem>
                      ) : courts.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          No hay canchas disponibles
                        </SelectItem>
                      ) : (
                        courts.map((court) => (
                          <SelectItem key={court.id} value={court.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{court.name} - {court.club.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona la cancha donde se jugará el partido
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              {(match.court || match.scheduledAt) && (
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
