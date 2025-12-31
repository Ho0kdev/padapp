"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  Edit,
  MoreHorizontal,
  Trophy,
  User,
  Award,
  Copy,
  TrendingUp,
  Activity,
  Users,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { getTournamentStatusStyle, getTournamentStatusLabel } from "@/lib/utils/status-styles"
import { cn } from "@/lib/utils"

interface RankingWithDetails {
  id: string
  playerId: string
  categoryId: string
  currentPoints: number
  seasonYear: number
  lastUpdated: string
  player: {
    id: string
    firstName: string
    lastName: string
    user: {
      id: string
      name: string
      email: string
    }
    registrations: {
      id: string
      tournament: {
        id: string
        name: string
        status: string
        tournamentStart: string
        tournamentEnd?: string | null
      }
      category: {
        id: string
        name: string
      }
    }[]
  }
  category: {
    id: string
    name: string
    description?: string
    type: string
    genderRestriction?: string
    _count: {
      rankings: number
    }
  }
}

interface RankingDetailProps {
  ranking: RankingWithDetails
  currentUserId: string
}

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

interface TournamentStat {
  id: string
  tournamentId: string
  matchesPlayed: number
  matchesWon: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  pointsEarned: number
  finalPosition: number | null
  pointsBreakdown?: PointsBreakdown
  tournament: {
    id: string
    name: string
    status: string
    type: string
    rankingPoints: number
    tournamentStart: string
    tournamentEnd: string | null
  }
}

