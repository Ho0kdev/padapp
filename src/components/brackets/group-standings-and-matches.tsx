"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  AlertCircle,
  Calendar,
  MapPin,
  Edit,
  Trophy,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MatchResultDialog } from "@/components/matches/match-result-dialog"
import { useAuth } from "@/hooks/use-auth"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Team {
  id: string
  name?: string | null
  player1: {
    firstName: string
    lastName: string
  }
  player2: {
    firstName: string
    lastName: string
  }
}

interface Match {
  id: string
  roundNumber: number | null
  matchNumber: number | null
  phaseType: string
  status: string
  team1?: Team | null
  team2?: Team | null
  winnerTeam?: {
    id: string
  } | null
  team1SetsWon: number
  team2SetsWon: number
  scheduledAt?: Date | null
  court?: {
    name: string
    club: {
      name: string
    }
  } | null
  tournament?: {
    id: string
    name: string
    setsToWin: number
    gamesToWinSet: number
    tiebreakAt: number
    goldenPoint: boolean
  } | null
  sets?: Array<{
    setNumber: number
    team1Games: number
    team2Games: number
  }>
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
    team: {
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
    position: number | null
  }>
  standings?: TeamStats[]
  matches?: Match[]
}

interface GroupStandingsAndMatchesProps {
  tournamentId: string
  categoryId: string
  refreshTrigger?: number
  selectedZoneId?: string
}

