"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Award, AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface PointsBreakdown {
  participationPoints: number
  positionPoints: number
  positionPercentage: number
  victoryBonus: number
  victoriesCount: number
  victoryBonusPerWin: number
  setBonus: number
  setsCount: number
  setBonusPerSet: number
  subtotal: number
  tournamentMultiplier: number
  tournamentMultiplierLabel: string
  afterTournamentMultiplier: number
  participantMultiplier: number
  participantMultiplierLabel: string
  finalTotal: number
}

interface PlayerStats {
  id: string
  playerId: string
  matchesPlayed: number
  matchesWon: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  pointsEarned: number
  finalPosition: number | null
  pointsBreakdown?: PointsBreakdown
  player: {
    firstName: string
    lastName: string
    user: {
      email: string
    }
  }
}

interface TournamentPointsProps {
  tournamentId: string
  tournamentStatus: string
}

export function TournamentPoints({ tournamentId, tournamentStatus }: TournamentPointsProps) {
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchStats()
  }, [tournamentId])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tournaments/${tournamentId}/stats`)

      if (!response.ok) {
        throw new Error("Error al cargar estadísticas")
      }

      const data = await response.json()
      setStats(data.stats || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
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

  if (stats.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {tournamentStatus === 'COMPLETED'
            ? "No hay estadísticas disponibles para este torneo. Es posible que aún no se hayan calculado los puntos."
            : "Las estadísticas y puntos estarán disponibles una vez que el torneo esté completado."
          }
        </AlertDescription>
      </Alert>
    )
  }

  const totalPointsAwarded = stats.reduce((sum, stat) => sum + stat.pointsEarned, 0)

  // Ordenar por puntos ganados (mayor a menor)
  const sortedStats = [...stats].sort((a, b) => b.pointsEarned - a.pointsEarned)

  // Top 3
  const topThree = sortedStats.slice(0, 3)

  const toggleRow = (statId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(statId)) {
      newExpanded.delete(statId)
    } else {
      newExpanded.add(statId)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jugadores</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">
              Participantes en el torneo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPointsAwarded}</div>
            <p className="text-xs text-muted-foreground">
              Puntos asignados al ranking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totalPointsAwarded / stats.length)}
            </div>
            <p className="text-xs text-muted-foreground">
              Puntos por jugador
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Podio */}
      {topThree.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Podio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {topThree.map((stat, index) => (
                <div
                  key={stat.id}
                  className={cn(
                    "relative rounded-lg border p-4 transition-all",
                    index === 0 && "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
                    index === 1 && "border-gray-400 bg-gray-50/50 dark:bg-gray-950/20",
                    index === 2 && "border-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <div className="absolute -top-3 left-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold",
                        index === 0 && "border-yellow-500 bg-yellow-500 text-white",
                        index === 1 && "border-gray-400 bg-gray-400 text-white",
                        index === 2 && "border-amber-600 bg-amber-600 text-white"
                      )}
                    >
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {index + 1}°
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    <p className="font-semibold">
                      {stat.player.firstName} {stat.player.lastName}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Puntos</span>
                      <span className="font-bold text-lg text-foreground">{stat.pointsEarned}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Posición Final</span>
                      <span>{stat.finalPosition || "N/A"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla Completa */}
      <Card>
        <CardHeader>
          <CardTitle>Puntos Asignados al Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Jugador</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Pos. Final</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">PJ</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">PG</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Sets</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Games</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Puntos</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, index) => (
                  <React.Fragment key={stat.id}>
                    <tr
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        index < 3 && "bg-muted/20",
                        expandedRows.has(stat.id) && "border-b-0"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                          index < 3
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline">
                          {stat.finalPosition || "N/A"}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4 text-sm">
                        {stat.matchesPlayed}
                      </td>
                      <td className="text-center py-3 px-4 text-sm">
                        {stat.matchesWon}
                      </td>
                      <td className="text-center py-3 px-4 text-sm text-muted-foreground">
                        {stat.setsWon}-{stat.setsLost}
                      </td>
                      <td className="text-center py-3 px-4 text-sm text-muted-foreground">
                        {stat.gamesWon}-{stat.gamesLost}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-bold text-lg text-primary">
                          {stat.pointsEarned}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(stat.id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedRows.has(stat.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    {stat.pointsBreakdown && expandedRows.has(stat.id) && (
                      <tr className={cn(
                        "border-b",
                        index < 3 && "bg-muted/10"
                      )}>
                        <td colSpan={9} className="py-4 px-6">
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Info className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-sm">Desglose del Cálculo de Puntos</h4>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {/* Columna Izquierda */}
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Participación base:</span>
                                  <span className="font-mono font-semibold">+{stat.pointsBreakdown.participationPoints}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {stat.finalPosition
                                      ? `Posición ${stat.finalPosition}° (${stat.pointsBreakdown.positionPercentage}%):`
                                      : 'Posición final (sin asignar):'}
                                  </span>
                                  <span className="font-mono font-semibold">+{stat.pointsBreakdown.positionPoints}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Victorias ({stat.pointsBreakdown.victoriesCount} × {stat.pointsBreakdown.victoryBonusPerWin}):
                                  </span>
                                  <span className="font-mono font-semibold">+{stat.pointsBreakdown.victoryBonus}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Sets ganados ({stat.pointsBreakdown.setsCount} × {stat.pointsBreakdown.setBonusPerSet}):
                                  </span>
                                  <span className="font-mono font-semibold">+{stat.pointsBreakdown.setBonus}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                  <span className="font-medium">Subtotal:</span>
                                  <span className="font-mono font-bold">{stat.pointsBreakdown.subtotal}</span>
                                </div>
                              </div>

                              {/* Columna Derecha */}
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Multiplicador torneo (×{stat.pointsBreakdown.tournamentMultiplier}):
                                  </span>
                                  <span className="font-mono font-semibold">{stat.pointsBreakdown.afterTournamentMultiplier}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Multiplicador participantes (×{stat.pointsBreakdown.participantMultiplier}):
                                  </span>
                                  <span className="font-mono font-semibold">{stat.pointsBreakdown.finalTotal}</span>
                                </div>
                                <div className="flex justify-between pt-2 mt-2 border-t-2 border-primary/20">
                                  <span className="font-bold text-primary">TOTAL FINAL:</span>
                                  <span className="font-mono font-bold text-xl text-primary">{stat.pointsBreakdown.finalTotal}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Mobile Table */}
            <table className="w-full md:hidden text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground w-6">#</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground min-w-0">Jugador</th>
                  <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-8" title="Posición Final">Pos</th>
                  <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-10" title="Puntos Ganados">PTS</th>
                  <th className="w-5"></th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, index) => (
                  <React.Fragment key={`mobile-${stat.id}`}>
                    <tr
                      className={cn(
                        "border-b transition-colors cursor-pointer",
                        index < 3 && "bg-muted/20",
                        expandedRows.has(stat.id) && "border-b-0"
                      )}
                      onClick={() => toggleRow(stat.id)}
                    >
                      <td className="py-2 px-1">
                        <div className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold",
                          index < 3
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-2 px-1 max-w-0">
                        <p className="text-[10px] font-medium leading-tight line-clamp-2 overflow-hidden text-ellipsis">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                      </td>
                      <td className="text-center py-2 px-0.5">
                        <span className="text-[10px] font-semibold">
                          {stat.finalPosition || "-"}
                        </span>
                      </td>
                      <td className="text-center py-2 px-0.5">
                        <span className="text-[10px] font-bold text-primary">
                          {stat.pointsEarned}
                        </span>
                      </td>
                      <td className="py-2 px-0.5">
                        {expandedRows.has(stat.id) ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                    {expandedRows.has(stat.id) && (
                      <tr className={cn(
                        "border-b",
                        index < 3 && "bg-muted/10"
                      )}>
                        <td colSpan={5} className="py-3 px-2">
                          <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                            {/* Estadísticas básicas */}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Jugados:</span>
                                <span className="font-medium">{stat.matchesPlayed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ganados:</span>
                                <span className="font-medium text-green-600">{stat.matchesWon}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sets:</span>
                                <span className="font-medium">{stat.setsWon}-{stat.setsLost}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Games:</span>
                                <span className="font-medium">{stat.gamesWon}-{stat.gamesLost}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground font-semibold">Puntos:</span>
                                <span className="font-bold text-primary">{stat.pointsEarned}</span>
                              </div>
                            </div>

                            {/* Desglose de puntos si existe */}
                            {stat.pointsBreakdown && (
                              <div className="border-t pt-3 space-y-2">
                                <h5 className="text-[10px] font-semibold flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  Desglose de Puntos
                                </h5>
                                <div className="space-y-1 text-[9px]">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Participación:</span>
                                    <span className="font-mono">+{stat.pointsBreakdown.participationPoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Posición ({stat.pointsBreakdown.positionPercentage}%):</span>
                                    <span className="font-mono">+{stat.pointsBreakdown.positionPoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Victorias ({stat.pointsBreakdown.victoriesCount}):</span>
                                    <span className="font-mono">+{stat.pointsBreakdown.victoryBonus}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sets ({stat.pointsBreakdown.setsCount}):</span>
                                    <span className="font-mono">+{stat.pointsBreakdown.setBonus}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-1 mt-1">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-mono font-semibold">{stat.pointsBreakdown.subtotal}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">× Torneo ({stat.pointsBreakdown.tournamentMultiplier}):</span>
                                    <span className="font-mono">{stat.pointsBreakdown.afterTournamentMultiplier}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">× Participantes ({stat.pointsBreakdown.participantMultiplier}):</span>
                                    <span className="font-mono">{stat.pointsBreakdown.finalTotal}</span>
                                  </div>
                                  <div className="flex justify-between border-t-2 border-primary/20 pt-1.5 mt-1.5">
                                    <span className="font-bold text-primary">TOTAL:</span>
                                    <span className="font-mono font-bold text-primary">{stat.pointsBreakdown.finalTotal}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
