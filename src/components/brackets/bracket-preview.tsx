"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Info, Users, Trophy, Target } from "lucide-react"

interface BracketPreviewProps {
  tournamentId: string
  categoryId: string
  teamsCount: number
  tournamentType: string
}

interface GroupConfiguration {
  numGroups: number
  groupSizes: number[]
  qualifiedPerGroup: number
  bestThirdPlace: number
  totalClassified: number
  eliminationRounds: number
}

interface PreviewData {
  tournamentType: string
  categoryName: string
  teamsCount: number
  configuration: GroupConfiguration | null
}

export function BracketPreview({
  tournamentId,
  categoryId,
  teamsCount,
  tournamentType
}: BracketPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (teamsCount < 2) {
      setLoading(false)
      return
    }

    fetchPreview()
  }, [tournamentId, categoryId, teamsCount])

  const fetchPreview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/tournaments/${tournamentId}/preview-bracket?categoryId=${categoryId}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al obtener preview")
      }

      const data = await response.json()
      setPreview(data)
    } catch (err) {
      console.error("Error fetching preview:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // No mostrar preview para formatos que no sean GROUP_STAGE_ELIMINATION
  if (tournamentType !== "GROUP_STAGE_ELIMINATION") {
    return null
  }

  if (teamsCount < 2) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Vista Previa de Configuración
          </CardTitle>
          <CardDescription>
            Calculando configuración óptima de grupos...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!preview || !preview.configuration) {
    return null
  }

  const config = preview.configuration

  // Crear descripción de clasificación
  let classificationDesc = ""
  if (config.qualifiedPerGroup === 2 && config.bestThirdPlace === 0) {
    classificationDesc = "Los 2 primeros de cada grupo clasifican"
  } else if (config.qualifiedPerGroup === 1 && config.bestThirdPlace > 0) {
    classificationDesc = `El 1° de cada grupo + los ${config.bestThirdPlace} mejores ${config.bestThirdPlace === 1 ? "segundo" : "segundos"} clasifican`
  } else if (config.qualifiedPerGroup === 1 && config.bestThirdPlace === 0) {
    classificationDesc = "Solo el 1° de cada grupo clasifica"
  } else {
    classificationDesc = `Los ${config.qualifiedPerGroup} primeros de cada grupo clasifican`
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Vista Previa de Configuración
          </CardTitle>
        </div>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Esta es la configuración óptima que se generará para {preview.teamsCount} equipos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuración de Grupos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            <Users className="h-4 w-4" />
            Fase de Grupos
          </div>
          <Alert className="bg-white dark:bg-blue-900/50 border-blue-200 dark:border-blue-700">
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Número de grupos:
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800">
                    {config.numGroups} grupos
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Tamaño de grupos:
                  </span>
                  <div className="flex gap-1">
                    {Array.from(new Set(config.groupSizes)).map((size, idx) => {
                      const count = config.groupSizes.filter(s => s === size).length
                      return (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {count} grupo{count > 1 ? "s" : ""} de {size}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Reglas de Clasificación */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            <Target className="h-4 w-4" />
            Reglas de Clasificación
          </div>
          <Alert className="bg-white dark:bg-blue-900/50 border-blue-200 dark:border-blue-700">
            <AlertDescription>
              <div className="space-y-2">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {classificationDesc}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Total clasificados:
                  </span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {config.totalClassified} equipos
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Fase Eliminatoria */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            <Trophy className="h-4 w-4" />
            Fase Eliminatoria
          </div>
          <Alert className="bg-white dark:bg-blue-900/50 border-blue-200 dark:border-blue-700">
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    {config.eliminationRounds === 1
                      ? "Final directa"
                      : config.eliminationRounds === 2
                      ? "Semifinales y Final"
                      : config.eliminationRounds === 3
                      ? "Cuartos, Semifinales y Final"
                      : config.eliminationRounds === 4
                      ? "8vos, Cuartos, Semifinales y Final"
                      : `${config.eliminationRounds} rondas eliminatorias`}
                  </span>
                  <Badge variant="outline">
                    {config.eliminationRounds} {config.eliminationRounds === 1 ? "ronda" : "rondas"}
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Nota informativa */}
        <Alert className="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            Esta configuración garantiza que el número de clasificados sea una potencia de 2,
            permitiendo una fase eliminatoria balanceada. Máximo 4 equipos por grupo.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
