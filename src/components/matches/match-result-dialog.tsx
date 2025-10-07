"use client"

import { useState, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Trophy, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getMatchStatusStyle, getMatchStatusLabel } from "@/lib/utils/status-styles"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Función para crear schema dinámico basado en configuración del torneo
const createSetSchema = (gamesToWinSet: number, tiebreakAt: number) => {
  const maxGames = gamesToWinSet + 1 // Si gamesToWinSet=6, max puede ser 7 (7-5)

  return z.object({
    team1Games: z.number({ invalid_type_error: "Debe ingresar los games del equipo 1" }).int().min(0).max(maxGames, `Máximo ${maxGames} games por set`),
    team2Games: z.number({ invalid_type_error: "Debe ingresar los games del equipo 2" }).int().min(0).max(maxGames, `Máximo ${maxGames} games por set`),
    team1TiebreakPoints: z.number().int().min(0).max(20).optional(),
    team2TiebreakPoints: z.number().int().min(0).max(20).optional(),
  }).superRefine((data, ctx) => {
    const maxGamesInSet = Math.max(data.team1Games, data.team2Games)
    const minGamesInSet = Math.min(data.team1Games, data.team2Games)

    // Si el máximo de games es mayor a lo permitido
    if (maxGamesInSet > maxGames) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Máximo ${maxGames} games por set`,
        path: maxGamesInSet === data.team1Games ? ["team1Games"] : ["team2Games"]
      })
      return
    }

    // Si alguien ganó con gamesToWinSet games (ej: 6 games)
    if (maxGamesInSet === gamesToWinSet) {
      // Debe ganar por diferencia de al menos 2 games
      // Ej: 6-0, 6-1, 6-2, 6-3, 6-4 son válidos
      // 6-5 NO es válido (debería ir a 7-5 o tiebreak)
      if (minGamesInSet >= gamesToWinSet - 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${gamesToWinSet}-${minGamesInSet} inválido. Debe ser ${gamesToWinSet + 1}-${gamesToWinSet - 1} o ir a tiebreak`,
          path: ["team1Games"]
        })
        return
      }
    }

    // Si el score llegó a gamesToWinSet+1 (ej: 7 games)
    if (maxGamesInSet === gamesToWinSet + 1) {
      // Solo puede ser gamesToWinSet+1 vs gamesToWinSet-1 (ej: 7-5)
      if (minGamesInSet === gamesToWinSet - 1) {
        return // 7-5 es válido
      }

      // O gamesToWinSet+1 vs tiebreakAt con tiebreak (ej: 7-6 con tiebreak)
      if (minGamesInSet === tiebreakAt) {
        // Debe haber puntos de tiebreak
        const hasTiebreak = (data.team1TiebreakPoints !== undefined && data.team1TiebreakPoints >= 0) ||
                           (data.team2TiebreakPoints !== undefined && data.team2TiebreakPoints >= 0)
        if (!hasTiebreak) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${gamesToWinSet + 1}-${tiebreakAt} requiere puntos de tiebreak`,
            path: ["team1TiebreakPoints"]
          })
        }
        return
      }

      // Cualquier otro caso es inválido
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${maxGamesInSet}-${minGamesInSet} inválido. Solo se permite ${gamesToWinSet + 1}-${gamesToWinSet - 1}`,
        path: ["team1Games"]
      })
      return
    }

    // Si llegaron a tiebreakAt-tiebreakAt (ej: 6-6), debe haber tiebreak
    if (data.team1Games === tiebreakAt && data.team2Games === tiebreakAt) {
      const hasTiebreak = (data.team1TiebreakPoints !== undefined && data.team1TiebreakPoints >= 0) ||
                         (data.team2TiebreakPoints !== undefined && data.team2TiebreakPoints >= 0)
      if (!hasTiebreak) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${tiebreakAt}-${tiebreakAt} requiere puntos de tiebreak`,
          path: ["team1TiebreakPoints"]
        })
      }
      return
    }

    // Validar que el ganador llegó al mínimo de games necesarios
    if (maxGamesInSet < gamesToWinSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Para ganar un set se debe llegar a ${gamesToWinSet} games (ej: ${gamesToWinSet}-0, ${gamesToWinSet}-4)`,
        path: ["team1Games"]
      })
      return
    }

    // Validar diferencia mínima de 2 games
    const diff = Math.abs(data.team1Games - data.team2Games)
    if (diff < 2 && maxGamesInSet !== gamesToWinSet + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe haber diferencia de al menos 2 games para ganar el set`,
        path: ["team1Games"]
      })
    }
  })
}

// Función para crear schema de resultado dinámico
const createResultSchema = (setsToWin: number, gamesToWinSet: number, tiebreakAt: number) => {
  const maxSets = (setsToWin * 2) - 1 // Para ganar 2 sets, máximo 3 sets (2-1)
  const setSchema = createSetSchema(gamesToWinSet, tiebreakAt)

  return z.object({
    sets: z.array(setSchema)
      .min(setsToWin, `Debe cargar al menos ${setsToWin} sets`)
      .max(maxSets, `Máximo ${maxSets} sets para este formato`),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().max(500).optional(),
  }).superRefine((data, ctx) => {
    // Validar que uno de los equipos haya ganado setsToWin sets
    // Considerar tiebreak points para determinar ganador del set
    const team1Sets = data.sets.filter(s => {
      // Ignorar sets vacíos
      if (typeof s.team1Games !== 'number' || typeof s.team2Games !== 'number') return false
      if (s.team1Games > s.team2Games) return true
      if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
        return s.team1TiebreakPoints > s.team2TiebreakPoints
      }
      return false
    }).length

    const team2Sets = data.sets.filter(s => {
      // Ignorar sets vacíos
      if (typeof s.team1Games !== 'number' || typeof s.team2Games !== 'number') return false
      if (s.team2Games > s.team1Games) return true
      if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
        return s.team2TiebreakPoints > s.team1TiebreakPoints
      }
      return false
    }).length

    // Uno de los equipos debe tener setsToWin sets ganados
    if (team1Sets < setsToWin && team2Sets < setsToWin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Un equipo debe ganar al menos ${setsToWin} sets. Actualmente: Equipo 1: ${team1Sets} sets, Equipo 2: ${team2Sets} sets`,
        path: ["sets"]
      })
    }
  })
}