export function RankingDetail({ ranking, currentUserId }: RankingDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newPoints, setNewPoints] = useState(ranking.currentPoints.toString())
  const [updating, setUpdating] = useState(false)
  const [tournamentStats, setTournamentStats] = useState<TournamentStat[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const getTypeBadge = (type: string) => {
    const variants = {
      AGE: "bg-blue-100 text-blue-800",
      SKILL: "bg-green-100 text-green-800",
      RANKING: "bg-purple-100 text-purple-800",
      GENDER: "bg-pink-100 text-pink-800",
      MIXED: "bg-orange-100 text-orange-800"
    }

    const labels = {
      AGE: "Por Edad",
      SKILL: "Por Habilidad",
      RANKING: "Por Ranking",
      GENDER: "Por Género",
      MIXED: "Mixta"
    }

    return (
      <Badge variant="outline" className={variants[type as keyof typeof variants]}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    )
  }

  const getGenderBadge = (gender?: string) => {
    if (!gender) return null

    const variants = {
      MALE: "bg-blue-100 text-blue-800",
      FEMALE: "bg-pink-100 text-pink-800",
      MIXED: "bg-purple-100 text-purple-800"
    }

    const labels = {
      MALE: "Masculino",
      FEMALE: "Femenino",
      MIXED: "Mixto"
    }

    return (
      <Badge variant="outline" className={variants[gender as keyof typeof variants]}>
        {labels[gender as keyof typeof labels] || gender}
      </Badge>
    )
  }


  const handleEditPoints = async () => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/rankings/${ranking.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPoints: parseInt(newPoints),
          reason: "Ajuste manual desde página de detalle"
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ Puntos actualizados",
          description: "Los puntos del ranking han sido actualizados exitosamente",
          variant: "success",
        })
        router.refresh()
        setEditDialogOpen(false)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar puntos")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al actualizar puntos",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "✅ Enlace copiado",
        description: "El enlace del ranking ha sido copiado al portapapeles",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const allTournaments = ranking.player.registrations
    .map(reg => ({
      ...reg,
      partner: 'Individual' // Registrations are individual, not team-based in this view
    }))
    .sort((a, b) => new Date(b.tournament.tournamentStart).getTime() - new Date(a.tournament.tournamentStart).getTime())

  const activeTournaments = allTournaments.filter(t =>
    t.tournament.status !== "COMPLETED" && t.tournament.status !== "CANCELLED"
  )

  useEffect(() => {
    fetchTournamentStats()
  }, [ranking.playerId])

  const fetchTournamentStats = async () => {
    try {
      setLoadingStats(true)
      const response = await fetch(`/api/players/${ranking.playerId}/tournament-stats`)
      if (response.ok) {
        const data = await response.json()
        setTournamentStats(data.stats || [])
      }
    } catch (error) {
      console.error("Error fetching tournament stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const toggleRow = (statId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(statId)) {
      newExpanded.delete(statId)
    } else {
      newExpanded.add(statId)
    }
    setExpandedRows(newExpanded)
  }

  const totalPointsEarned = tournamentStats.reduce((sum, stat) => sum + stat.pointsEarned, 0)

  const playerName = `${ranking.player.firstName} ${ranking.player.lastName}`

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Rankings", href: "/dashboard/rankings" },
          { label: playerName }
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {playerName}
            </h1>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Ranking
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg text-muted-foreground">{ranking.category.name}</span>
            {getTypeBadge(ranking.category.type)}
            {ranking.category.genderRestriction && getGenderBadge(ranking.category.genderRestriction)}
          </div>
          {ranking.category.description && (
            <p className="text-muted-foreground">{ranking.category.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              {ranking.currentPoints} puntos
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Temporada {ranking.seasonYear}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {ranking.category._count.rankings} jugadores en categoría
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar enlace
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(isAdminOrClubAdmin || ranking.player.user.id === currentUserId) && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/users/${ranking.player.user.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    Ver perfil completo
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdminOrClubAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setNewPoints(ranking.currentPoints.toString())
                      setEditDialogOpen(true)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar puntos
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Puntos Actuales</p>
                <p className="text-2xl font-bold">{ranking.currentPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Torneos Activos</p>
                <p className="text-2xl font-bold">{activeTournaments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Torneos Totales</p>
                <p className="text-2xl font-bold">{allTournaments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Temporada</p>
                <p className="text-2xl font-bold">{ranking.seasonYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="tournaments">Historial de Torneos</TabsTrigger>
          <TabsTrigger value="points">Historial de Puntos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información del Jugador */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Jugador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                  <p>{ranking.player.firstName} {ranking.player.lastName}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{ranking.player.user.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre de Usuario</p>
                  <p>{ranking.player.user.name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Información del Ranking */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Ranking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                  <div className="flex items-center gap-2">
                    <span>{ranking.category.name}</span>
                    {getTypeBadge(ranking.category.type)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Puntos Actuales</p>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{ranking.currentPoints}</span>
                    <span className="text-sm text-muted-foreground">pts</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Temporada</p>
                  <p>{ranking.seasonYear}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                  <p>{format(new Date(ranking.lastUpdated), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Torneos</CardTitle>
            </CardHeader>
            <CardContent>
              {allTournaments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este jugador no ha participado en ningún torneo aún
                </p>
              ) : (
                <div className="space-y-4">
                  {allTournaments.map((tournament, index) => (
                    <div key={`${tournament.id}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/tournaments/${tournament.tournament.id}`}
                            className="font-medium hover:underline"
                          >
                            {tournament.tournament.name}
                          </Link>
                          <Badge variant="outline" className={getTournamentStatusStyle(tournament.tournament.status)}>
                            {getTournamentStatusLabel(tournament.tournament.status)}
                          </Badge>
                        </div>
                        <Badge variant="outline">
                          {tournament.category.name}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <strong>Compañero:</strong> {tournament.partner}
                        </div>
                        <div>
                          <strong>Fechas:</strong> {format(new Date(tournament.tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
                          {tournament.tournament.tournamentEnd && (
                            ` - ${format(new Date(tournament.tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Historial de Puntos por Torneo</CardTitle>
                {!loadingStats && (
                  <Badge variant="outline" className="text-sm">
                    Total: {totalPointsEarned} puntos
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : tournamentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay estadísticas de puntos disponibles aún
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Torneo</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Pos.</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">PJ</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">PG</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Sets</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Puntos</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentStats.map((stat) => (
                        <React.Fragment key={stat.id}>
                          <tr className={cn(
                            "border-b hover:bg-muted/50 transition-colors",
                            expandedRows.has(stat.id) && "border-b-0"
                          )}>
                            <td className="py-3 px-4">
                              <div>
                                <Link
                                  href={`/dashboard/tournaments/${stat.tournament.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {stat.tournament.name}
                                </Link>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(stat.tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
                                </p>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="outline" className={getTournamentStatusStyle(stat.tournament.status)}>
                                {getTournamentStatusLabel(stat.tournament.status)}
                              </Badge>
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
                            <tr className="border-b">
                              <td colSpan={8} className="py-4 px-6">
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Points Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Puntos de Ranking</DialogTitle>
            <DialogDescription>
              Actualizar los puntos para {ranking.player.firstName} {ranking.player.lastName} en la categoría {ranking.category.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="points">Puntos Actuales</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                placeholder="Ingrese los nuevos puntos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditPoints}
              disabled={updating || !newPoints || newPoints === ranking.currentPoints.toString()}
            >
              {updating ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}