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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Trophy, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BracketGeneratorProps {
  tournamentId: string
  categories: Array<{
    id: string
    categoryId: string
    category: {
      name: string
    }
    _count?: {
      teams: number
    }
  }>
  onBracketGenerated?: () => void
}

export function BracketGenerator({
  tournamentId,
  categories,
  onBracketGenerated
}: BracketGeneratorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Debes seleccionar una categoría",
        variant: "destructive"
      })
      return
    }

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
            categoryId: selectedCategory
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
        title: "Bracket generado",
        description: `Se crearon ${data.data.totalMatches} partidos en ${data.data.totalRounds} rondas`,
      })

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

  const selectedCategoryData = categories.find(
    c => c.categoryId === selectedCategory
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <CardTitle>Generar Bracket</CardTitle>
        </div>
        <CardDescription>
          Selecciona una categoría para generar automáticamente el cuadro de
          enfrentamientos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.categoryId}>
                  {cat.category.name}
                  {cat._count && ` (${cat._count.teams} equipos)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCategoryData && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Se generará el bracket para{" "}
              <strong>{selectedCategoryData.category.name}</strong>
              {selectedCategoryData._count && (
                <> con {selectedCategoryData._count.teams} equipos confirmados</>
              )}
            </AlertDescription>
          </Alert>
        )}

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

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!selectedCategory || isGenerating}
            className="flex-1"
          >
            {isGenerating ? "Generando..." : "Generar Bracket"}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Importante:</strong> Generar el bracket eliminará cualquier
            bracket existente para esta categoría y creará uno nuevo con los
            equipos confirmados.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
