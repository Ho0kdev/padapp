"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, Calendar, MapPin, AlertCircle, Edit, RefreshCw } from "lucide-react"
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
}

interface BracketData {
  matches: Match[]
  rounds: Record<number, Match[]>
  totalRounds: number
  totalMatches: number
}

interface BracketVisualizationProps {
  tournamentId: string
  categoryId: string
  refreshTrigger?: number
}

export function BracketVisualization({
  tournamentId,
  categoryId,
  refreshTrigger
}: BracketVisualizationProps) {
  const [bracket, setBracket] = useState<BracketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const { isAdminOrClubAdmin, isReferee } = useAuth()

  const fetchBracket = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/bracket?categoryId=${categoryId}`
      )

      if (!response.ok) {
        throw new Error("Error al cargar el bracket")
      }

      const data = await response.json()
      setBracket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBracket()
  }, [tournamentId, categoryId, refreshTrigger])

  const canManageMatch = () => {
    return isAdminOrClubAdmin || isReferee
  }

  const handleLoadResult = (match: any) => {
    // El match ya viene con toda la información del torneo desde la API
    setSelectedMatch(match)
    setResultDialogOpen(true)
  }

  const handleResultSuccess = () => {
    fetchBracket() // Recargar el bracket
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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

  if (!bracket || bracket.totalMatches === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se ha generado el bracket para esta categoría aún.
        </AlertDescription>
      </Alert>
    )
  }

  const getPhaseLabel = (phaseType: string): string => {
    const labels: Record<string, string> = {
      FINAL: "Final",
      SEMIFINALS: "Semifinales",
      QUARTERFINALS: "Cuartos de Final",
      ROUND_OF_16: "Octavos de Final",
      ROUND_OF_32: "1/16 de Final",
      GROUP_STAGE: "Fase de Grupos",
      THIRD_PLACE: "Tercer Lugar"
    }
    return labels[phaseType] || `Ronda ${phaseType}`
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

    if ((team as any).registration1?.player && (team as any).registration2?.player) {
      const reg1 = (team as any).registration1
      const reg2 = (team as any).registration2
      return `${reg1.player.firstName} ${reg1.player.lastName} / ${reg2.player.firstName} ${reg2.player.lastName}`
    }

    return "Equipo sin nombre"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Bracket - {bracket.totalRounds} Rondas
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {bracket.totalMatches} Partidos
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBracket}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {Object.entries(bracket.rounds)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([roundNum, matches]) => {
          const firstMatch = matches[0]
          const phaseLabel = firstMatch
            ? getPhaseLabel(firstMatch.phaseType)
            : `Ronda ${roundNum}`

          return (
            <div key={roundNum} className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {phaseLabel}
              </h4>
              <div className="grid gap-3">
                {matches.map((match) => (
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
            </div>
          )
        })}

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

function MatchCard({ match, getTeamDisplay, getStatusBadge, canManage, onLoadResult }: MatchCardProps) {
  const isCompleted = match.status === "COMPLETED"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Partido {match.matchNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(match.status)}
            {canManage && match.status !== "COMPLETED" && match.team1 && match.team2 && (
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
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-md",
              team1Won && "bg-green-50 dark:bg-green-950"
            )}
          >
            <span className={cn("text-sm", team1Won && "font-semibold")}>
              {getTeamDisplay(match.team1)}
            </span>
            {isCompleted && (
              <span className="font-mono text-sm">
                {match.team1SetsWon}
              </span>
            )}
          </div>

          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-md",
              team2Won && "bg-green-50 dark:bg-green-950"
            )}
          >
            <span className={cn("text-sm", team2Won && "font-semibold")}>
              {getTeamDisplay(match.team2)}
            </span>
            {isCompleted && (
              <span className="font-mono text-sm">
                {match.team2SetsWon}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1">
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
      </CardContent>
    </Card>
  )
}
