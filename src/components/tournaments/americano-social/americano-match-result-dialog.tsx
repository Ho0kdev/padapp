"use client"

import { useState } from "react"
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
import { Loader2, Plus, Trash2 } from "lucide-react"

const setSchema = z.object({
  teamAScore: z.number().min(0).max(7),
  teamBScore: z.number().min(0).max(7)
})

const resultSchema = z.object({
  sets: z.array(setSchema).min(1).max(5)
})

type ResultFormData = z.infer<typeof resultSchema>

interface AmericanoMatchResultDialogProps {
  match: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AmericanoMatchResultDialog({
  match,
  open,
  onOpenChange,
  onSuccess
}: AmericanoMatchResultDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      sets: [
        { teamAScore: 0, teamBScore: 0 }
      ]
    }
  })

  const sets = form.watch("sets")

  const addSet = () => {
    const currentSets = form.getValues("sets")
    if (currentSets.length < 5) {
      form.setValue("sets", [...currentSets, { teamAScore: 0, teamBScore: 0 }])
    }
  }

  const removeSet = (index: number) => {
    const currentSets = form.getValues("sets")
    if (currentSets.length > 1) {
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
      teamAScore += set.teamAScore
      teamBScore += set.teamBScore
    })

    return { teamAScore, teamBScore }
  }

  const onSubmit = async (data: ResultFormData) => {
    try {
      setLoading(true)

      const { teamAScore, teamBScore } = calculateTotalScore()

      const response = await fetch(
        `/api/americano-social/matches/${match.id}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAScore,
            teamBScore,
            sets: data.sets
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error cargando resultado")
      }

      toast({
        title: "¡Resultado cargado!",
        description: "El resultado se ha guardado exitosamente"
      })

      form.reset()
      onSuccess()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
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

        <div className="space-y-4">
          {/* Equipos */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Equipo A</p>
              <p className="font-semibold">
                {match.player1.firstName} + {match.player2.firstName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Equipo B</p>
              <p className="font-semibold">
                {match.player3.firstName} + {match.player4.firstName}
              </p>
            </div>
          </div>

          {/* Score Total */}
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Score Total (Games)</p>
            <p className="text-4xl font-bold">
              {teamAScore} - {teamBScore}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Sets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Sets</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSet}
                    disabled={sets.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Set
                  </Button>
                </div>

                {sets.map((_, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`sets.${index}.teamAScore`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipo A</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={7}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`sets.${index}.teamBScore`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipo B</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={7}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {sets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSet(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
