"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  Play,
  CheckCircle,
  RotateCcw,
  MapPin
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { MatchResultDialog } from "./match-result-dialog"
import { MatchScheduleDialog } from "./match-schedule-dialog"

interface MatchDetailProps {
  match: any
}

export function MatchDetail({ match }: MatchDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrClubAdmin, isReferee } = useAuth()
  const [statusLoading, setStatusLoading] = useState(false)
  const [revertLoading, setRevertLoading] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  const canManage = isAdminOrClubAdmin || isReferee
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  const getTeamDisplay = (team: any): string => {
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

  const getPhaseLabel = (phaseType: string): string => {
    const labels: Record<string, string> = {
      FINAL: "Final",
      SEMIFINALS: "Semifinales",
      QUARTERFINALS: "Cuartos de Final",
      ROUND_OF_16: "Octavos de Final",
      ROUND_OF_32: "1/16 de Final",
      GROUP_STAGE: "Fase de Grupos",
      THIRD_PLACE: "Tercer Lugar",
      ELIMINATION: "Eliminación"
    }
    return labels[phaseType] || phaseType
  }

  const handleStartMatch = async () => {
    try {
      setStatusLoading(true)
      const response = await fetch(`/api/matches/${match.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al iniciar partido")
      }

      toast({
        title: "✅ Partido iniciado",
        description: "El partido está ahora en progreso",
        variant: "success"
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al iniciar partido",
        variant: "destructive"
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSuccess = () => {
    router.refresh()
    setResultDialogOpen(false)
    setScheduleDialogOpen(false)
  }

  const handleRevertResult = async () => {
    if (!confirm("¿Estás seguro de que deseas revertir este resultado? Esto limpiará el marcador y devolverá el partido al estado 'Programado'.")) {
      return
    }

    try {
      setRevertLoading(true)
      const response = await fetch(`/api/matches/${match.id}/result`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al revertir resultado")
      }

      toast({
        title: "✅ Resultado revertido",
        description: "El resultado del partido ha sido revertido exitosamente",
        variant: "success"
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo revertir el resultado",
        variant: "destructive",
      })
    } finally {
      setRevertLoading(false)
    }
  }

  const matchTitle = `${getPhaseLabel(match.phaseType)}${match.matchNumber ? ` - Partido ${match.matchNumber}` : ''}`

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Partidos", href: "/dashboard/matches" },
          { label: matchTitle }
        ]}
      />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">
                {matchTitle}
              </h1>
              {getStatusBadge()}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <Link
                  href={`/dashboard/tournaments/${match.tournament.id}`}
                  className="hover:underline truncate"
                >
                  {match.tournament.name}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{match.category.name}</span>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          {canManage && (
            <div className="hidden md:flex items-center gap-2">
              {match.status === "SCHEDULED" && (
                <Button
                  variant="outline"
                  onClick={handleStartMatch}
                  disabled={statusLoading}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar partido
                </Button>
              )}

              {!isCompleted && match.team1 && match.team2 && (
                <Button onClick={() => setResultDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Cargar resultado
                </Button>
              )}

              {isCompleted && (
                <Button
                  variant="destructive"
                  onClick={handleRevertResult}
                  disabled={revertLoading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {revertLoading ? "Revirtiendo..." : "Revertir resultado"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Actions */}
        {canManage && (
          <div className="md:hidden flex flex-col gap-2">
            {match.status === "SCHEDULED" && (
              <Button
                variant="outline"
                onClick={handleStartMatch}
                disabled={statusLoading}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar partido
              </Button>
            )}

            {!isCompleted && match.team1 && match.team2 && (
              <Button onClick={() => setResultDialogOpen(true)} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Cargar resultado
              </Button>
            )}

            {isCompleted && (
              <Button
                variant="destructive"
                onClick={handleRevertResult}
                disabled={revertLoading}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {revertLoading ? "Revirtiendo..." : "Revertir resultado"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Match Details */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Teams Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Equipos</CardTitle>
            <CardDescription className="text-xs md:text-sm">Parejas del partido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden overflow-x-auto">
              {/* Team 1 Row */}
              <div
                className="grid border-b"
                style={{
                  gridTemplateColumns: isCompleted && match.sets && match.sets.length > 0
                    ? `minmax(140px, 1fr) ${match.sets.map(() => 'auto').join(' ')}`
                    : 'minmax(140px, 1fr) auto'
                }}
              >
                {/* Team 1 Info */}
                <div
                  className={cn(
                    "p-2 sm:p-3 md:p-4 border-r",
                    team1Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex flex-col gap-1 md:gap-2">
                    <div className={cn("font-semibold text-sm md:text-base line-clamp-2", team1Won && "text-green-700 dark:text-green-400")}>
                      {getTeamDisplay(match.team1)} {team1Won && "🏆"}
                    </div>
                    {match.team1 && match.team1.registration1 && match.team1.registration2 && (
                      <div className="space-y-0.5 md:space-y-1 text-[10px] sm:text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{match.team1.registration1.player.firstName} {match.team1.registration1.player.lastName}</span>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                            {match.team1.registration1.player.rankings?.[0]?.currentPoints ?? match.team1.registration1.player.rankingPoints} pts
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{match.team1.registration2.player.firstName} {match.team1.registration2.player.lastName}</span>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                            {match.team1.registration2.player.rankings?.[0]?.currentPoints ?? match.team1.registration2.player.rankingPoints} pts
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team 1 Sets */}
                {isCompleted && match.sets && match.sets.length > 0 ? (
                  <>
                    {match.sets.map((set: any) => (
                      <div
                        key={set.setNumber}
                        className={cn(
                          "p-2 sm:p-3 md:p-4 text-center font-mono text-base sm:text-lg flex items-center justify-center min-w-[50px] sm:min-w-[60px] border-r last:border-r-0",
                          set.team1Games > set.team2Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        <div>
                          {set.team1Games}
                          {set.team1TiebreakPoints !== null && (
                            <sup className="text-[9px] sm:text-xs ml-0.5">{set.team1TiebreakPoints}</sup>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-2 sm:p-3 md:p-4 text-center text-muted-foreground text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex items-center justify-center">
                    Sin resultado
                  </div>
                )}
              </div>

              {/* Team 2 Row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: isCompleted && match.sets && match.sets.length > 0
                    ? `minmax(140px, 1fr) ${match.sets.map(() => 'auto').join(' ')}`
                    : 'minmax(140px, 1fr) auto'
                }}
              >
                {/* Team 2 Info */}
                <div
                  className={cn(
                    "p-2 sm:p-3 md:p-4 border-r",
                    team2Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex flex-col gap-1 md:gap-2">
                    <div className={cn("font-semibold text-sm md:text-base line-clamp-2", team2Won && "text-green-700 dark:text-green-400")}>
                      {getTeamDisplay(match.team2)} {team2Won && "🏆"}
                    </div>
                    {match.team2 && match.team2.registration1 && match.team2.registration2 && (
                      <div className="space-y-0.5 md:space-y-1 text-[10px] sm:text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{match.team2.registration1.player.firstName} {match.team2.registration1.player.lastName}</span>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                            {match.team2.registration1.player.rankings?.[0]?.currentPoints ?? match.team2.registration1.player.rankingPoints} pts
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{match.team2.registration2.player.firstName} {match.team2.registration2.player.lastName}</span>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                            {match.team2.registration2.player.rankings?.[0]?.currentPoints ?? match.team2.registration2.player.rankingPoints} pts
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team 2 Sets */}
                {isCompleted && match.sets && match.sets.length > 0 ? (
                  <>
                    {match.sets.map((set: any) => (
                      <div
                        key={set.setNumber}
                        className={cn(
                          "p-2 sm:p-3 md:p-4 text-center font-mono text-base sm:text-lg flex items-center justify-center min-w-[50px] sm:min-w-[60px] border-r last:border-r-0",
                          set.team2Games > set.team1Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        <div>
                          {set.team2Games}
                          {set.team2TiebreakPoints !== null && (
                            <sup className="text-[9px] sm:text-xs ml-0.5">{set.team2TiebreakPoints}</sup>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-2 sm:p-3 md:p-4 text-center text-muted-foreground text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] flex items-center justify-center">
                    Sin resultado
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Información del Partido</CardTitle>
            <CardDescription className="text-xs md:text-sm">Detalles y configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Fase</p>
              <p className="text-sm md:text-base">{getPhaseLabel(match.phaseType)}</p>
            </div>

            {match.roundNumber && (
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Ronda</p>
                <p className="text-sm md:text-base">Ronda {match.roundNumber}</p>
              </div>
            )}

            {match.zone && (
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Grupo</p>
                <p className="text-sm md:text-base">{match.zone.name}</p>
              </div>
            )}

            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Estado</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>

            {match.scheduledAt && (
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Programado para</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                  <span className="text-sm md:text-base">
                    {format(new Date(match.scheduledAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            )}

            {match.court && (
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Cancha</p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                  <span className="text-sm md:text-base break-words">{match.court.name} - {match.court.club.name}</span>
                </div>
              </div>
            )}

            {match.durationMinutes && (
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Duración</p>
                <p className="text-sm md:text-base">{match.durationMinutes} minutos</p>
              </div>
            )}

            {!isCompleted && canManage && (
              <div className="pt-2">
                <Button variant="outline" onClick={() => setScheduleDialogOpen(true)} className="w-full text-sm md:text-base">
                  <Calendar className="mr-2 h-4 w-4" />
                  Programar partido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <MatchResultDialog
        match={match}
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        onSuccess={handleSuccess}
      />
      <MatchScheduleDialog
        match={match}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
