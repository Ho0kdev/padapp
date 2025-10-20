"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Square,
  Building,
  DollarSign,
  Lightbulb,
  Home,
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Users,
  Eye,
  CheckCircle,
  Trees,
  Layers,
  Grid
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  getClubStatusStyle,
  getClubStatusLabel,
  getCourtStatusStyle,
  getCourtStatusLabel,
  getCourtSurfaceStyle,
  getCourtSurfaceLabel,
  getMatchStatusStyle,
  getMatchStatusLabel,
  getTournamentStatusStyle,
  getTournamentStatusLabel
} from "@/lib/utils/status-styles"

interface Player {
  firstName: string
  lastName: string
}

interface Registration {
  player: Player
}

interface Team {
  id: string
  name?: string
  registration1: Registration
  registration2: Registration
}

interface Tournament {
  id: string
  name: string
  status: string
}

interface Match {
  id: string
  status: string
  scheduledAt?: string
  tournament: Tournament
  team1?: Team
  team2?: Team
  winnerTeam?: {
    id: string
  }
}

interface Club {
  id: string
  name: string
  status: string
}

interface Court {
  id: string
  name: string
  surface: string
  hasLighting: boolean
  hasRoof: boolean
  isOutdoor: boolean
  hasPanoramicGlass: boolean
  hasConcreteWall: boolean
  hasNet4m: boolean
  status: string
  hourlyRate?: number
  notes?: string
  club: Club
  matches: Match[]
  _count: {
    matches: number
  }
}

interface CourtDetailProps {
  court: Court
  currentUserId: string
}

export function CourtDetail({ court, currentUserId }: CourtDetailProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { isAdminOrClubAdmin } = useAuth()

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/clubs/${court.club.id}/courts/${court.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar cancha")
      }

      toast({
        title: "✅ Cancha desactivada",
        description: "La cancha ha sido desactivada exitosamente",
        variant: "success",
      })

      router.push(`/dashboard/clubs/${court.club.id}`)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al desactivar cancha",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleActivate = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/clubs/${court.club.id}/courts/${court.id}`, {
        method: "PATCH",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al activar cancha")
      }

      toast({
        title: "✅ Cancha activada",
        description: "La cancha ha sido activada exitosamente",
        variant: "success",
      })

      // Recargar la página para mostrar el nuevo estado
      window.location.reload()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al activar cancha",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setActivateDialogOpen(false)
    }
  }


  const formatTeamName = (team: Team) => {
    if (team.name) return team.name
    return `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{court.name}</h1>
            <Badge variant="outline" className={getCourtStatusStyle(court.status)}>
              {getCourtStatusLabel(court.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {court.club.name}
          </p>
          {court.notes && (
            <p className="text-muted-foreground max-w-3xl">{court.notes}</p>
          )}
        </div>

        {isAdminOrClubAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/dashboard/clubs/${court.club.id}/courts/${court.id}/edit`}>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              {court.status !== "UNAVAILABLE" ? (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desactivar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-green-600"
                  onClick={() => setActivateDialogOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Información General</TabsTrigger>
          <TabsTrigger value="matches">Partidos ({court._count.matches})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  Información de la Cancha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Superficie</h4>
                  <Badge variant="outline" className={getCourtSurfaceStyle(court.surface)}>
                    {getCourtSurfaceLabel(court.surface)}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Estado</h4>
                  <Badge variant="outline" className={getCourtStatusStyle(court.status)}>
                    {getCourtStatusLabel(court.status)}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Características</h4>
                  <div className="flex flex-wrap gap-2">
                    {court.hasLighting && (
                      <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        <Lightbulb className="h-3 w-3" />
                        Iluminación
                      </div>
                    )}
                    {court.hasRoof && (
                      <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        <Home className="h-3 w-3" />
                        Techada
                      </div>
                    )}
                    {court.isOutdoor && (
                      <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        <Trees className="h-3 w-3" />
                        Juego Exterior
                      </div>
                    )}
                    {court.hasPanoramicGlass && (
                      <div className="flex items-center gap-1 text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">
                        <Eye className="h-3 w-3" />
                        Cristal Panorámico
                      </div>
                    )}
                    {court.hasConcreteWall && (
                      <div className="flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        <Layers className="h-3 w-3" />
                        Pared de Concreto
                      </div>
                    )}
                    {court.hasNet4m && (
                      <div className="flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        <Grid className="h-3 w-3" />
                        Red a 4mts
                      </div>
                    )}
                    {!court.hasLighting && !court.hasRoof && !court.isOutdoor && !court.hasPanoramicGlass && !court.hasConcreteWall && !court.hasNet4m && (
                      <span className="text-muted-foreground text-sm">Sin características especiales</span>
                    )}
                  </div>
                </div>

                {court.hourlyRate && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Precio por Hora</h4>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">${court.hourlyRate}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información del club */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Club
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{court.club.name}</h4>
                  <div className="mt-1">
                    <Badge variant="outline" className={getClubStatusStyle(court.club.status)}>
                      {getClubStatusLabel(court.club.status)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Estadísticas</h4>
                  <div className="flex items-center gap-1 text-sm">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span>{court._count.matches} partidos programados</span>
                  </div>
                </div>

                <Separator />

                <Link href={`/dashboard/clubs/${court.club.id}`}>
                  <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles del club
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              {court.matches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay partidos programados en esta cancha
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Torneo</TableHead>
                      <TableHead>Equipos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {court.matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          {match.scheduledAt ? (
                            <div>
                              <div className="font-medium">
                                {new Date(match.scheduledAt).toLocaleDateString('es')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(match.scheduledAt).toLocaleTimeString('es', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin programar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{match.tournament.name}</div>
                            <div className="text-sm">
                              <Badge variant="outline" className={getTournamentStatusStyle(match.tournament.status)}>
                                {getTournamentStatusLabel(match.tournament.status)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {match.team1 && (
                              <div className="text-sm">
                                <span className={match.winnerTeam?.id === match.team1.id ? "font-medium" : ""}>
                                  {formatTeamName(match.team1)}
                                </span>
                              </div>
                            )}
                            {match.team2 && (
                              <div className="text-sm">
                                <span className={match.winnerTeam?.id === match.team2.id ? "font-medium" : ""}>
                                  {formatTeamName(match.team2)}
                                </span>
                              </div>
                            )}
                            {!match.team1 && !match.team2 && (
                              <span className="text-muted-foreground text-sm">Equipos por definir</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMatchStatusStyle(match.status)}>
                            {getMatchStatusLabel(match.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/tournaments/${match.tournament.id}/matches/${match.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la cancha "{court.name}". La cancha no será eliminada pero no estará disponible para nuevos partidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para activar */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará la cancha "{court.name}". La cancha volverá a estar disponible para programar partidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Activando..." : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}