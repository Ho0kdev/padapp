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
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"

// Función para crear schema dinámico basado en configuración del torneo
const createSetSchema = (gamesToWinSet: number, tiebreakAt: number) => {
  const maxGames = gamesToWinSet + 1 // Si gamesToWinSet=6, max puede ser 7 (7-5)

  return z.object({
    teamAScore: z.union([
      z.number({ message: "Debe ingresar los games del equipo A" }).int().min(0, "No puede ser negativo").max(maxGames, `Máximo ${maxGames} games por set`),
      z.literal(undefined),
      z.literal(null)
    ]).transform(val => {
      if (val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      return val
    }),
    teamBScore: z.union([
      z.number({ message: "Debe ingresar los games del equipo B" }).int().min(0, "No puede ser negativo").max(maxGames, `Máximo ${maxGames} games por set`),
      z.literal(undefined),
      z.literal(null)
    ]).transform(val => {
      if (val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      return val
    }),
    teamATiebreakPoints: z.union([
      z.number().int().min(0).max(20),
      z.literal(undefined),
      z.literal(null)
    ]).transform(val => {
      if (val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      return val
    }).optional(),
    teamBTiebreakPoints: z.union([
      z.number().int().min(0).max(20),
      z.literal(undefined),
      z.literal(null)
    ]).transform(val => {
      if (val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      return val
    }).optional(),
  }).superRefine((data, ctx) => {
    // Si algún valor es undefined o no es un número válido, no validar (set incompleto)
    if (data.teamAScore === undefined ||
        data.teamBScore === undefined ||
        typeof data.teamAScore !== 'number' ||
        typeof data.teamBScore !== 'number' ||
        isNaN(data.teamAScore) ||
        isNaN(data.teamBScore)) {
      return
    }

    const maxGamesInSet = Math.max(data.teamAScore, data.teamBScore)
    const minGamesInSet = Math.min(data.teamAScore, data.teamBScore)

    // Si el máximo de games es mayor a lo permitido
    if (maxGamesInSet > maxGames) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Máximo ${maxGames} games por set`,
        path: maxGamesInSet === data.teamAScore ? ["teamAScore"] : ["teamBScore"]
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
          path: ["teamAScore"]
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

      // O gamesToWinSet+1 vs gamesToWinSet con tiebreak (ej: 7-6 con tiebreak)
      if (minGamesInSet === gamesToWinSet) {
        // Debe haber puntos de tiebreak
        const hasTiebreak = (data.teamATiebreakPoints !== undefined && data.teamATiebreakPoints >= 0) ||
                           (data.teamBTiebreakPoints !== undefined && data.teamBTiebreakPoints >= 0)
        if (!hasTiebreak) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${gamesToWinSet + 1}-${gamesToWinSet} requiere puntos de tiebreak`,
            path: ["teamATiebreakPoints"]
          })
        }
        return
      }

      // Cualquier otro caso es inválido
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${maxGamesInSet}-${minGamesInSet} inválido. Solo se permite ${gamesToWinSet + 1}-${gamesToWinSet - 1} o ${gamesToWinSet + 1}-${gamesToWinSet} con tiebreak`,
        path: ["teamAScore"]
      })
      return
    }

    // Si llegaron a tiebreakAt-tiebreakAt (ej: 6-6), debe haber tiebreak
    if (data.teamAScore === tiebreakAt && data.teamBScore === tiebreakAt) {
      const hasTiebreak = (data.teamATiebreakPoints !== undefined && data.teamATiebreakPoints >= 0) ||
                         (data.teamBTiebreakPoints !== undefined && data.teamBTiebreakPoints >= 0)
      if (!hasTiebreak) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${tiebreakAt}-${tiebreakAt} requiere puntos de tiebreak`,
          path: ["teamATiebreakPoints"]
        })
      }
      return
    }

    // Validar que el ganador llegó al mínimo de games necesarios
    if (maxGamesInSet < gamesToWinSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Para ganar un set se debe llegar a ${gamesToWinSet} games (ej: ${gamesToWinSet}-0, ${gamesToWinSet}-4)`,
        path: ["teamAScore"]
      })
      return
    }

    // Validar diferencia mínima de 2 games
    const diff = Math.abs(data.teamAScore - data.teamBScore)
    if (diff < 2 && maxGamesInSet !== gamesToWinSet + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe haber diferencia de al menos 2 games para ganar el set`,
        path: ["teamAScore"]
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
  }).superRefine((data, ctx) => {
    // Validar que uno de los equipos haya ganado setsToWin sets
    const teamASets = data.sets.filter((s: any) => {
      if (typeof s.teamAScore !== 'number' || typeof s.teamBScore !== 'number') return false
      if (isNaN(s.teamAScore) || isNaN(s.teamBScore)) return false
      if (s.teamAScore > s.teamBScore) return true
      if (s.teamAScore === s.teamBScore && s.teamATiebreakPoints && s.teamBTiebreakPoints) {
        return s.teamATiebreakPoints > s.teamBTiebreakPoints
      }
      return false
    }).length

    const teamBSets = data.sets.filter((s: any) => {
      if (typeof s.teamAScore !== 'number' || typeof s.teamBScore !== 'number') return false
      if (isNaN(s.teamAScore) || isNaN(s.teamBScore)) return false
      if (s.teamBScore > s.teamAScore) return true
      if (s.teamAScore === s.teamBScore && s.teamATiebreakPoints && s.teamBTiebreakPoints) {
        return s.teamBTiebreakPoints > s.teamATiebreakPoints
      }
      return false
    }).length

    // Uno de los equipos debe tener setsToWin sets ganados
    if (teamASets < setsToWin && teamBSets < setsToWin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Un equipo debe ganar al menos ${setsToWin} sets. Actualmente: Equipo A: ${teamASets} sets, Equipo B: ${teamBSets} sets`,
        path: ["sets"]
      })
    }
  })
}

type ResultFormData = any // z.infer<typeof resultSchema> - defined dynamically in component

interface AmericanoMatchResultDialogProps {
  match: any
  tournament?: {
    setsToWin: number
    gamesToWinSet: number
    tiebreakAt: number
    goldenPoint: boolean
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AmericanoMatchResultDialog({
  match,
  tournament: tournamentProp,
  open,
  onOpenChange,
  onSuccess
}: AmericanoMatchResultDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Crear schema dinámico basado en configuración del torneo
  const tournament = tournamentProp || match.pool?.tournament
  const setsToWin = tournament?.setsToWin || 2

  const resultSchema = createResultSchema(
    setsToWin,
    tournament?.gamesToWinSet || 6,
    tournament?.tiebreakAt || 6
  )

  // Crear defaultValues con el número correcto de sets
  const defaultSets = Array.from({ length: setsToWin }, () => ({
    teamAScore: undefined,
    teamBScore: undefined,
    teamATiebreakPoints: undefined,
    teamBTiebreakPoints: undefined
  }))

  const form = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      sets: defaultSets
    }
  })

  const sets = form.watch("sets")

  const addSet = () => {
    const currentSets = form.getValues("sets")
    const maxSets = (setsToWin * 2) - 1
    if (currentSets.length < maxSets) {
      form.setValue("sets", [...currentSets, { teamAScore: undefined, teamBScore: undefined, teamATiebreakPoints: undefined, teamBTiebreakPoints: undefined }])
    }
  }

  const removeSet = (index: number) => {
    const currentSets = form.getValues("sets")
    if (currentSets.length > setsToWin) {
      form.setValue(
        "sets",
        currentSets.filter((_, i) => i !== index)
      )
    }
  }

  const calculateTotalScore = () => {
    const sets = form.getValues("sets")
    let teamAScore = 0
    let teamBScore = 0

    sets.forEach((set) => {
      if (typeof set.teamAScore === 'number' && !isNaN(set.teamAScore)) {
        teamAScore += set.teamAScore
      }
      if (typeof set.teamBScore === 'number' && !isNaN(set.teamBScore)) {
        teamBScore += set.teamBScore
      }
    })

    return { teamAScore, teamBScore }
  }

  // Calcular ganador actual basado en sets (memoizado)
  const winner = useMemo(() => {
    const teamASets = sets.filter((s: any) => {
      if (typeof s.teamAScore !== 'number' || typeof s.teamBScore !== 'number') return false
      if (isNaN(s.teamAScore) || isNaN(s.teamBScore)) return false
      if (s.teamAScore > s.teamBScore) return true
      if (s.teamAScore === s.teamBScore && s.teamATiebreakPoints && s.teamBTiebreakPoints) {
        return s.teamATiebreakPoints > s.teamBTiebreakPoints
      }
      return false
    }).length

    const teamBSets = sets.filter((s: any) => {
      if (typeof s.teamAScore !== 'number' || typeof s.teamBScore !== 'number') return false
      if (isNaN(s.teamAScore) || isNaN(s.teamBScore)) return false
      if (s.teamBScore > s.teamAScore) return true
      if (s.teamAScore === s.teamBScore && s.teamATiebreakPoints && s.teamBTiebreakPoints) {
        return s.teamBTiebreakPoints > s.teamATiebreakPoints
      }
      return false
    }).length

    if (teamASets > teamBSets) return "teamA"
    if (teamBSets > teamASets) return "teamB"
    return null
  }, [sets])

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

        if (setError?.teamAScore?.message) {
          errorMessages.push(`Set ${setNum} - Equipo A: ${setError.teamAScore.message}`)
        }
        if (setError?.teamBScore?.message) {
          errorMessages.push(`Set ${setNum} - Equipo B: ${setError.teamBScore.message}`)
        }
        if (setError?.teamATiebreakPoints?.message) {
          errorMessages.push(`Set ${setNum} - Tiebreak Equipo A: ${setError.teamATiebreakPoints.message}`)
        }
        if (setError?.teamBTiebreakPoints?.message) {
          errorMessages.push(`Set ${setNum} - Tiebreak Equipo B: ${setError.teamBTiebreakPoints.message}`)
        }
        if (setError?.message) {
          errorMessages.push(`Set ${setNum}: ${setError.message}`)
        }
      })
    }

    const errorMessage = errorMessages.length > 0
      ? errorMessages.join('\n')
      : "Por favor revisa los datos ingresados"

    toast({
      title: "❌ Error de validación",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const onSubmit = async (data: ResultFormData) => {
    try {
      setLoading(true)

      // Filtrar sets completos (que tengan valores numéricos válidos)
      const completeSets = data.sets.filter((s: any) =>
        typeof s.teamAScore === 'number' &&
        typeof s.teamBScore === 'number' &&
        !isNaN(s.teamAScore) &&
        !isNaN(s.teamBScore)
      )

      const { teamAScore, teamBScore } = calculateTotalScore()

      const response = await fetch(
        `/api/americano-social/matches/${match.id}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAScore,
            teamBScore,
            sets: completeSets
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error cargando resultado")
      }

      toast({
        title: "✅ ¡Resultado cargado!",
        description: "El resultado se ha guardado exitosamente",
        variant: "success",
      })

      form.reset()
      onSuccess()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error cargando resultado",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const { teamAScore, teamBScore } = calculateTotalScore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar Resultado - Ronda {match.roundNumber}</DialogTitle>
          <DialogDescription>
            Ingresa el resultado de cada set. Los puntos se calculan por games ganados.
          </DialogDescription>
        </DialogHeader>

        {/* Info de equipos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex-1">
              <p className="text-sm font-medium">Equipo A</p>
              <p className="text-xs text-muted-foreground">
                {match.player1.firstName} {match.player1.lastName} + {match.player2.firstName} {match.player2.lastName}
              </p>
            </div>
            {winner === "teamA" && (
              <div className="text-xs font-semibold text-green-600">Ganador</div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex-1">
              <p className="text-sm font-medium">Equipo B</p>
              <p className="text-xs text-muted-foreground">
                {match.player3.firstName} {match.player3.lastName} + {match.player4.firstName} {match.player4.lastName}
              </p>
            </div>
            {winner === "teamB" && (
              <div className="text-xs font-semibold text-green-600">Ganador</div>
            )}
          </div>
        </div>

        {/* Info de configuración del torneo */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Configuración:</strong> Al mejor de {setsToWin} {setsToWin === 1 ? 'set' : 'sets'} •
            {tournament?.gamesToWinSet ?? 6} games por set •
            Tiebreak a {tournament?.tiebreakAt ?? 6}-{tournament?.tiebreakAt ?? 6}
            {tournament?.goldenPoint && " • Golden Point activado"}
          </AlertDescription>
        </Alert>

        {/* Score Total */}
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Score Total (Games)</p>
          <p className="text-4xl font-bold">
            {teamAScore} - {teamBScore}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const isValid = await form.trigger()

            if (isValid) {
              const values = form.getValues()
              await onSubmit(values)
            } else {
              const errors = form.formState.errors
              onSubmitError(errors)
            }
          }} className="space-y-6">
            {/* Sets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Sets jugados</FormLabel>
                {setsToWin > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSet}
                    disabled={sets.length >= ((setsToWin * 2) - 1)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Set
                  </Button>
                )}
              </div>

              {/* Error general de sets (solo después de submit) */}
              {form.formState.isSubmitted && form.formState.errors.sets?.message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {String(form.formState.errors.sets.message)}
                  </AlertDescription>
                </Alert>
              )}

              {sets.map((_, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Set {index + 1}</h4>
                        {sets.length > setsToWin && (
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
                        {/* Team A Games */}
                        <FormField
                          control={form.control}
                          name={`sets.${index}.teamAScore`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Equipo A - Games</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={(tournament?.gamesToWinSet ?? 6) + 1}
                                  placeholder=""
                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === "") {
                                      field.onChange(undefined)
                                    } else {
                                      const num = parseInt(value)
                                      field.onChange(isNaN(num) ? undefined : num)
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Team B Games */}
                        <FormField
                          control={form.control}
                          name={`sets.${index}.teamBScore`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Equipo B - Games</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={(tournament?.gamesToWinSet ?? 6) + 1}
                                  placeholder=""
                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === "") {
                                      field.onChange(undefined)
                                    } else {
                                      const num = parseInt(value)
                                      field.onChange(isNaN(num) ? undefined : num)
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Tiebreak (mostrar cuando corresponda según configuración) */}
                      {(() => {
                        const tiebreakAt = tournament?.tiebreakAt ?? 6
                        const gamesToWin = tournament?.gamesToWinSet ?? 6
                        const tA = sets[index]?.teamAScore
                        const tB = sets[index]?.teamBScore

                        // Solo chequear si ambos valores son números válidos
                        if (typeof tA !== 'number' || typeof tB !== 'number' || isNaN(tA) || isNaN(tB)) {
                          return false
                        }

                        // Mostrar tiebreak si:
                        // 1. Están empatados en tiebreakAt (ej: 6-6)
                        // 2. Uno tiene 7 y el otro 6 (ej: 7-6 o 6-7) cuando gamesToWin es 6
                        const showTiebreak = (tA === tiebreakAt && tB === tiebreakAt) ||
                                            (tA === (gamesToWin + 1) && tB === gamesToWin) ||
                                            (tB === (gamesToWin + 1) && tA === gamesToWin)

                        return showTiebreak
                      })() ? (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`sets.${index}.teamATiebreakPoints`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tiebreak - Equipo A</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="Pts"
                                    value={field.value === undefined || field.value === null ? "" : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === "") {
                                        field.onChange(undefined)
                                      } else {
                                        const num = parseInt(value)
                                        field.onChange(isNaN(num) ? undefined : num)
                                      }
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`sets.${index}.teamBTiebreakPoints`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tiebreak - Equipo B</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="Pts"
                                    value={field.value === undefined || field.value === null ? "" : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === "") {
                                        field.onChange(undefined)
                                      } else {
                                        const num = parseInt(value)
                                        field.onChange(isNaN(num) ? undefined : num)
                                      }
                                    }}
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
                    {String(form.formState.errors.sets.root.message)}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
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
                    Guardando...
                  </>
                ) : (
                  "Guardar Resultado"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
