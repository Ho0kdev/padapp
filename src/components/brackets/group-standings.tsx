"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, RefreshCw, AlertCircle, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TeamStanding {
  teamId: string
  teamName: string
  matchesPlayed: number
  matchesWon: number
  matchesLost: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  points: number
}

interface Group {
  id: string
  name: string
  standings: TeamStanding[]
}

interface GroupStandingsProps {
  tournamentId: string
  categoryId: string
  canManage: boolean
  onClassify?: () => void
}

export function GroupStandings({
  tournamentId,
  categoryId,
  canManage,
  onClassify
}: GroupStandingsProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClassifying, setIsClassifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchGroups = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/groups?categoryId=${categoryId}`
      )

      if (!response.ok) {
        throw new Error("Error al cargar los grupos")
      }

      const data = await response.json()
      setGroups(data.groups)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClassify = async () => {
    setIsClassifying(true)

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/classify`,
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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al clasificar equipos")
      }

      toast({
        title: "Clasificación completada",
        description: "Los equipos han sido asignados a la fase eliminatoria",
      })

      if (onClassify) {
        onClassify()
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsClassifying(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [tournamentId, categoryId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (groups.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay grupos creados para esta categoría
        </AlertDescription>
      </Alert>
    )
  }

  // Verificar si todos los grupos están completos
  const allGroupsComplete = groups.every(g =>
    g.standings.every(s => s.matchesPlayed > 0)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Fase de Grupos</h3>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchGroups}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>

          {canManage && allGroupsComplete && (
            <Button
              onClick={handleClassify}
              disabled={isClassifying}
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              {isClassifying ? "Clasificando..." : "Clasificar a Eliminatorias"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-base">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center w-12">PJ</TableHead>
                    <TableHead className="text-center w-12">PG</TableHead>
                    <TableHead className="text-center w-12">PP</TableHead>
                    <TableHead className="text-center w-16">Sets</TableHead>
                    <TableHead className="text-center w-12">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.standings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Sin resultados aún
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.standings.map((team, index) => {
                      const setDiff = team.setsWon - team.setsLost
                      const isClassified = index < 2 // Top 2 clasifican

                      return (
                        <TableRow key={team.teamId} className={isClassified ? "bg-green-50 dark:bg-green-950" : ""}>
                          <TableCell className="font-medium">
                            {index + 1}
                            {isClassified && (
                              <Badge variant="default" className="ml-1 text-xs bg-green-100 text-green-800">
                                ✓
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {team.teamName}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {team.matchesPlayed}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {team.matchesWon}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {team.matchesLost}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {team.setsWon}-{team.setsLost}
                            <span className={setDiff >= 0 ? "text-green-600" : "text-red-600"}>
                              {" "}({setDiff >= 0 ? "+" : ""}{setDiff})
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm font-bold">
                            {team.points}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {!allGroupsComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Completa todos los partidos de la fase de grupos para poder clasificar
            equipos a la fase eliminatoria.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
