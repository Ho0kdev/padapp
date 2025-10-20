"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Edit } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Team {
  id: string
  name?: string | null
  registration1?: {
    player: {
      id: string
      firstName: string
      lastName: string
    }
  }
  registration2?: {
    player: {
      id: string
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

export interface MatchCardData {
  id: string
  matchNumber: number | null
  status: string
  team1?: Team | null
  team2?: Team | null
  winnerTeam?: {
    id: string
  } | null
  team1SetsWon?: number
  team2SetsWon?: number
  scheduledAt?: Date | string | null
  court?: {
    id: string
    name: string
    club: {
      id: string
      name: string
    }
  } | null
  sets?: MatchSet[]
}

interface MatchCardProps {
  match: MatchCardData
  canManage?: boolean
  onLoadResult?: () => void
  showTournamentInfo?: boolean
  tournament?: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
  }
}

export function MatchCard({
  match,
  canManage = false,
  onLoadResult,
  showTournamentInfo = false,
  tournament,
  category
}: MatchCardProps) {
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  const getTeamDisplay = (team?: Team | null): string => {
    if (!team) return "Por definir"
    if (team.name) return team.name
    if (team.registration1?.player && team.registration2?.player) {
      return `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
    }
    return "Equipo sin nombre"
  }

  const getStatusBadge = () => {
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
      <Badge variant="outline" className={`text-xs ${styles[match.status] || styles.SCHEDULED}`}>
        {labels[match.status] || match.status}
      </Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Match number/Tournament info + Status */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {showTournamentInfo && tournament && category ? (
                <>
                  <div className="font-medium text-sm">
                    {tournament.name} - {category.name}
                  </div>
                  {match.matchNumber && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Partido {match.matchNumber}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  Partido {match.matchNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {canManage && match.status !== "COMPLETED" && match.status !== "WALKOVER" && match.team1 && match.team2 && onLoadResult && (
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

          {/* Teams Grid */}
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

          {/* Date and Court info */}
          {(match.scheduledAt || match.court) && (
            <div className="pt-2 space-y-1 border-t">
              {match.scheduledAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(
                    typeof match.scheduledAt === 'string' ? new Date(match.scheduledAt) : match.scheduledAt,
                    "dd/MM/yyyy HH:mm",
                    { locale: es }
                  )}
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