type ResultFormData = z.infer<typeof resultSchema>

interface Team {
  id: string
  name?: string | null
  registration1?: {
    player: {
      firstName: string
      lastName: string
    }
  }
  registration2?: {
    player: {
      firstName: string
      lastName: string
    }
  }
}

interface Match {
  id: string
  status: string
  matchNumber: number | null
  phaseType: string
  team1?: Team | null
  team2?: Team | null
  tournament: {
    id: string
    name: string
    setsToWin: number
    gamesToWinSet: number
    tiebreakAt: number
    goldenPoint: boolean
  }
  category: {
    id: string
    name: string
  }
}

interface MatchResultDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MatchResultDialog({
  match,
  open,
  onOpenChange,
  onSuccess
}: MatchResultDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [matchStatus, setMatchStatus] = useState(match.status)
  const [walkoverWinner, setWalkoverWinner] = useState<string | null>(null)

  // Crear schema dinámico basado en configuración del torneo
  const resultSchema = createResultSchema(
    match.tournament.setsToWin,
    match.tournament.gamesToWinSet,
    match.tournament.tiebreakAt
  )

  const form = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema),
    mode: "onSubmit", // Validar solo al hacer submit
    reValidateMode: "onSubmit", // Re-validar solo al hacer submit
    defaultValues: {
      sets: [
        { team1Games: "" as any, team2Games: "" as any },
        { team1Games: "" as any, team2Games: "" as any }
      ],
      durationMinutes: undefined,
      notes: ""
    }
  })

  const sets = form.watch("sets")

  // Calcular ganador actual basado en sets (memoizado para evitar re-cálculos)
  // Considerar tiebreak points para determinar ganador del set
  const winner = useMemo(() => {
    const team1Sets = sets.filter(s => {
      // Ignorar sets vacíos
      if (typeof s.team1Games !== 'number' || typeof s.team2Games !== 'number') return false
      if (s.team1Games > s.team2Games) return true
      if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
        return s.team1TiebreakPoints > s.team2TiebreakPoints
      }
      return false
    }).length

    const team2Sets = sets.filter(s => {
      // Ignorar sets vacíos
      if (typeof s.team1Games !== 'number' || typeof s.team2Games !== 'number') return false
      if (s.team2Games > s.team1Games) return true
      if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
        return s.team2TiebreakPoints > s.team1TiebreakPoints
      }
      return false
    }).length

    if (team1Sets > team2Sets) return "team1"
    if (team2Sets > team1Sets) return "team2"
    return null
  }, [sets])

  const addSet = () => {
    const currentSets = form.getValues("sets")
    const maxSets = (match.tournament.setsToWin * 2) - 1
    if (currentSets.length < maxSets) {
      form.setValue("sets", [...currentSets, { team1Games: "" as any, team2Games: "" as any }])
    }
  }

  const removeSet = (index: number) => {
    const currentSets = form.getValues("sets")
    const minSets = match.tournament.setsToWin
    if (currentSets.length > minSets) {
      form.setValue(
        "sets",
        currentSets.filter((_, i) => i !== index)
      )
    }
  }

  const getTeamDisplay = (team?: Team | null): string => {
    if (!team) return "Por definir"
    if (team.name) return team.name

    if (team.registration1?.player && team.registration2?.player) {
      return `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
    }

    return "Equipo sin nombre"
  }

  const handleStatusChange = async (newStatus: string) => {
    // Si cambia a WALKOVER o CANCELLED, solo actualizar el estado local
    // No llamar a la API ni cerrar el diálogo
    if (newStatus === "WALKOVER") {
      setMatchStatus(newStatus)
      // Limpiar el ganador de walkover para que el usuario seleccione uno
      setWalkoverWinner(null)
      return
    }

    if (newStatus === "CANCELLED") {
      // Para CANCELLED, actualizar directamente y cerrar
      try {
        setLoading(true)

        const response = await fetch(`/api/matches/${match.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Error al cambiar status")
        }

        toast({
          title: "✅ Partido cancelado",
          description: "El partido ha sido marcado como cancelado",
        })

        onSuccess()
        onOpenChange(false)

      } catch (error) {
        toast({
          variant: "destructive",
          title: "❌ Error",
          description: error instanceof Error ? error.message : "No se pudo cancelar el partido"
        })
      } finally {
        setLoading(false)
      }
      return
    }

    // Para otros status (SCHEDULED, IN_PROGRESS), actualizar normalmente
    try {
      setLoading(true)

      const response = await fetch(`/api/matches/${match.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cambiar status")
      }

      toast({
        title: "✅ Status actualizado",
        description: `El partido ahora está ${getMatchStatusLabel(newStatus).toLowerCase()}`,
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo cambiar el status"
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmitError = (errors: any) => {
    // Construir mensaje de error más específico
    let errorMessages: string[] = []

    // Errores a nivel de sets (array completo)
    if (errors.sets?.message) {
      errorMessages.push(errors.sets.message)
    }

    // Errores en sets individuales
    if (errors.sets && typeof errors.sets === 'object') {
      Object.entries(errors.sets).forEach(([index, setError]: [string, any]) => {
        if (index === 'message' || index === 'root') return

        const setNum = parseInt(index) + 1

        if (setError?.team1Games?.message) {
          errorMessages.push(`Set ${setNum} - Equipo 1: ${setError.team1Games.message}`)
        }
        if (setError?.team2Games?.message) {
          errorMessages.push(`Set ${setNum} - Equipo 2: ${setError.team2Games.message}`)
        }
        if (setError?.team1TiebreakPoints?.message) {
          errorMessages.push(`Set ${setNum} - Tiebreak Equipo 1: ${setError.team1TiebreakPoints.message}`)
        }
        if (setError?.team2TiebreakPoints?.message) {
          errorMessages.push(`Set ${setNum} - Tiebreak Equipo 2: ${setError.team2TiebreakPoints.message}`)
        }
        if (setError?.message) {
          errorMessages.push(`Set ${setNum}: ${setError.message}`)
        }
      })
    }

    // Errores en otros campos
    if (errors.durationMinutes?.message) {
      errorMessages.push(`Duración: ${errors.durationMinutes.message}`)
    }
    if (errors.notes?.message) {
      errorMessages.push(`Notas: ${errors.notes.message}`)
    }

    const errorMessage = errorMessages.length > 0
      ? errorMessages.join('\n')
      : "Por favor revisa los datos ingresados"

    toast({
      variant: "destructive",
      title: "❌ Error de validación",
      description: errorMessage
    })
  }

  const onSubmit = async (data: ResultFormData) => {
    try {
      setLoading(true)

      // Si es WALKOVER, validar que se seleccionó un ganador
      if (matchStatus === "WALKOVER") {
        if (!walkoverWinner) {
          throw new Error("Debe seleccionar qué equipo gana por walkover")
        }

        // Crear sets automáticos 6-0 para el ganador
        const setsCount = match.tournament.setsToWin
        const walkoverSets = Array.from({ length: setsCount }, () =>
          walkoverWinner === match.team1?.id
            ? { team1Games: 6, team2Games: 0 }
            : { team1Games: 0, team2Games: 6 }
        )

        const payload = {
          winnerTeamId: walkoverWinner,
          sets: walkoverSets,
          notes: data.notes || "Walkover",
          status: "WALKOVER"
        }

        const response = await fetch(`/api/matches/${match.id}/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Error al cargar walkover")
        }

        toast({
          title: "✅ Walkover registrado",
          description: "El partido ha sido marcado como walkover y actualizado en el bracket.",
        })

        form.reset()
        onSuccess()
        onOpenChange(false)
        return
      }

      // Flujo normal para partidos jugados
      // Filtrar sets completos (que tengan valores numéricos)
      const completeSets = data.sets.filter(s => typeof s.team1Games === 'number' && typeof s.team2Games === 'number')

      // Determinar equipo ganador considerando tiebreak points
      const team1Sets = completeSets.filter(s => {
        if (s.team1Games > s.team2Games) return true
        if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
          return s.team1TiebreakPoints > s.team2TiebreakPoints
        }
        return false
      }).length

      const team2Sets = completeSets.filter(s => {
        if (s.team2Games > s.team1Games) return true
        if (s.team1Games === s.team2Games && s.team1TiebreakPoints && s.team2TiebreakPoints) {
          return s.team2TiebreakPoints > s.team1TiebreakPoints
        }
        return false
      }).length

      const winnerTeamId = team1Sets > team2Sets ? match.team1?.id : match.team2?.id

      if (!winnerTeamId) {
        throw new Error("No se pudo determinar el equipo ganador")
      }

      const payload = {
        winnerTeamId,
        sets: completeSets,
        durationMinutes: data.durationMinutes,
        notes: data.notes
      }

      const response = await fetch(`/api/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cargar resultado")
      }

      toast({
        title: "✅ Resultado cargado",
        description: "El resultado se ha guardado exitosamente y el bracket ha sido actualizado.",
      })

      form.reset()
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudo cargar el resultado"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!match.team1 || !match.team2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede cargar resultado</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El partido no tiene ambos equipos asignados aún.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cargar Resultado - Partido {match.matchNumber}
          </DialogTitle>
          <DialogDescription>
            {match.tournament?.name || "Torneo"} • {match.category?.name || "Categoría"}
          </DialogDescription>
        </DialogHeader>

        {/* Status del partido */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado del Partido</label>
          <Select value={matchStatus} onValueChange={handleStatusChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue>
                <Badge className={getMatchStatusStyle(matchStatus)}>
                  {getMatchStatusLabel(matchStatus)}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">
                <span className="flex items-center gap-2">
                  <Badge className={getMatchStatusStyle("SCHEDULED")}>
                    {getMatchStatusLabel("SCHEDULED")}
                  </Badge>
                </span>
              </SelectItem>
              <SelectItem value="IN_PROGRESS">
                <span className="flex items-center gap-2">
                  <Badge className={getMatchStatusStyle("IN_PROGRESS")}>
                    {getMatchStatusLabel("IN_PROGRESS")}
                  </Badge>
                </span>
              </SelectItem>
              {matchStatus !== "COMPLETED" && (
                <SelectItem value="CANCELLED">
                  <span className="flex items-center gap-2">
                    <Badge className={getMatchStatusStyle("CANCELLED")}>
                      {getMatchStatusLabel("CANCELLED")}
                    </Badge>
                  </span>
                </SelectItem>
              )}
              {matchStatus !== "COMPLETED" && (
                <SelectItem value="WALKOVER">
                  <span className="flex items-center gap-2">
                    <Badge className={getMatchStatusStyle("WALKOVER")}>
                      {getMatchStatusLabel("WALKOVER")}
                    </Badge>
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de ganador para WALKOVER */}
        {matchStatus === "WALKOVER" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Equipo Ganador (Walkover)</label>
            <Select value={walkoverWinner || ""} onValueChange={setWalkoverWinner} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar equipo ganador">
                  {walkoverWinner === match.team1?.id && getTeamDisplay(match.team1)}
                  {walkoverWinner === match.team2?.id && getTeamDisplay(match.team2)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={match.team1?.id || ""}>
                  {getTeamDisplay(match.team1)}
                </SelectItem>
                <SelectItem value={match.team2?.id || ""}>
                  {getTeamDisplay(match.team2)}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El resultado se registrará automáticamente como {match.tournament.setsToWin === 2 ? "6-0, 6-0" : `${Array(match.tournament.setsToWin).fill("6-0").join(", ")}`} para el equipo ganador
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={async (e) => {
            e.preventDefault()

            // Si es WALKOVER, saltear validación del formulario
            if (matchStatus === "WALKOVER") {
              await onSubmit(form.getValues())
              return
            }

            const isValid = await form.trigger()

            if (isValid) {
              const values = form.getValues()
              await onSubmit(values)
            } else {
              const errors = form.formState.errors
              onSubmitError(errors)
            }
          }} className="space-y-6">
            {/* Info de equipos */}
            {matchStatus !== "WALKOVER" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">Equipo 1</p>
                  <p className="text-xs text-muted-foreground">
                    {getTeamDisplay(match.team1)}
                  </p>
                </div>
                {winner === "team1" && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Trophy className="h-3 w-3 mr-1" />
                    Ganador
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">Equipo 2</p>
                  <p className="text-xs text-muted-foreground">
                    {getTeamDisplay(match.team2)}
                  </p>
                </div>
                {winner === "team2" && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Trophy className="h-3 w-3 mr-1" />
                    Ganador
                  </Badge>
                )}
              </div>
            </div>
            )}

            {/* Info de configuración del torneo */}
            {matchStatus !== "WALKOVER" && (
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Configuración:</strong> Al mejor de {match.tournament.setsToWin} sets •
                {match.tournament.gamesToWinSet} games por set •
                Tiebreak a {match.tournament.tiebreakAt}-{match.tournament.tiebreakAt}
                {match.tournament.goldenPoint && " • Golden Point activado"}
              </AlertDescription>
            </Alert>
            )}

            {/* Sets */}
            {matchStatus !== "WALKOVER" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Sets jugados</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSet}
                  disabled={sets.length >= (match.tournament.setsToWin * 2) - 1}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Set
                </Button>
              </div>

              {/* Error general de sets (solo después de submit) */}
              {form.formState.isSubmitted && form.formState.errors.sets?.message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.sets.message}
                  </AlertDescription>
                </Alert>
              )}

              {sets.map((_, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Set {index + 1}</h4>
                        {sets.length > match.tournament.setsToWin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSet(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Team 1 Games */}
                        <FormField
                          control={form.control}
                          name={`sets.${index}.team1Games`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Equipo 1 - Games</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={match.tournament.gamesToWinSet + 1}
                                  placeholder=""
                                  value={field.value === "" ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    field.onChange(value === "" ? "" : parseInt(value))
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Team 2 Games */}
                        <FormField
                          control={form.control}
                          name={`sets.${index}.team2Games`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Equipo 2 - Games</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={match.tournament.gamesToWinSet + 1}
                                  placeholder=""
                                  value={field.value === "" ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    field.onChange(value === "" ? "" : parseInt(value))
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Tiebreak (mostrar cuando corresponda según configuración) */}
                      {(() => {
                        const tiebreakAt = match.tournament.tiebreakAt
                        const gamesToWin = match.tournament.gamesToWinSet
                        const t1 = sets[index].team1Games
                        const t2 = sets[index].team2Games

                        // Mostrar tiebreak si:
                        // 1. Están empatados en tiebreakAt (ej: 6-6)
                        // 2. Uno tiene gamesToWin+1 y el otro tiebreakAt (ej: 7-6 o 6-7)
                        const showTiebreak = (t1 === tiebreakAt && t2 === tiebreakAt) ||
                                            (t1 === gamesToWin + 1 && t2 === tiebreakAt) ||
                                            (t2 === gamesToWin + 1 && t1 === tiebreakAt)

                        return showTiebreak
                      })() ? (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`sets.${index}.team1TiebreakPoints`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tiebreak - Equipo 1</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="Pts"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`sets.${index}.team2TiebreakPoints`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tiebreak - Equipo 2</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="Pts"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {form.formState.errors.sets?.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.sets.root.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            )}

            {/* Duración - no mostrar para WALKOVER */}
            {matchStatus !== "WALKOVER" && (
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración del partido (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 90"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Duración en minutos
                  </FormDescription>
                </FormItem>
              )}
            />
            )}

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas u observaciones (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Lesión de jugador, cambio de cancha, etc."
                      {...field}
                    />
                  </FormControl>
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
              <Button
                type="submit"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Resultado
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