export function GroupStandingsAndMatches({
  tournamentId,
  categoryId,
  refreshTrigger,
  selectedZoneId
}: GroupStandingsAndMatchesProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const { isAdminOrClubAdmin, isReferee } = useAuth()

  const fetchGroupsAndMatches = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch groups with standings
      const groupsResponse = await fetch(
        `/api/tournaments/${tournamentId}/groups?categoryId=${categoryId}`
      )

      if (!groupsResponse.ok) {
        throw new Error("Error al cargar los grupos")
      }

      const groupsData = await groupsResponse.json()

      // Fetch all matches
      const matchesResponse = await fetch(
        `/api/tournaments/${tournamentId}/bracket?categoryId=${categoryId}`
      )

      if (!matchesResponse.ok) {
        throw new Error("Error al cargar los partidos")
      }

      const matchesData = await matchesResponse.json()

      // Filter only group stage matches
      const groupMatches = matchesData.matches.filter(
        (m: Match) => m.phaseType === 'GROUP_STAGE'
      )

      // Organize matches by zone
      const zonesWithMatches = groupsData.zones.map((zone: Zone) => {
        const zoneTeamIds = new Set(zone.teams.map(t => t.team.id))
        const zoneMatches = groupMatches.filter(
          (m: Match) =>
            m.team1?.id &&
            m.team2?.id &&
            zoneTeamIds.has(m.team1.id) &&
            zoneTeamIds.has(m.team2.id)
        )

        return {
          ...zone,
          matches: zoneMatches
        }
      })

      // Filter duplicates by ID
      const uniqueZones = Array.from(
        new Map(zonesWithMatches.map((zone: Zone) => [zone.id, zone])).values()
      ) as Zone[]

      setZones(uniqueZones)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupsAndMatches()
  }, [tournamentId, categoryId, refreshTrigger])

  const canManageMatch = () => {
    return isAdminOrClubAdmin || isReferee
  }

  const handleLoadResult = (match: Match) => {
    setSelectedMatch(match)
    setResultDialogOpen(true)
  }

  const handleResultSuccess = () => {
    fetchGroupsAndMatches()
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      WALKOVER: "bg-purple-100 text-purple-800 border-purple-200"
    }

    const labels: Record<string, string> = {
      SCHEDULED: "Programado",
      IN_PROGRESS: "En Progreso",
      COMPLETED: "Completado",
      CANCELLED: "Cancelado",
      WALKOVER: "Walkover"
    }

    return (
      <Badge variant="outline" className={`text-xs ${styles[status] || styles.SCHEDULED}`}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getTeamDisplay = (team?: Team | null): string => {
    if (!team) return "Por definir"
    if (team.name) return team.name
    return `${team.player1.firstName} ${team.player1.lastName} / ${team.player2.firstName} ${team.player2.lastName}`
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
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

  // Filtrar zonas si hay una seleccionada
  const displayZones = selectedZoneId
    ? zones.filter(zone => zone.id === selectedZoneId)
    : zones

  return (
    <div className="space-y-8">
      {!selectedZoneId && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Clasificación - Fase de Grupos
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {zones.length} Grupo{zones.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGroupsAndMatches}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      )}

      {displayZones.map((zone) => (
        <Card key={zone.id}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                {zone.name}
              </CardTitle>
              <Badge variant="secondary">
                {zone.teams.length} equipos • {zone.matches?.length || 0} partidos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Standings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Clasificación
                </h4>
                {zone.standings && zone.standings.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-8">#</th>
                          <th className="text-left py-2 px-2 font-semibold text-muted-foreground min-w-[120px]">Equipo</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Puntos">PTS</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Partidos Jugados">PJ</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Partidos Ganados">PG</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Partidos Perdidos">PP</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Sets a Favor">SF</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Sets en Contra">SC</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Diferencia de Sets">DS</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Games a Favor">GF</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Games en Contra">GC</th>
                          <th className="text-center py-2 px-1 font-semibold text-muted-foreground w-10" title="Diferencia de Games">DG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zone.standings.map((stats, index) => {
                          const setsDiff = stats.setsWon - stats.setsLost
                          const gamesDiff = stats.gamesWon - stats.gamesLost
                          return (
                            <tr
                              key={stats.teamId}
                              className={cn(
                                "border-b last:border-0 transition-colors",
                                index < 2 ? "bg-green-50/50 dark:bg-green-950/20" : "hover:bg-muted/50"
                              )}
                            >
                              <td className="py-2 px-2">
                                <div className={cn(
                                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                                  index < 2
                                    ? "bg-green-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <p className="text-xs font-medium leading-tight">
                                  {stats.teamName}
                                </p>
                              </td>
                              <td className="text-center py-2 px-1 font-bold text-primary">
                                {stats.points}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.matchesPlayed}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.matchesWon}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.matchesLost}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.setsWon}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.setsLost}
                              </td>
                              <td className={cn(
                                "text-center py-2 px-1 font-semibold",
                                setsDiff > 0 ? "text-green-600" : setsDiff < 0 ? "text-red-600" : ""
                              )}>
                                {setsDiff > 0 ? "+" : ""}{setsDiff}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.gamesWon}
                              </td>
                              <td className="text-center py-2 px-1">
                                {stats.gamesLost}
                              </td>
                              <td className={cn(
                                "text-center py-2 px-1 font-semibold",
                                gamesDiff > 0 ? "text-green-600" : gamesDiff < 0 ? "text-red-600" : ""
                              )}>
                                {gamesDiff > 0 ? "+" : ""}{gamesDiff}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay estadísticas disponibles. Los partidos deben jugarse primero.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Right: Matches */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Partidos
                </h4>
                {zone.matches && zone.matches.length > 0 ? (
                  <div className="space-y-3">
                    {zone.matches
                      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          getTeamDisplay={getTeamDisplay}
                          getStatusBadge={getStatusBadge}
                          canManage={canManageMatch()}
                          onLoadResult={() => handleLoadResult(match)}
                        />
                      ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay partidos programados para este grupo.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedMatch && (
        <MatchResultDialog
          match={selectedMatch as any}
          open={resultDialogOpen}
          onOpenChange={setResultDialogOpen}
          onSuccess={handleResultSuccess}
        />
      )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  getTeamDisplay: (team?: Team | null) => string
  getStatusBadge: (status: string) => React.ReactNode
  canManage: boolean
  onLoadResult: () => void
}

function MatchCard({
  match,
  getTeamDisplay,
  getStatusBadge,
  canManage,
  onLoadResult
}: MatchCardProps) {
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Partido {match.matchNumber}
            </span>
            <div className="flex items-center gap-2">
              {getStatusBadge(match.status)}
              {canManage && match.status !== "COMPLETED" && match.status !== "WALKOVER" && match.team1 && match.team2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadResult}
                  title="Cargar resultado"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] divide-x">
              {/* Team Names Column */}
              <div className="divide-y">
                <div
                  className={cn(
                    "p-2 text-sm",
                    team1Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  {getTeamDisplay(match.team1)}
                </div>
                <div
                  className={cn(
                    "p-2 text-sm",
                    team2Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  {getTeamDisplay(match.team2)}
                </div>
              </div>

              {/* Sets/Games Columns */}
              {isCompleted && match.sets && match.sets.length > 0 && (
                <div className="flex divide-x">
                  {match.sets.map((set) => (
                    <div key={set.setNumber} className="divide-y min-w-[40px]">
                      <div
                        className={cn(
                          "p-2 text-center font-mono text-sm",
                          set.team1Games > set.team2Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.team1Games}
                      </div>
                      <div
                        className={cn(
                          "p-2 text-center font-mono text-sm",
                          set.team2Games > set.team1Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.team2Games}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(match.scheduledAt || match.court) && (
            <div className="pt-2 space-y-1 border-t">
              {match.scheduledAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(match.scheduledAt), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
              )}

              {match.court && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {match.court.name} - {match.court.club.name}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
