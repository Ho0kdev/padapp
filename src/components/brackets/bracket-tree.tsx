"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trophy, Calendar, MapPin, Edit, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MatchResultDialog } from "@/components/matches/match-result-dialog"
import { useAuth } from "@/hooks/use-auth"

interface Team {
  id: string
  name?: string | null
  registration1?: {
    player: {
      firstName: string
      lastName: string
    }
  }
  registration2?: {
    player: {
      firstName: string
      lastName: string
    }
  }
}

interface MatchSet {
  setNumber: number
  team1Games: number
  team2Games: number
  team1TiebreakPoints?: number | null
  team2TiebreakPoints?: number | null
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
  sets?: MatchSet[]
}

interface BracketTreeProps {
  tournamentId: string
  categoryId: string
  categoryName: string
  matches: Match[]
  rounds: Record<number, Match[]>
  totalRounds: number
  onRefresh: () => void
}

export function BracketTree({
  tournamentId,
  categoryId,
  categoryName,
  matches,
  rounds,
  totalRounds,
  onRefresh
}: BracketTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [zones, setZones] = useState<any[]>([])
  const { isAdminOrOrganizer, isReferee } = useAuth()

  // Cargar grupos si hay fase de grupos
  useEffect(() => {
    const hasGroupStage = matches.some(m => m.phaseType === 'GROUP_STAGE')
    if (hasGroupStage) {
      fetch(`/api/tournaments/${tournamentId}/groups?categoryId=${categoryId}`)
        .then(res => res.json())
        .then(data => setZones(data.zones || []))
        .catch(err => console.error('Error loading groups:', err))
    }
  }, [tournamentId, categoryId, matches])

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Scroll al centro al montar y detectar scroll para ocultar hint
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2

      const handleScroll = () => {
        setShowScrollHint(false)
      }

      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [matches])

  const canManageMatch = () => {
    return isAdminOrOrganizer || isReferee
  }

  // Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setDragStart({
      x: e.pageX - containerRef.current.offsetLeft,
      y: e.pageY - containerRef.current.offsetTop
    })
    containerRef.current.style.cursor = 'grabbing'
    containerRef.current.style.userSelect = 'none'
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()

    const x = e.pageX - containerRef.current.offsetLeft
    const y = e.pageY - containerRef.current.offsetTop
    const walkX = (x - dragStart.x) * 1.5 // Velocidad de scroll
    const walkY = (y - dragStart.y) * 1.5

    containerRef.current.scrollLeft -= walkX
    containerRef.current.scrollTop -= walkY

    setDragStart({ x, y })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
      containerRef.current.style.userSelect = 'auto'
    }
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab'
        containerRef.current.style.userSelect = 'auto'
      }
    }
  }

  const handleLoadResult = (match: Match) => {
    // Add category info to match for dialog
    const matchWithCategory = {
      ...match,
      category: {
        id: categoryId,
        name: categoryName || "Categoría"
      }
    }

    setSelectedMatch(matchWithCategory as any)
    setResultDialogOpen(true)
  }

  const handleResultSuccess = () => {
    onRefresh()
  }

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 1.5))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.6))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  const getTeamDisplay = (team?: Team | null): string => {
    if (!team) return "TBD"
    if (team.name) return team.name

    if (team.registration1?.player && team.registration2?.player) {
      const p1 = `${team.registration1.player.firstName} ${team.registration1.player.lastName}`
      const p2 = `${team.registration2.player.firstName} ${team.registration2.player.lastName}`
      return `${p1} / ${p2}`
    }

    return "Equipo"
  }

  const getPhaseLabel = (phaseType: string): string => {
    const labels: Record<string, string> = {
      FINAL: "Final",
      SEMIFINALS: "Semifinal",
      QUARTERFINALS: "Cuartos",
      ROUND_OF_16: "Octavos",
      ROUND_OF_32: "Dieciseisavos",
      THIRD_PLACE: "3er Lugar",
      LOWER_BRACKET: "Lower Bracket"
    }
    return labels[phaseType] || `Ronda ${phaseType}`
  }

  const getStatusStyle = (status: string): string => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      WALKOVER: "bg-purple-100 text-purple-800 border-purple-200"
    }
    return styles[status] || styles.SCHEDULED
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      SCHEDULED: "Programado",
      IN_PROGRESS: "En Progreso",
      COMPLETED: "Completado",
      CANCELLED: "Cancelado",
      WALKOVER: "Walkover"
    }
    return labels[status] || status
  }

  // Calcular altura de cada ronda basado en número de partidos
  const getMatchHeight = () => 160 // Altura base de cada match card
  const getMatchGap = (roundIndex: number) => {
    // El gap aumenta exponencialmente por ronda para formar el árbol
    return Math.pow(2, roundIndex) * 20 // Aumentado de 8 a 20 para más separación
  }

  // Filtrar partidos de fase de grupos para no mostrarlos en el árbol
  const hasGroupStage = matches.some(m => m.phaseType === 'GROUP_STAGE')

  // Organizar rounds de izquierda a derecha (Primera ronda → Final)
  const sortedRounds = Object.entries(rounds)
    .sort(([a], [b]) => Number(a) - Number(b)) // Orden ascendente
    .filter(([_, matches]) => matches.length > 0)
    .filter(([_, matches]) => {
      // Si hay fase de grupos, excluir los partidos de grupos del árbol
      if (hasGroupStage) {
        return matches[0]?.phaseType !== 'GROUP_STAGE'
      }
      return true
    })

  const totalWidth = sortedRounds.length * 380 + (hasGroupStage && zones.length > 0 ? 350 : 0) // 380px por columna + grupos

  // Calcular altura total necesaria basada en la ronda con más partidos
  const maxMatchesInRound = sortedRounds.length > 0
    ? Math.max(...sortedRounds.map(([_, matches]) => matches.length))
    : 1
  const maxRoundIndex = Math.max(0, sortedRounds.length - 1)
  const totalHeight = Math.max(600, 100 + (maxMatchesInRound * (getMatchHeight() + getMatchGap(maxRoundIndex))))

  // En mobile, ajustar zoom inicial
  const effectiveZoom = isMobile ? Math.min(zoom, 0.7) : zoom

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={scrollLeft}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Anterior</span>
          </Button>
          <Button variant="outline" size="sm" onClick={scrollRight}>
            <span className="hidden sm:inline mr-1">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {matches.length} partidos
          </span>
          {!isMobile && (
            <>
              <Button variant="outline" size="sm" onClick={zoomOut} disabled={zoom <= 0.6}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetZoom}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomIn} disabled={zoom >= 1.5}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bracket Tree Container */}
      <div
        ref={containerRef}
        className="relative overflow-auto border rounded-lg bg-muted/30 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted cursor-grab active:cursor-grabbing"
        style={{ height: isMobile ? '500px' : '600px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Scroll Hint */}
        {showScrollHint && !isMobile && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm animate-pulse">
              Usa scroll o arrastra para navegar →
            </div>
          </div>
        )}
        <div
          className="relative"
          style={{
            width: `${totalWidth}px`,
            minHeight: `${totalHeight}px`,
            transform: `scale(${effectiveZoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease'
          }}
        >
          {/* SVG para líneas conectoras - Removido */}

          {/* Columnas de Rondas */}
          <div className="relative flex gap-8 p-8" style={{ zIndex: 1 }}>
            {/* Columna de Grupos (si hay fase de grupos) */}
            {hasGroupStage && zones.length > 0 && (
              <div className="flex flex-col gap-4" style={{ width: '280px' }}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
                  <h3 className="font-semibold text-sm text-center">
                    Fase de Grupos
                  </h3>
                  <p className="text-xs text-muted-foreground text-center">
                    {zones.length} {zones.length === 1 ? 'grupo' : 'grupos'}
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {zones.map((zone) => {
                    const totalTeams = zone.standings?.length || zone.teams?.length || 0

                    // Calcular configuración de clasificados según el total de equipos en el torneo
                    const totalTeamsInTournament = zones.reduce((sum, z) => sum + (z.standings?.length || z.teams?.length || 0), 0)

                    // Determinar cuántos clasifican por grupo usando la misma lógica que bracket-service
                    let qualifiedPerGroup = 2
                    let needsBestSecond = false

                    if (totalTeamsInTournament >= 9 && totalTeamsInTournament <= 11) {
                      // 3 grupos: clasifican 1ros + mejor 2do
                      qualifiedPerGroup = 1
                      needsBestSecond = true
                    } else if (totalTeamsInTournament >= 12 && totalTeamsInTournament <= 16) {
                      // 4 grupos: clasifican top 2 de cada grupo
                      qualifiedPerGroup = 2
                    } else if (totalTeamsInTournament >= 17 && totalTeamsInTournament <= 20) {
                      // 5 grupos: clasifican 1ros + 3 mejores 2dos
                      qualifiedPerGroup = 1
                      needsBestSecond = true
                    } else if (totalTeamsInTournament >= 21 && totalTeamsInTournament <= 24) {
                      // 6 grupos: clasifican 1ros + 2 mejores 2dos
                      qualifiedPerGroup = 1
                      needsBestSecond = true
                    }

                    // Determinar qué equipos están clasificados en este grupo
                    const isTeamQualified = (position: number, teamId: string) => {
                      // Los primeros N de cada grupo siempre clasifican
                      if (position <= qualifiedPerGroup) return true

                      // Si hay mejores segundos/terceros, verificar si este equipo clasificó
                      if (needsBestSecond && position === qualifiedPerGroup + 1) {
                        // Obtener todos los equipos en posición qualifiedPerGroup + 1 de todos los grupos
                        const candidates = zones
                          .map(z => z.standings?.find((s: any, idx: number) => idx === qualifiedPerGroup))
                          .filter(Boolean)
                          .sort((a: any, b: any) => {
                            if (b.points !== a.points) return b.points - a.points
                            const aDiff = a.setsWon - a.setsLost
                            const bDiff = b.setsWon - b.setsLost
                            if (bDiff !== aDiff) return bDiff - aDiff
                            const aGameDiff = a.gamesWon - a.gamesLost
                            const bGameDiff = b.gamesWon - b.gamesLost
                            if (bGameDiff !== aGameDiff) return bGameDiff - aGameDiff
                            return b.setsWon - a.setsWon
                          })

                        // Calcular cuántos mejores segundos/terceros clasifican
                        let bestCount = 0
                        if (totalTeamsInTournament >= 9 && totalTeamsInTournament <= 11) bestCount = 1
                        else if (totalTeamsInTournament >= 17 && totalTeamsInTournament <= 20) bestCount = 3
                        else if (totalTeamsInTournament >= 21 && totalTeamsInTournament <= 24) bestCount = 2

                        // Verificar si este equipo está entre los mejores
                        const bestQualified = candidates.slice(0, bestCount)
                        return bestQualified.some((s: any) => s.teamId === teamId)
                      }

                      return false
                    }

                    return (
                      <Card key={zone.id} className="transition-all">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{zone.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {totalTeams} {totalTeams === 1 ? 'equipo' : 'equipos'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-2">
                          <div className="space-y-1">
                            {zone.standings?.map((standing: any, idx: number) => {
                              const position = idx + 1
                              const qualified = isTeamQualified(position, standing.teamId)

                              return (
                                <div
                                  key={standing.teamId}
                                  className={cn(
                                    "flex items-center gap-2 text-xs px-2 py-1.5 rounded",
                                    qualified && "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800",
                                    !qualified && "opacity-60"
                                  )}
                                >
                                  <div className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-full font-medium text-[10px]",
                                    qualified && "bg-green-600 text-white",
                                    !qualified && "bg-muted text-muted-foreground"
                                  )}>
                                    {position}
                                  </div>
                                  <span className={cn(
                                    "truncate flex-1",
                                    qualified && "font-medium"
                                  )}>
                                    {standing.teamName}
                                  </span>
                                  <span className={cn(
                                    "font-semibold",
                                    qualified && "text-green-700 dark:text-green-400",
                                    !qualified && "text-muted-foreground"
                                  )}>
                                    {standing.points}pts
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Columnas de partidos eliminatorios */}
            {sortedRounds.map(([roundNum, roundMatches], roundIndex) => {
              const firstMatch = roundMatches[0]
              const phaseLabel = firstMatch ? getPhaseLabel(firstMatch.phaseType) : `Ronda ${roundNum}`

              return (
                <div
                  key={roundNum}
                  className="flex flex-col gap-4"
                  style={{ width: '320px' }}
                >
                  {/* Header de la ronda */}
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
                    <h3 className="font-semibold text-sm text-center">
                      {phaseLabel}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center">
                      {roundMatches.length} {roundMatches.length === 1 ? 'partido' : 'partidos'}
                    </p>
                  </div>

                  {/* Matches de la ronda */}
                  <div
                    className="flex flex-col"
                    style={{
                      gap: `${getMatchGap(roundIndex)}px`,
                      marginTop: roundIndex > 0 ? `${(getMatchHeight() + getMatchGap(roundIndex - 1)) * Math.pow(1.5, roundIndex - 1)}px` : '0'
                    }}
                  >
                    {roundMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        getTeamDisplay={getTeamDisplay}
                        getStatusStyle={getStatusStyle}
                        getStatusLabel={getStatusLabel}
                        canManage={canManageMatch()}
                        onLoadResult={() => handleLoadResult(match)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dialog de resultado */}
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
  getStatusStyle: (status: string) => string
  getStatusLabel: (status: string) => string
  canManage: boolean
  onLoadResult: () => void
}

function MatchCard({
  match,
  getTeamDisplay,
  getStatusStyle,
  getStatusLabel,
  canManage,
  onLoadResult
}: MatchCardProps) {
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isCompleted && "border-green-200 bg-green-50/30"
    )}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              #{match.matchNumber}
            </span>
            <Badge variant="outline" className={cn("text-xs", getStatusStyle(match.status))}>
              {getStatusLabel(match.status)}
            </Badge>
          </div>
          {canManage && match.status !== "COMPLETED" && match.status !== "WALKOVER" && match.team1 && match.team2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadResult}
              className="h-7 w-7 p-0"
              title="Cargar resultado"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {/* Teams Grid with Sets/Games */}
        <div className="border rounded-md overflow-hidden">
          <div className="flex">
            {/* Team Names Column */}
            <div className="divide-y flex-1 min-w-0">
              <div
                className={cn(
                  "px-2 py-1.5 text-xs",
                  team1Won && "bg-green-100 dark:bg-green-950 font-semibold"
                )}
              >
                <span className={cn(
                  "truncate block",
                  !match.team1 && "text-muted-foreground italic"
                )}>
                  {getTeamDisplay(match.team1)}
                </span>
              </div>
              <div
                className={cn(
                  "px-2 py-1.5 text-xs",
                  team2Won && "bg-green-100 dark:bg-green-950 font-semibold"
                )}
              >
                <span className={cn(
                  "truncate block",
                  !match.team2 && "text-muted-foreground italic"
                )}>
                  {getTeamDisplay(match.team2)}
                </span>
              </div>
            </div>

            {/* Sets/Games Columns */}
            {isCompleted && match.sets && match.sets.length > 0 ? (
              <div className="flex divide-x shrink-0">
                {match.sets.map((set) => (
                  <div key={set.setNumber} className="divide-y w-8">
                    <div
                      className={cn(
                        "py-1.5 text-center font-mono text-xs",
                        set.team1Games > set.team2Games && "bg-green-200 dark:bg-green-900 font-bold"
                      )}
                    >
                      {set.team1Games}
                    </div>
                    <div
                      className={cn(
                        "py-1.5 text-center font-mono text-xs",
                        set.team2Games > set.team1Games && "bg-green-200 dark:bg-green-900 font-bold"
                      )}
                    >
                      {set.team2Games}
                    </div>
                  </div>
                ))}
              </div>
            ) : isCompleted ? (
              <div className="flex items-center px-2 text-xs text-muted-foreground shrink-0">
                <div className="divide-y">
                  <div className="py-1.5 text-center font-mono">
                    {match.team1SetsWon}
                  </div>
                  <div className="py-1.5 text-center font-mono">
                    {match.team2SetsWon}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Info adicional */}
        {(match.scheduledAt || match.court) && (
          <div className="mt-2 pt-2 border-t space-y-1">
            {match.scheduledAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="truncate">
                  {format(new Date(match.scheduledAt), "dd/MM HH:mm", { locale: es })}
                </span>
              </div>
            )}
            {match.court && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{match.court.name}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
