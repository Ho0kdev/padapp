"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  MapPin,
  Play,
  CheckCircle,
  RotateCcw
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { AmericanoMatchResultDialog } from "@/components/tournaments/americano-social/americano-match-result-dialog"
import { AmericanoMatchScheduleDialog } from "@/components/tournaments/americano-social/americano-match-schedule-dialog"

interface AmericanoMatchDetailProps {
  match: any
  currentUserId: string
}

export function AmericanoMatchDetail({ match, currentUserId }: AmericanoMatchDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrOrganizer, isReferee } = useAuth()
  const [statusLoading, setStatusLoading] = useState(false)
  const [revertLoading, setRevertLoading] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  const isOwner = match.tournament.organizerId === currentUserId
  const canManage = isOwner || isAdminOrOrganizer || isReferee

  const isCompleted = match.status === "COMPLETED"
  const teamAWon = isCompleted && (match.teamAScore ?? 0) > (match.teamBScore ?? 0)
  const teamBWon = isCompleted && (match.teamBScore ?? 0) > (match.teamAScore ?? 0)

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

  const handleStartMatch = async () => {
    try {
      setStatusLoading(true)
      const response = await fetch(`/api/americano-matches/${match.id}/status`, {
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

  const handleLoadResult = () => {
    setResultDialogOpen(true)
  }

  const handleSuccess = () => {
    setResultDialogOpen(false)
    setScheduleDialogOpen(false)
    router.refresh()
  }

  const handleRevertResult = async () => {
    if (!confirm("¿Estás seguro de que deseas revertir este resultado? Esto limpiará el marcador y devolverá el partido al estado 'Programado'.")) {
      return
    }

    try {
      setRevertLoading(true)
      const response = await fetch(`/api/americano-matches/${match.id}/result`, {
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
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {match.pool.name} - Partido {match.roundNumber}
            </h1>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              <Link
                href={`/dashboard/tournaments/${match.tournament.id}/americano-social`}
                className="hover:underline"
              >
                {match.tournament.name}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Americano Social
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && match.status === "SCHEDULED" && (
            <Button
              variant="outline"
              onClick={handleStartMatch}
              disabled={statusLoading}
            >
              <Play className="mr-2 h-4 w-4" />
              Iniciar partido
            </Button>
          )}

          {canManage && match.status !== "COMPLETED" && match.status !== "WALKOVER" && (
            <Button onClick={handleLoadResult}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Cargar resultado
            </Button>
          )}

          {canManage && isCompleted && (
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
      </div>

      {/* Match Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Teams Card */}
        <Card>
          <CardHeader>
            <CardTitle>Equipos</CardTitle>
            <CardDescription>Parejas del partido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              {/* Team A Row */}
              <div
                className="grid border-b"
                style={{
                  gridTemplateColumns: isCompleted && match.sets && match.sets.length > 0
                    ? `1fr ${match.sets.map(() => 'auto').join(' ')}`
                    : '1fr auto'
                }}
              >
                {/* Team A Info */}
                <div
                  className={cn(
                    "p-4 border-r",
                    teamAWon && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className={cn("font-semibold", teamAWon && "text-green-700 dark:text-green-400")}>
                      Equipo A {teamAWon && "🏆"}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{match.player1.firstName} {match.player1.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {match.player1.rankingPoints} pts
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{match.player2.firstName} {match.player2.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {match.player2.rankingPoints} pts
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team A Sets/Score */}
                {isCompleted && match.sets && match.sets.length > 0 ? (
                  // Mostrar games por set
                  <>
                    {match.sets.map((set: any) => (
                      <div
                        key={set.setNumber}
                        className={cn(
                          "p-4 text-center font-mono text-lg flex items-center justify-center min-w-[60px] border-r last:border-r-0",
                          set.teamAScore > set.teamBScore && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.teamAScore}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground min-w-[100px] flex items-center justify-center">
                    Sin resultado
                  </div>
                )}
              </div>

              {/* Team B Row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: isCompleted && match.sets && match.sets.length > 0
                    ? `1fr ${match.sets.map(() => 'auto').join(' ')}`
                    : '1fr auto'
                }}
              >
                {/* Team B Info */}
                <div
                  className={cn(
                    "p-4 border-r",
                    teamBWon && "bg-green-50 dark:bg-green-950 font-semibold"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className={cn("font-semibold", teamBWon && "text-green-700 dark:text-green-400")}>
                      Equipo B {teamBWon && "🏆"}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{match.player3.firstName} {match.player3.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {match.player3.rankingPoints} pts
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{match.player4.firstName} {match.player4.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {match.player4.rankingPoints} pts
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team B Sets/Score */}
                {isCompleted && match.sets && match.sets.length > 0 ? (
                  // Mostrar games por set
                  <>
                    {match.sets.map((set: any) => (
                      <div
                        key={set.setNumber}
                        className={cn(
                          "p-4 text-center font-mono text-lg flex items-center justify-center min-w-[60px] border-r last:border-r-0",
                          set.teamBScore > set.teamAScore && "bg-green-100 dark:bg-green-900 font-bold"
                        )}
                      >
                        {set.teamBScore}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground min-w-[100px] flex items-center justify-center">
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
            <CardTitle>Información del Partido</CardTitle>
            <CardDescription>Detalles y configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pool</p>
              <p>{match.pool.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Ronda</p>
              <p>Ronda {match.roundNumber}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>

            {match.scheduledFor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Programado para</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(match.scheduledFor), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            )}

            {match.completedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completado</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(match.completedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            )}

            {!isCompleted && canManage && (
              <div className="pt-2">
                <Button variant="outline" onClick={() => setScheduleDialogOpen(true)} className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Programar partido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AmericanoMatchResultDialog
        match={match}
        tournament={{
          setsToWin: match.tournament.setsToWin,
          gamesToWinSet: match.tournament.gamesToWinSet,
          tiebreakAt: match.tournament.tiebreakAt,
          goldenPoint: match.tournament.goldenPoint
        }}
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        onSuccess={handleSuccess}
      />
      <AmericanoMatchScheduleDialog
        match={match}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
