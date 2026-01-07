"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Users,
  AlertCircle,
  Trophy,
  RefreshCw,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MatchResultDialog } from "@/components/matches/match-result-dialog"
import { MatchScheduleDialog } from "@/components/matches/match-schedule-dialog"
import { MatchCard as SharedMatchCard } from "@/components/matches/match-card"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [selectedTeamStats, setSelectedTeamStats] = useState<TeamStats | null>(null)
  const [statsSheetOpen, setStatsSheetOpen] = useState(false)
  const { isAdminOrOrganizer, isReferee } = useAuth()
  const { toast } = useToast()

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
    return isAdminOrOrganizer || isReferee
  }

  const handleLoadResult = (match: Match) => {
    setSelectedMatch(match)
    setResultDialogOpen(true)
  }

  const handleScheduleMatch = (match: Match) => {
    setSelectedMatch(match)
    setScheduleDialogOpen(true)
  }

  const handleResultSuccess = () => {
    fetchGroupsAndMatches()
  }

  const handleScheduleSuccess = () => {
    fetchGroupsAndMatches()
  }

  const handleStartMatch = async (matchId: string) => {
    try {
      setStatusLoading(matchId)
      const response = await fetch(`/api/matches/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" })
      })

      if (!response.ok) {
        throw new Error("Error al cambiar estado")
      }

      toast({
        title: "✅ Partido iniciado",
        description: "El partido ha sido marcado como en progreso",
        variant: "success",
      })

      fetchGroupsAndMatches()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo iniciar el partido",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(null)
    }
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
              {/* <div> */}
              {/* Left: Standings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Clasificación
                </h4>
                {zone.standings && zone.standings.length > 0 ? (
                  <div className="border rounded-lg overflow-x-auto">
                    {/* Desktop: Full table */}
                    <table className="w-full text-xs hidden md:table">
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

                    {/* Mobile: Compact table with click to view details */}
                    <table className="w-full text-xs md:hidden min-w-0">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="text-left py-2 px-1 font-semibold text-muted-foreground w-6">#</th>
                          <th className="text-left py-2 px-1 font-semibold text-muted-foreground min-w-0">Equipo</th>
                          <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-8" title="Puntos">PTS</th>
                          <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-7" title="Partidos Jugados">PJ</th>
                          <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-7" title="Partidos Ganados">PG</th>
                          <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-7" title="Partidos Perdidos">PP</th>
                          <th className="w-5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {zone.standings.map((stats, index) => {
                          return (
                            <tr
                              key={stats.teamId}
                              className={cn(
                                "border-b last:border-0 transition-colors cursor-pointer",
                                index < 2 ? "bg-green-50/50 dark:bg-green-950/20" : "hover:bg-muted/50"
                              )}
                              onClick={() => {
                                setSelectedTeamStats(stats)
                                setStatsSheetOpen(true)
                              }}
                            >
                              <td className="py-2 px-1">
                                <div className={cn(
                                  "flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-semibold",
                                  index < 2
                                    ? "bg-green-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="py-2 px-1 max-w-0">
                                <p className="text-[10px] font-medium leading-tight line-clamp-2 overflow-hidden text-ellipsis">
                                  {stats.teamName}
                                </p>
                              </td>
                              <td className="text-center py-2 px-0.5 font-bold text-primary whitespace-nowrap text-[10px]">
                                {stats.points}
                              </td>
                              <td className="text-center py-2 px-0.5 whitespace-nowrap text-[10px]">
                                {stats.matchesPlayed}
                              </td>
                              <td className="text-center py-2 px-0.5 whitespace-nowrap text-[10px] text-green-600">
                                {stats.matchesWon}
                              </td>
                              <td className="text-center py-2 px-0.5 whitespace-nowrap text-[10px] text-red-600">
                                {stats.matchesLost}
                              </td>
                              <td className="py-2 px-0.5">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
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
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase ">
                  Partidos
                </h4>
                {zone.matches && zone.matches.length > 0 ? (
                  <div className="space-y-3">
                    {zone.matches
                      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
                      .map((match) => (
                        <SharedMatchCard
                          key={match.id}
                          match={match as any}
                          canManage={canManageMatch()}
                          onLoadResult={() => handleLoadResult(match)}
                          onSchedule={() => handleScheduleMatch(match)}
                          onStartMatch={() => handleStartMatch(match.id)}
                          statusLoading={statusLoading === match.id}
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
        <>
          <MatchResultDialog
            match={selectedMatch as any}
            open={resultDialogOpen}
            onOpenChange={setResultDialogOpen}
            onSuccess={handleResultSuccess}
          />
          <MatchScheduleDialog
            match={selectedMatch as any}
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
            onSuccess={handleScheduleSuccess}
          />
        </>
      )}

      {/* Mobile: Team Stats Detail Sheet */}
      <Sheet open={statsSheetOpen} onOpenChange={setStatsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Estadísticas Detalladas</SheetTitle>
            <SheetDescription className="text-left">
              {selectedTeamStats?.teamName}
            </SheetDescription>
          </SheetHeader>

          {selectedTeamStats && (
            <div className="mt-6 space-y-4 pb-8">
              {/* Position Badge */}
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold">
                    #{(() => {
                      const currentZone = zones.find(z =>
                        z.standings?.some(s => s.teamId === selectedTeamStats.teamId)
                      )
                      const position = currentZone?.standings?.findIndex(
                        s => s.teamId === selectedTeamStats.teamId
                      )
                      return position !== undefined ? position + 1 : '-'
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posición</p>
                    <p className="text-lg font-semibold">
                      {(() => {
                        const currentZone = zones.find(z =>
                          z.standings?.some(s => s.teamId === selectedTeamStats.teamId)
                        )
                        return currentZone?.name || 'Grupo'
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                {/* Puntos */}
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <span className="text-sm font-medium text-muted-foreground">Puntos</span>
                  <span className="text-2xl font-bold text-primary">{selectedTeamStats.points}</span>
                </div>

                {/* Partidos */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partidos</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Jugados</p>
                      <p className="text-2xl font-bold">{selectedTeamStats.matchesPlayed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Ganados</p>
                      <p className="text-2xl font-bold text-green-600">{selectedTeamStats.matchesWon}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Perdidos</p>
                      <p className="text-2xl font-bold text-red-600">{selectedTeamStats.matchesLost}</p>
                    </div>
                  </div>
                </div>

                {/* Sets */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sets</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">A Favor</p>
                      <p className="text-xl font-semibold">{selectedTeamStats.setsWon}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">En Contra</p>
                      <p className="text-xl font-semibold">{selectedTeamStats.setsLost}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                      <p className={cn(
                        "text-xl font-bold",
                        selectedTeamStats.setsWon - selectedTeamStats.setsLost > 0
                          ? "text-green-600"
                          : selectedTeamStats.setsWon - selectedTeamStats.setsLost < 0
                          ? "text-red-600"
                          : ""
                      )}>
                        {selectedTeamStats.setsWon - selectedTeamStats.setsLost > 0 ? "+" : ""}
                        {selectedTeamStats.setsWon - selectedTeamStats.setsLost}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Games */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Games</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">A Favor</p>
                      <p className="text-xl font-semibold">{selectedTeamStats.gamesWon}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">En Contra</p>
                      <p className="text-xl font-semibold">{selectedTeamStats.gamesLost}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                      <p className={cn(
                        "text-xl font-bold",
                        selectedTeamStats.gamesWon - selectedTeamStats.gamesLost > 0
                          ? "text-green-600"
                          : selectedTeamStats.gamesWon - selectedTeamStats.gamesLost < 0
                          ? "text-red-600"
                          : ""
                      )}>
                        {selectedTeamStats.gamesWon - selectedTeamStats.gamesLost > 0 ? "+" : ""}
                        {selectedTeamStats.gamesWon - selectedTeamStats.gamesLost}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rendimiento</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">% Victorias</span>
                      <span className="text-lg font-semibold">
                        {selectedTeamStats.matchesPlayed > 0
                          ? Math.round((selectedTeamStats.matchesWon / selectedTeamStats.matchesPlayed) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Promedio Sets/Partido</span>
                      <span className="text-lg font-semibold">
                        {selectedTeamStats.matchesPlayed > 0
                          ? (selectedTeamStats.setsWon / selectedTeamStats.matchesPlayed).toFixed(1)
                          : '0.0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Promedio Games/Partido</span>
                      <span className="text-lg font-semibold">
                        {selectedTeamStats.matchesPlayed > 0
                          ? (selectedTeamStats.gamesWon / selectedTeamStats.matchesPlayed).toFixed(1)
                          : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
