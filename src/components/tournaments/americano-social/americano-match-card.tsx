"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, MapPin, MoreHorizontal, Eye, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface AmericanoMatch {
  id: string
  roundNumber: number
  status: string
  player1: Player
  player2: Player
  player3: Player
  player4: Player
  teamAScore?: number | null
  teamBScore?: number | null
  scheduledAt?: Date | string | null
  court?: {
    id: string
    name: string
  } | null
}

interface AmericanoMatchCardProps {
  match: AmericanoMatch
  canManage?: boolean
  onLoadResult?: () => void
  onSchedule?: () => void
  showPoolInfo?: boolean
  poolName?: string
  hasPreviousRoundsIncomplete?: boolean
  matchNumber?: number
}

export function AmericanoMatchCard({
  match,
  canManage = false,
  onLoadResult,
  onSchedule,
  showPoolInfo = false,
  poolName,
  hasPreviousRoundsIncomplete = false,
  matchNumber
}: AmericanoMatchCardProps) {
  const isCompleted = match.status === "COMPLETED"
  const teamAWon = isCompleted && (match.teamAScore ?? 0) > (match.teamBScore ?? 0)
  const teamBWon = isCompleted && (match.teamBScore ?? 0) > (match.teamAScore ?? 0)

  const getTeamADisplay = (): string => {
    return `${match.player1.firstName} ${match.player1.lastName} / ${match.player2.firstName} ${match.player2.lastName}`
  }

  const getTeamBDisplay = (): string => {
    return `${match.player3.firstName} ${match.player3.lastName} / ${match.player4.firstName} ${match.player4.lastName}`
  }

  const getStatusBadge = () => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
    }

    const labels: Record<string, string> = {
      SCHEDULED: "Programado",
      IN_PROGRESS: "En Progreso",
      COMPLETED: "Completado",
      CANCELLED: "Cancelado",
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
          {/* Header: Round number/Pool info + Status */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {showPoolInfo && poolName ? (
                <>
                  <div className="font-medium text-sm">
                    {poolName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {matchNumber ? `Partido ${matchNumber}` : `Ronda ${match.roundNumber}`}
                  </div>
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {matchNumber ? `Partido ${matchNumber}` : `Ronda ${match.roundNumber}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalle
                    </DropdownMenuItem>

                    {match.status !== "COMPLETED" && (
                      <>
                        <DropdownMenuSeparator />

                        {onSchedule && (
                          <DropdownMenuItem onClick={onSchedule}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Programar partido
                          </DropdownMenuItem>
                        )}

                        {onLoadResult && (
                          <DropdownMenuItem
                            onClick={hasPreviousRoundsIncomplete ? undefined : onLoadResult}
                            disabled={hasPreviousRoundsIncomplete}
                            className={hasPreviousRoundsIncomplete ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {hasPreviousRoundsIncomplete
                              ? "Completar rondas anteriores primero"
                              : "Cargar resultado"}
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    teamAWon && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  {getTeamADisplay()}
                </div>
                <div
                  className={cn(
                    "p-2 text-sm",
                    teamBWon && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  {getTeamBDisplay()}
                </div>
              </div>

              {/* Score Column */}
              {isCompleted && match.teamAScore !== null && match.teamBScore !== null && (
                <div className="divide-y min-w-[40px]">
                  <div
                    className={cn(
                      "p-2 text-center font-mono text-sm",
                      teamAWon && "bg-green-100 dark:bg-green-900 font-bold"
                    )}
                  >
                    {match.teamAScore}
                  </div>
                  <div
                    className={cn(
                      "p-2 text-center font-mono text-sm",
                      teamBWon && "bg-green-100 dark:bg-green-900 font-bold"
                    )}
                  >
                    {match.teamBScore}
                  </div>
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
                  {match.court.name}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
