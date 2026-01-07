"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, AlertCircle, RefreshCw } from "lucide-react"
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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const { isAdminOrOrganizer, isReferee } = useAuth()
  const { toast } = useToast()

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
    return isAdminOrOrganizer || isReferee
  }

  const handleLoadResult = (match: any) => {
    // El match ya viene con toda la información del torneo desde la API
    setSelectedMatch(match)
    setResultDialogOpen(true)
  }

  const handleScheduleMatch = (match: any) => {
    setSelectedMatch(match)
    setScheduleDialogOpen(true)
  }

  const handleResultSuccess = () => {
    fetchBracket() // Recargar el bracket
  }

  const handleScheduleSuccess = () => {
    fetchBracket()
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

      fetchBracket()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h3 className="text-sm md:text-lg lg:text-xl font-semibold">
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
        .sort(([a], [b]) => Number(b) - Number(a))
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.map((match) => (
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
            </div>
          )
        })}

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
    </div>
  )
}
