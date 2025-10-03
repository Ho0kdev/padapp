"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TournamentStatusManager } from "./tournament-status-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Calendar,
  Clock,
  Edit,
  MapPin,
  MoreHorizontal,
  Trophy,
  Users,
  DollarSign,
  Settings,
  Trash2,
  Download,
  Copy,
  Share2,
  GitBranch
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TournamentWithDetails } from "@/types/tournament"
import { tournamentStatusOptions, tournamentTypeOptions } from "@/lib/validations/tournament"
import { useToast } from "@/hooks/use-toast"
import {
  getGenderRestrictionStyle,
  getGenderRestrictionLabel,
  getCategoryLevelStyle,
  formatCategoryLevel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel
} from "@/lib/utils/status-styles"

interface TournamentDetailProps {
  tournament: TournamentWithDetails
  currentUserId: string
}

export function TournamentDetail({ tournament, currentUserId }: TournamentDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOwner = tournament.organizerId === currentUserId
  const statusConfig = tournamentStatusOptions.find(s => s.value === tournament.status)
  const typeLabel = tournamentTypeOptions.find(t => t.value === tournament.type)?.label

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar torneo")
      }

      toast({
        title: "Éxito",
        description: "Torneo eliminado correctamente",
        variant: "success",
      })

      router.push("/dashboard/tournaments")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar torneo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Enlace copiado",
        description: "El enlace del torneo ha sido copiado al portapapeles",
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
            <TournamentStatusManager
              tournamentId={tournament.id}
              currentStatus={tournament.status}
              isOwner={isOwner}
            />
          </div>
          {tournament.description && (
            <p className="text-muted-foreground">{tournament.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {typeLabel}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {tournament._count.teams} equipos
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <Link href={`/dashboard/tournaments/${tournament.id}/brackets`}>
              <Button variant="default">
                <GitBranch className="mr-2 h-4 w-4" />
                Gestionar Brackets
              </Button>
            </Link>
          )}

          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar enlace
          </Button>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={tournament._count.teams > 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Equipos</p>
                <p className="text-2xl font-bold">
                  {tournament._count.teams}
                  {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Partidos</p>
                <p className="text-2xl font-bold">{tournament._count.matches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Premio</p>
                <p className="text-2xl font-bold">${tournament.prizePool}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{tournament.categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="teams">Equipos</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
          <TabsTrigger value="bracket">Llaves</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organizador</p>
                  <p>{tournament.organizer.name || tournament.organizer.email}</p>
                </div>

                {tournament.mainClub && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Club Principal</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{tournament.mainClub.name}, {tournament.mainClub.city}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechas Importantes</p>
                  <div className="space-y-1 text-sm">
                    {tournament.registrationStart && (
                      <div>Inscripciones: {format(new Date(tournament.registrationStart), "dd/MM/yyyy", { locale: es })} - {format(new Date(tournament.registrationEnd!), "dd/MM/yyyy", { locale: es })}</div>
                    )}
                    <div>Torneo: {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}{tournament.tournamentEnd && ` - ${format(new Date(tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`}</div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Participación</p>
                  <div className="space-y-1 text-sm">
                    <div>Mínimo: {tournament.minParticipants} equipos</div>
                    {tournament.maxParticipants && <div>Máximo: {tournament.maxParticipants} equipos</div>}
                    <div>Tarifa: ${tournament.registrationFee}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reglas del Juego */}
            <Card>
              <CardHeader>
                <CardTitle>Reglas del Juego</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Sets a ganar</p>
                    <p>{tournament.setsToWin}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Games por set</p>
                    <p>{tournament.gamesToWinSet}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Tiebreak en</p>
                    <p>{tournament.tiebreakAt}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Punto de oro</p>
                    <p>{tournament.goldenPoint ? "Sí" : "No"}</p>
                  </div>
                </div>

                {tournament.rules && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Reglas Especiales</p>
                    <p className="text-sm whitespace-pre-wrap">{tournament.rules}</p>
                  </div>
                )}

                {tournament.prizesDescription && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Premios</p>
                    <p className="text-sm whitespace-pre-wrap">{tournament.prizesDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categorías */}
          <Card>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.categories.map((tournamentCategory) => (
                  <div key={tournamentCategory.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tournamentCategory.category.name}</h4>
                      <Badge variant="outline">{tournamentCategory.teams.length} equipos</Badge>
                    </div>
                    {tournamentCategory.category.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {tournamentCategory.category.description}
                      </p>
                    )}
                    {tournamentCategory.maxTeams && (
                      <p className="text-sm">Máximo: {tournamentCategory.maxTeams} equipos</p>
                    )}
                    {tournamentCategory.registrationFee && (
                      <p className="text-sm">Tarifa: ${tournamentCategory.registrationFee}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clubes */}
          {tournament.clubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clubes Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tournament.clubs.map((tournamentClub) => (
                    <div key={tournamentClub.club.id} className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{tournamentClub.club.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>{tournament.type === 'AMERICANO_SOCIAL' ? 'Jugadores Inscritos' : 'Equipos Inscritos'}</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.type === 'AMERICANO_SOCIAL' ? (
                // Vista para Americano Social - Jugadores individuales
                tournament.registrations && tournament.registrations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay jugadores inscritos aún
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tournament.categories.map((category) => {
                      const categoryPlayers = tournament.registrations?.filter(
                        reg => reg.categoryId === category.categoryId
                      ) || []

                      if (categoryPlayers.length === 0) return null

                      return (
                        <div key={category.id}>
                          <h4 className="font-medium mb-3">{category.category.name}</h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {categoryPlayers.map((registration) => (
                              <div key={registration.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium">
                                    {registration.player.firstName} {registration.player.lastName}
                                  </p>
                                  <Badge className={getRegistrationStatusStyle(registration.registrationStatus)}>
                                    {getRegistrationStatusLabel(registration.registrationStatus)}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Puntos: {registration.player.rankingPoints}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {registration.player.primaryCategory && (
                                      <Badge className={getCategoryLevelStyle(registration.player.primaryCategory.level)}>
                                        {formatCategoryLevel(registration.player.primaryCategory.name, registration.player.primaryCategory.level)}
                                      </Badge>
                                    )}
                                    {registration.player.gender && (
                                      <Badge className={getGenderRestrictionStyle(registration.player.gender)}>
                                        {getGenderRestrictionLabel(registration.player.gender)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                // Vista para torneos convencionales - Equipos
                tournament.teams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay equipos inscritos aún
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tournament.categories.map((category) => {
                      const categoryTeams = tournament.teams.filter(
                        team => team.categoryId === category.categoryId
                      )

                      if (categoryTeams.length === 0) return null

                      return (
                        <div key={category.id}>
                          <h4 className="font-medium mb-3">{category.category.name}</h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {categoryTeams.map((team) => (
                              <div key={team.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium">
                                    {team.name || `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`}
                                  </p>
                                  <Badge className={getRegistrationStatusStyle(team.registration1.registrationStatus)}>
                                    {getRegistrationStatusLabel(team.registration1.registrationStatus)}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    <div>{team.registration1.player.firstName} {team.registration1.player.lastName}</div>
                                    <div>{team.registration2.player.firstName} {team.registration2.player.lastName}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.matches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay partidos programados aún
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Lista de partidos aquí */}
                  <p className="text-center text-muted-foreground py-8">
                    Funcionalidad de partidos en desarrollo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bracket">
          <Card>
            <CardHeader>
              <CardTitle>Llaves del Torneo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Funcionalidad de llaves en desarrollo
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El torneo "{tournament.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}