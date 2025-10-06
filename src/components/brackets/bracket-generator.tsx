"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Trophy, AlertCircle, CheckCircle2, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface BracketGeneratorProps {
  tournamentId: string
  categoryId: string
  categoryName: string
  teamsCount: number
  onBracketGenerated?: () => void
}

export function BracketGenerator({
  tournamentId,
  categoryId,
  categoryName,
  teamsCount,
  onBracketGenerated
}: BracketGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { toast } = useToast()

  const handleGenerate = async () => {
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
            categoryId
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details)
        } else {
          throw new Error(data.error || "Error al generar el bracket")
        }
        return
      }

      toast({
        title: "✓ Bracket generado exitosamente",
        description: `Se crearon ${data.data.totalMatches} partidos en ${data.data.totalRounds} rondas`,
      })

      // Limpiar errores previos
      setValidationErrors([])

      // Llamar callback si existe
      if (onBracketGenerated) {
        onBracketGenerated()
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
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

        {/* Botón de generar */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || teamsCount < 2}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
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
    </Card>
  )
}
