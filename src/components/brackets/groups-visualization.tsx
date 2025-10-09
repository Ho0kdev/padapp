"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, AlertCircle } from "lucide-react"

interface Team {
  id: string
  name?: string | null
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
}

interface TeamStats {
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

interface Zone {
  id: string
  name: string
  teams: Array<{
    team: Team
    position: number | null
  }>
  standings?: TeamStats[]
}

interface GroupsVisualizationProps {
  tournamentId: string
  categoryId: string
  refreshTrigger?: number
}

export function GroupsVisualization({
  tournamentId,
  categoryId,
  refreshTrigger
}: GroupsVisualizationProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      console.log('Groups data:', data)

      // Filtrar duplicados por ID
      const uniqueZones = Array.from(
        new Map(data.zones?.map((zone: Zone) => [zone.id, zone])).values()
      ) as Zone[]

      setZones(uniqueZones)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [tournamentId, categoryId, refreshTrigger])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
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

  if (zones.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se han creado grupos para esta categoría aún. Genera el bracket para crear los grupos.
        </AlertDescription>
      </Alert>
    )
  }

  const getTeamDisplay = (team: Team): string => {
    if (team.name) return team.name

    return `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Grupos - Fase de Grupos
          </h3>
        </div>
        <Badge variant="outline">
          {zones.length} Grupo{zones.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                {zone.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zone.standings && zone.standings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-8">#</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Equipo</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-12">PJ</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-12">PG</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-16">Sets</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-12">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.standings.map((stats, index) => (
                        <tr
                          key={stats.teamId}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-sm font-medium truncate">
                              {stats.teamName}
                            </p>
                          </td>
                          <td className="text-center py-2 px-2 text-sm">
                            {stats.matchesPlayed}
                          </td>
                          <td className="text-center py-2 px-2 text-sm">
                            {stats.matchesWon}
                          </td>
                          <td className="text-center py-2 px-2 text-sm text-muted-foreground">
                            {stats.setsWon}-{stats.setsLost}
                          </td>
                          <td className="text-center py-2 px-2 text-sm font-semibold">
                            {stats.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  {zone.teams
                    .sort((a, b) => {
                      if (a.position && b.position) {
                        return a.position - b.position
                      }
                      return 0
                    })
                    .map(({ team, position }, index) => (
                      <div
                        key={team.id}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                          {position || index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getTeamDisplay(team)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {zone.teams.length} equipo{zone.teams.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
