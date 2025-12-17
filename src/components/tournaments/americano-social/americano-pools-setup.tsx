"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Users, Calendar, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PreviewData {
  isValid: boolean
  numPlayers: number
  numPools?: number
  roundsRecommendation?: {
    min: number
    optimal: number
    max: number
  }
  currentRounds?: number
  hasExistingPools?: boolean
  existingPoolsCount?: number
  category: {
    id: string
    name: string
  }
  players?: Array<{
    id: string
    firstName: string
    lastName: string
  }>
  error?: string
}

interface AmericanoPoolsSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  categoryId: string
  onGenerate: (categoryId: string, numberOfRounds: number, force: boolean) => Promise<void>
  categories: Array<{
    id: string
    categoryId: string
    category: {
      id: string
      name: string
    }
  }>
}

export function AmericanoPoolsSetup({
  open,
  onOpenChange,
  tournamentId,
  categoryId: initialCategoryId,
  onGenerate,
  categories
}: AmericanoPoolsSetupProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [selectedRounds, setSelectedRounds] = useState(1)
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId)

  useEffect(() => {
    if (open) {
      // Inicializar con la categoría pasada como prop o la primera disponible
      const categoryToUse = initialCategoryId || categories[0]?.categoryId
      if (categoryToUse) {
        setSelectedCategoryId(categoryToUse)
        loadPreview(categoryToUse)
      }
    }
  }, [open, initialCategoryId])

  useEffect(() => {
    if (open && selectedCategoryId) {
      loadPreview(selectedCategoryId)
    }
  }, [selectedCategoryId])

  const loadPreview = async (categoryId: string) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tournaments/${tournamentId}/americano-social/preview?categoryId=${categoryId}`
      )

      if (!response.ok) {
        throw new Error("Error cargando preview")
      }

      const data: PreviewData = await response.json()
      setPreviewData(data)

      // Establecer rondas recomendadas por defecto
      if (data.roundsRecommendation) {
        setSelectedRounds(data.roundsRecommendation.optimal)
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error cargando preview",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!previewData?.isValid || !selectedCategoryId) return

    try {
      setGenerating(true)
      const force = previewData.hasExistingPools || false
      await onGenerate(selectedCategoryId, selectedRounds, force)
      onOpenChange(false)
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setGenerating(false)
    }
  }

  const getRoundsLabel = () => {
    if (!previewData?.roundsRecommendation) return ""
    const { min, optimal, max } = previewData.roundsRecommendation

    if (selectedRounds === optimal) return "(Recomendado)"
    if (selectedRounds < optimal) return "(Pocas rondas)"
    if (selectedRounds > optimal && selectedRounds <= max) return "(Muchas rondas)"
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Pools - Americano Social</DialogTitle>
          <DialogDescription>
            Configura las rondas y revisa cómo se organizarán los jugadores
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de categoría */}
          {categories.length > 1 && (
            <div className="space-y-2">
              <Label>Seleccionar Categoría</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.categoryId} value={cat.categoryId}>
                      {cat.category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !previewData?.isValid ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {previewData?.error || "No se pueden generar pools"}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Información de la categoría */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Categoría: {previewData.category.name}</CardTitle>
                </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Jugadores:</span>
                    <span className="font-semibold">{previewData.numPlayers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Pools por ronda:</span>
                    <span className="font-semibold">{previewData.numPools}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advertencia si hay pools existentes */}
            {previewData.hasExistingPools && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ya existen {previewData.existingPoolsCount} pools generados. Al continuar, se eliminarán y se crearán nuevos.
                </AlertDescription>
              </Alert>
            )}

            {/* Selector de rondas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Número de Rondas</CardTitle>
                <CardDescription>
                  Cada ronda redistribuye los jugadores en nuevos pools para que jueguen con diferentes personas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Rondas: {selectedRounds}</Label>
                    <Badge variant={selectedRounds === previewData.roundsRecommendation?.optimal ? "default" : "secondary"}>
                      {getRoundsLabel()}
                    </Badge>
                  </div>
                  <Slider
                    value={[selectedRounds]}
                    onValueChange={(value) => setSelectedRounds(value[0])}
                    min={previewData.roundsRecommendation?.min || 1}
                    max={previewData.roundsRecommendation?.max || 10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mín: {previewData.roundsRecommendation?.min}</span>
                    <span>Óptimo: {previewData.roundsRecommendation?.optimal}</span>
                    <span>Máx: {previewData.roundsRecommendation?.max}</span>
                  </div>
                </div>

                {/* Info sobre rondas */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {selectedRounds === 1 && "Una ronda: Cada jugador jugará con 3 personas diferentes"}
                    {selectedRounds > 1 && selectedRounds <= (previewData.roundsRecommendation?.optimal || 2) &&
                      `${selectedRounds} rondas: Cada jugador jugará con ${selectedRounds * 3} personas diferentes (sin repetir)`}
                    {selectedRounds > (previewData.roundsRecommendation?.optimal || 2) &&
                      "Muchas rondas: Puede haber algunas repeticiones entre jugadores"}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Preview de distribución */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista Previa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total de pools:</span>
                      <span className="ml-2 font-semibold">{(previewData.numPools || 0) * selectedRounds}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total de partidos:</span>
                      <span className="ml-2 font-semibold">{(previewData.numPools || 0) * selectedRounds * 3}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Distribución por ronda:</p>
                    <div className="space-y-1">
                      {Array.from({ length: selectedRounds }, (_, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>Ronda {i + 1}:</span>
                          <span className="text-muted-foreground">
                            {previewData.numPools} pools × 3 partidos = {(previewData.numPools || 0) * 3} partidos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de jugadores */}
            {previewData.players && previewData.players.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Jugadores Confirmados ({previewData.players.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {previewData.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span>{player.firstName} {player.lastName}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!previewData?.isValid || generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>Generar Pools</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
