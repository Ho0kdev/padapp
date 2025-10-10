"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Users
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { getTournamentStatusStyle, getTournamentStatusLabel } from "@/lib/utils/status-styles"

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

export function RankingDetail({ ranking, currentUserId }: RankingDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newPoints, setNewPoints] = useState(ranking.currentPoints.toString())
  const [updating, setUpdating] = useState(false)

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
          title: "Puntos actualizados",
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
        title: "Error",
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
        title: "Enlace copiado",
        description: "El enlace del ranking ha sido copiado al portapapeles",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {ranking.player.firstName} {ranking.player.lastName}
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