"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Edit,
  Play,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { MatchResultDialog } from "./match-result-dialog"
import { MatchScheduleDialog } from "./match-schedule-dialog"

interface MatchDetailProps {
  match: any
}

export function MatchDetail({ match }: MatchDetailProps) {
  const router = useRouter()
  const { isAdminOrClubAdmin, isReferee } = useAuth()
  const { toast } = useToast()
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [revertLoading, setRevertLoading] = useState(false)

  const canManage = isAdminOrClubAdmin || isReferee
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER"
  const team1Won = match.winnerTeam?.id === match.team1?.id
  const team2Won = match.winnerTeam?.id === match.team2?.id

  const getTeamDisplay = (team: any): string => {
    if (!team) return "Por definir"
    if (team.name) return team.name
    return `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
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
      <Badge variant="outline" className={`${styles[match.status] || styles.SCHEDULED}`}>
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
        throw new Error("Error al cambiar estado")
      }

      toast({
        title: "✅ Partido iniciado",
        description: "El partido ha sido marcado como en progreso",
        variant: "success"
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo iniciar el partido",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSuccess = () => {
    router.refresh()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/matches">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Detalle del Partido
          </h1>
          <p className="text-muted-foreground">
            {match.tournament.name} - {match.category.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Programar partido
                </Button>

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

                {match.team1 && match.team2 && (
                  <Button
                    onClick={() => setResultDialogOpen(true)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Cargar resultado
                  </Button>
                )}
              </>
            )}

            {isCompleted && isAdminOrClubAdmin && (
              <Button
                variant="destructive"
                onClick={handleRevertResult}
                disabled={revertLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {revertLoading ? "Revirtiendo..." : "Revertir resultado"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Torneo</p>
              <Link href={`/dashboard/tournaments/${match.tournament.id}`}>
                <p className="hover:underline">{match.tournament.name}</p>
              </Link>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Categoría</p>
              <p>{match.category.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Fase</p>
              <p>{getPhaseLabel(match.phaseType)}</p>
            </div>

            {match.roundNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ronda</p>
                <p>Ronda {match.roundNumber}</p>
              </div>
            )}

            {match.matchNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número de Partido</p>
                <p>Partido {match.matchNumber}</p>
              </div>
            )}

            {match.zone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Grupo</p>
                <p>{match.zone.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Info */}
        <Card>
          <CardHeader>
            <CardTitle>Programación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {match.scheduledAt ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha y Hora</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{format(new Date(match.scheduledAt), "EEEE d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha y Hora</p>
                <p className="text-muted-foreground">No programado</p>
              </div>
            )}

            {match.court ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancha</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p>{match.court.name} - {match.court.club.name}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancha</p>
                <p className="text-muted-foreground">No asignada</p>
              </div>
            )}

            {match.durationMinutes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duración</p>
                <p>{match.durationMinutes} minutos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] divide-x">
              {/* Team Names Column */}
              <div className="divide-y">
                <div
                  className={cn(
                    "p-4",
                    team1Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {getTeamDisplay(match.team1)}
                  </div>
                </div>
                <div
                  className={cn(
                    "p-4",
                    team2Won && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {getTeamDisplay(match.team2)}
                  </div>
                </div>
              </div>

              {/* Sets/Games Columns */}
              {isCompleted && match.sets && match.sets.length > 0 && (
                <div className="flex divide-x">
                  {match.sets.map((set: any) => (
                    <div key={set.setNumber} className="divide-y min-w-[60px]">
                      <div
                        className={cn(
                          "p-4 text-center font-mono text-lg",
                          set.team1Games > set.team2Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.team1Games}
                        {set.team1TiebreakPoints !== null && (
                          <sup className="text-xs ml-0.5">{set.team1TiebreakPoints}</sup>
                        )}
                      </div>
                      <div
                        className={cn(
                          "p-4 text-center font-mono text-lg",
                          set.team2Games > set.team1Games && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.team2Games}
                        {set.team2TiebreakPoints !== null && (
                          <sup className="text-xs ml-0.5">{set.team2TiebreakPoints}</sup>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isCompleted && (
                <div className="p-4 text-center text-muted-foreground">
                  Sin resultado
                </div>
              )}
            </div>
          </div>

          {/* Sets Detail */}
          {isCompleted && match.sets && match.sets.length > 0 && (
            <div className="mt-6 space-y-4">
              <Separator />
              <h3 className="font-semibold">Detalle por Set</h3>
              <div className="space-y-4">
                {match.sets.map((set: any) => (
                  <div key={set.setNumber} className="space-y-2">
                    <h4 className="text-sm font-medium">Set {set.setNumber}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className={cn("p-3 rounded-md", set.team1Games > set.team2Games && "bg-green-50")}>
                        <div className="font-medium">{getTeamDisplay(match.team1)}</div>
                        <div className="text-muted-foreground">
                          {set.team1Games} games
                          {set.team1TiebreakPoints !== null && ` (${set.team1TiebreakPoints} en tiebreak)`}
                        </div>
                      </div>
                      <div className={cn("p-3 rounded-md", set.team2Games > set.team1Games && "bg-green-50")}>
                        <div className="font-medium">{getTeamDisplay(match.team2)}</div>
                        <div className="text-muted-foreground">
                          {set.team2Games} games
                          {set.team2TiebreakPoints !== null && ` (${set.team2TiebreakPoints} en tiebreak)`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
