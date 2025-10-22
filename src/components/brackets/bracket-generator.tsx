"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Trophy, AlertCircle, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BracketPreview } from "./bracket-preview"

interface BracketGeneratorProps {
  tournamentId: string
  categoryId: string
  categoryName: string
  teamsCount: number
  tournamentType: string
  onBracketGenerated?: () => void
}

interface SeedAssignment {
  teamId: string
  teamName: string
  categoryId: string
  categoryName: string
  seed: number
  totalPoints: number
  player1: {
    name: string
    points: number
  }
  player2: {
    name: string
    points: number
  }
  hasRanking: boolean
}

export function BracketGenerator({
  tournamentId,
  categoryId,
  categoryName,
  teamsCount,
  tournamentType,
  onBracketGenerated
}: BracketGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAssigningSeeds, setIsAssigningSeeds] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSeedsPreview, setShowSeedsPreview] = useState(false)
  const [seedAssignments, setSeedAssignments] = useState<SeedAssignment[]>([])
  const [existingMatchesInfo, setExistingMatchesInfo] = useState<{
    totalMatches: number
    completedMatches: number
    inProgressMatches: number
    scheduledMatches: number
  } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Calcular estructura del bracket según tipo y cantidad de equipos
  const getBracketStructure = () => {
    switch (tournamentType) {
      case 'SINGLE_ELIMINATION': {
        const rounds = Math.ceil(Math.log2(teamsCount))
        const bracketSize = Math.pow(2, rounds)
        const byes = bracketSize - teamsCount
        return {
          type: 'Eliminación Simple',
          description: `${rounds} rondas hasta la final`,
          details: byes > 0
            ? `${teamsCount} equipos (${byes} bye${byes > 1 ? 's' : ''} en primera ronda)`
            : `${teamsCount} equipos compiten desde la primera ronda`
        }
      }

      case 'DOUBLE_ELIMINATION': {
        const upperRounds = Math.ceil(Math.log2(teamsCount))
        const lowerRounds = (upperRounds * 2) - 1
        return {
          type: 'Doble Eliminación',
          description: 'Upper bracket + Lower bracket + Gran Final',
          details: `${upperRounds + lowerRounds + 1} rondas totales. Los perdedores tienen segunda oportunidad`
        }
      }

      case 'ROUND_ROBIN': {
        const totalMatches = (teamsCount * (teamsCount - 1)) / 2
        return {
          type: 'Round Robin (Todos contra Todos)',
          description: `${totalMatches} partidos en total`,
          details: `Cada equipo juega ${teamsCount - 1} partidos`
        }
      }

      case 'GROUP_STAGE_ELIMINATION': {
        // Usar la misma lógica que calculateOptimalGroupConfiguration (máximo 4 por grupo)
        let numGroups = 2
        let qualified = 4
        let qualifiedPerGroup = 2
        let bestThirdPlace = 0

        if (teamsCount === 8) {
          numGroups = 2
          qualified = 4
          qualifiedPerGroup = 2
        } else if (teamsCount >= 9 && teamsCount <= 11) {
          numGroups = 3
          qualified = 4
          qualifiedPerGroup = 1
          bestThirdPlace = 1
        } else if (teamsCount >= 12 && teamsCount <= 16) {
          numGroups = 4
          qualified = 8
          qualifiedPerGroup = 2
        } else if (teamsCount >= 17 && teamsCount <= 20) {
          numGroups = 5
          qualified = 8
          qualifiedPerGroup = 1
          bestThirdPlace = 3
        } else if (teamsCount >= 21 && teamsCount <= 24) {
          numGroups = 6
          qualified = 8
          qualifiedPerGroup = 1
          bestThirdPlace = 2
        } else if (teamsCount >= 25 && teamsCount <= 32) {
          numGroups = 8
          qualified = 16
          qualifiedPerGroup = 2
        } else if (teamsCount >= 33 && teamsCount <= 40) {
          numGroups = 10
          qualified = 16
          qualifiedPerGroup = 1
          bestThirdPlace = 6
        } else if (teamsCount >= 41 && teamsCount <= 48) {
          numGroups = 12
          qualified = 16
          qualifiedPerGroup = 1
          bestThirdPlace = 4
        } else if (teamsCount >= 49 && teamsCount <= 64) {
          numGroups = 16
          qualified = 32
          qualifiedPerGroup = 2
        } else if (teamsCount > 64) {
          numGroups = Math.ceil(teamsCount / 4)
          qualified = Math.pow(2, Math.floor(Math.log2(numGroups * 2)))
          qualifiedPerGroup = 2
        }

        const eliminationRounds = Math.ceil(Math.log2(qualified))

        // Construir descripción detallada
        let classificationDesc = ''
        if (qualifiedPerGroup === 1 && bestThirdPlace > 0) {
          classificationDesc = `Top 1 de cada grupo + ${bestThirdPlace} mejor${bestThirdPlace > 1 ? 'es' : ''} segundo${bestThirdPlace > 1 ? 's' : ''}`
        } else if (qualifiedPerGroup === 2) {
          classificationDesc = 'Top 2 de cada grupo'
        } else if (qualifiedPerGroup === 1) {
          classificationDesc = 'Primero de cada grupo'
        } else {
          classificationDesc = `Top ${qualifiedPerGroup} de cada grupo`
        }

        return {
          type: 'Fase de Grupos + Eliminación',
          description: `${numGroups} grupos → ${qualified} clasificados → ${eliminationRounds} rondas eliminatorias`,
          details: `${classificationDesc}. Máximo 4 equipos por grupo`
        }
      }

      case 'AMERICANO': {
        const numRounds = Math.min(teamsCount - 1, 10)
        const totalMatches = (teamsCount / 2) * numRounds
        return {
          type: 'Formato Americano',
          description: `${numRounds} rondas con rotación de equipos`,
          details: `${totalMatches} partidos totales. Cada equipo juega contra diferentes oponentes`
        }
      }

      default:
        return {
          type: 'Formato desconocido',
          description: '',
          details: ''
        }
    }
  }

  const bracketInfo = getBracketStructure()

  // Función para asignar seeds automáticamente
  const assignSeeds = async () => {
    setIsAssigningSeeds(true)
    setValidationErrors([])

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/assign-seeds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categoryId
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al asignar seeds")
      }

      // Filtrar solo los assignments de la categoría actual
      const categoryAssignments = data.data.assignments.filter(
        (a: SeedAssignment) => a.categoryId === categoryId
      )

      setSeedAssignments(categoryAssignments)
      setShowSeedsPreview(true)

      toast({
        title: "✅ Seeds calculados",
        description: `${categoryAssignments.length} equipos ordenados por ranking`,
        variant: "success",
      })

    } catch (error) {
      toast({
        title: "❌ Error al calcular seeds",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsAssigningSeeds(false)
    }
  }

  const generateBracket = async (force = false) => {
    setIsGenerating(true)
    setValidationErrors([])

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/generate-bracket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categoryId,
            force
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Código 409: requiere confirmación
        if (response.status === 409 && data.requiresConfirmation) {
          setExistingMatchesInfo(data.details)
          setShowConfirmDialog(true)
          return
        }

        // Otros errores de validación
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details)
        } else {
          throw new Error(data.error || "Error al generar el bracket")
        }
        return
      }

      toast({
        title: "✅ Bracket generado exitosamente",
        description: `Se crearon ${data.data.totalMatches} partidos en ${data.data.totalRounds} rondas`,
        variant: "success",
      })

      // Limpiar errores previos y cerrar diálogo
      setValidationErrors([])
      setShowConfirmDialog(false)
      setExistingMatchesInfo(null)

      // Llamar callback para refrescar componentes
      if (onBracketGenerated) {
        onBracketGenerated()
      }

      // Refrescar la página después de un delay para que se vea el toast
      setTimeout(() => {
        router.refresh()
      }, 500)

    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Iniciar proceso: primero asignar seeds
  const handleGenerate = () => assignSeeds()

  // Confirmar y generar bracket después de ver seeds
  const handleConfirmWithSeeds = () => {
    setShowSeedsPreview(false)
    generateBracket(false)
  }

  const handleConfirmRegenerate = () => {
    setShowConfirmDialog(false)
    generateBracket(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>Generar Bracket</CardTitle>
        </div>
        <CardDescription>
          Genera automáticamente el cuadro de enfrentamientos para esta categoría
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info de la categoría */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Categoría:</span>
                <Badge variant="outline">{categoryName}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Equipos confirmados:</span>
                <Badge variant="secondary">{teamsCount}</Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Estructura del bracket */}
        {teamsCount >= 2 && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    {bracketInfo.type}
                  </span>
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {bracketInfo.description}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  {bracketInfo.details}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Errores de validación */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">No se puede generar el bracket:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Vista previa de configuración (solo para GROUP_STAGE_ELIMINATION) */}
      {tournamentType === "GROUP_STAGE_ELIMINATION" && teamsCount >= 2 && (
        <div className="px-6 pb-6">
          <BracketPreview
            tournamentId={tournamentId}
            categoryId={categoryId}
            teamsCount={teamsCount}
            tournamentType={tournamentType}
          />
        </div>
      )}

      <CardContent className="space-y-4 pt-0">
        {/* Botón de generar */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isAssigningSeeds || teamsCount < 2}
          className="w-full"
          size="lg"
        >
          {isAssigningSeeds ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Calculando seeds...
            </>
          ) : isGenerating ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Generando bracket...
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Generar Bracket
            </>
          )}
        </Button>

        {/* Warning sobre regeneración */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Importante:</strong> Generar el bracket eliminará cualquier
            bracket existente para esta categoría y creará uno nuevo con los
            equipos confirmados.
          </AlertDescription>
        </Alert>

        {/* Mensaje si no hay suficientes equipos */}
        {teamsCount < 2 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Se requieren al menos 2 equipos confirmados para generar el bracket.
              Actualmente hay {teamsCount} equipo(s).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Diálogo de preview de seeds */}
      <AlertDialog open={showSeedsPreview} onOpenChange={setShowSeedsPreview}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Seeds Calculados Automáticamente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-base">
                  Se han asignado seeds a {seedAssignments.length} equipos basándose en la suma de
                  ranking points de ambos jugadores. Revisa el orden antes de confirmar.
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Orden de Seeds:
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {seedAssignments.map((assignment) => (
                      <div
                        key={assignment.teamId}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-primary text-primary-foreground">
                                Seed {assignment.seed}
                              </Badge>
                              <span className="font-medium">{assignment.teamName}</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span>{assignment.player1.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {assignment.player1.points} pts
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{assignment.player2.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {assignment.player2.points} pts
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Total</div>
                            <Badge variant="secondary" className="font-mono">
                              {assignment.totalPoints} pts
                            </Badge>
                            {!assignment.hasRanking && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Sin ranking
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Los equipos sin ranking points se colocan al final del seeding.
                  En caso de empate, se utiliza la fecha de inscripción del equipo.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmWithSeeds}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar y Generar Bracket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación para regeneración */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              ¿Regenerar bracket?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-base">
                  Ya existen partidos en esta categoría. Si continúas, se eliminarán{" "}
                  <strong>todos los partidos existentes</strong> y sus resultados.
                </div>

                {existingMatchesInfo && (
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      Partidos que se eliminarán:
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Total de partidos:</span>
                        <Badge variant="secondary">{existingMatchesInfo.totalMatches}</Badge>
                      </div>
                      {existingMatchesInfo.completedMatches > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-800 dark:text-orange-200">Completados:</span>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {existingMatchesInfo.completedMatches}
                          </Badge>
                        </div>
                      )}
                      {existingMatchesInfo.inProgressMatches > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-800 dark:text-orange-200">En progreso:</span>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                            {existingMatchesInfo.inProgressMatches}
                          </Badge>
                        </div>
                      )}
                      {existingMatchesInfo.scheduledMatches > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-800 dark:text-orange-200">Programados:</span>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {existingMatchesInfo.scheduledMatches}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Esta acción <strong>no se puede deshacer</strong>. Se perderán todos los
                  resultados cargados hasta el momento.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Sí, eliminar y regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
