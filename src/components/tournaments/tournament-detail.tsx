"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TournamentStatusManager } from "./tournament-status-manager"
import { GroupStandingsAndMatches } from "@/components/brackets/group-standings-and-matches"
import { BracketTree } from "@/components/brackets/bracket-tree"
import { BracketVisualization } from "@/components/brackets/bracket-visualization"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  GitBranch,
  CalendarDays,
  LayoutList
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
  getRegistrationStatusLabel,
  getTeamStatusStyle,
  getTeamStatusLabel
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
              {tournament.teams.length} equipos
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
                  disabled={tournament.teams.length > 0}
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
                  {tournament.teams.length}
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
          <TabsTrigger value="matches">Clasificación</TabsTrigger>
          <TabsTrigger value="bracket">Llaves</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left: Info */}
                  <div className="space-y-4">
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
                  </div>

                  {/* Right: Flyer */}
                  {tournament.logoUrl && (
                    <div className="flex items-center justify-center">
                      <div className="relative w-full aspect-[3/4] max-w-sm overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={tournament.logoUrl}
                          alt={`Flyer ${tournament.name}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
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
                                  <Badge className={getTeamStatusStyle(team.status)}>
                                    {getTeamStatusLabel(team.status)}
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
              <CardTitle>Clasificación</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.type === 'GROUP_STAGE_ELIMINATION' || tournament.type === 'ROUND_ROBIN' ? (
                tournament.categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay categorías disponibles
                  </p>
                ) : (
                  <ClassificationView tournament={tournament} />
                )
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  La clasificación por grupos solo está disponible para torneos de tipo Round Robin o Grupos + Eliminación
                </p>
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
              {tournament.categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay categorías disponibles
                </p>
              ) : (
                <BracketView tournament={tournament} />
              )}
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

// Componente interno para manejar la selección de categoría y zona
function ClassificationView({ tournament }: { tournament: TournamentWithDetails }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    tournament.categories[0]?.categoryId || ""
  )
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string>("")
  const [isLoadingZones, setIsLoadingZones] = useState(false)

  // Cargar zonas cuando cambia la categoría
  const fetchZones = async (categoryId: string) => {
    if (!categoryId) return

    setIsLoadingZones(true)
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/groups?categoryId=${categoryId}`
      )

      if (!response.ok) {
        throw new Error("Error al cargar los grupos")
      }

      const data = await response.json()
      const zoneList = data.zones.map((z: any) => ({ id: z.id, name: z.name }))
      setZones(zoneList)

      // Seleccionar la primera zona automáticamente
      if (zoneList.length > 0) {
        setSelectedZoneId(zoneList[0].id)
      }
    } catch (error) {
      console.error("Error fetching zones:", error)
      setZones([])
      setSelectedZoneId("")
    } finally {
      setIsLoadingZones(false)
    }
  }

  // Cargar zonas al montar el componente
  useEffect(() => {
    if (selectedCategoryId) {
      fetchZones(selectedCategoryId)
    }
  }, [])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    fetchZones(categoryId)
  }

  return (
    <div className="space-y-4">
      {/* Selectores */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Categoría</label>
          <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {tournament.categories.map((category) => (
                <SelectItem key={category.id} value={category.categoryId}>
                  {category.category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Grupo</label>
          <Select
            value={selectedZoneId}
            onValueChange={setSelectedZoneId}
            disabled={isLoadingZones || zones.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un grupo" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mostrar clasificación de la zona seleccionada */}
      {selectedCategoryId && selectedZoneId && (
        <GroupStandingsAndMatches
          tournamentId={tournament.id}
          categoryId={selectedCategoryId}
          selectedZoneId={selectedZoneId}
        />
      )}

      {!selectedZoneId && !isLoadingZones && zones.length === 0 && selectedCategoryId && (
        <p className="text-center text-muted-foreground py-8">
          No hay grupos creados para esta categoría. Genera el bracket primero.
        </p>
      )}
    </div>
  )
}

// Componente interno para mostrar las llaves con selector de categoría
function BracketView({ tournament }: { tournament: TournamentWithDetails }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    tournament.categories[0]?.categoryId || ""
  )
  const [bracketData, setBracketData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree")

  const fetchBracketData = async (categoryId: string) => {
    if (!categoryId) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/bracket?categoryId=${categoryId}`
      )

      if (!response.ok) {
        throw new Error("Error al cargar las llaves")
      }

      const data = await response.json()
      setBracketData(data)
    } catch (error) {
      console.error("Error fetching bracket:", error)
      setBracketData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCategoryId) {
      fetchBracketData(selectedCategoryId)
    }
  }, [selectedCategoryId])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
  }

  const selectedCategory = tournament.categories.find(
    c => c.categoryId === selectedCategoryId
  )

  // Determinar si debe mostrar vista de árbol
  const shouldShowTree = [
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'GROUP_STAGE_ELIMINATION'
  ].includes(tournament.type)

  return (
    <div className="space-y-4">
      {/* Selector de Categoría */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Categoría</label>
          <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {tournament.categories.map((category) => (
                <SelectItem key={category.id} value={category.categoryId}>
                  {category.category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Vista - Solo si debe mostrar árbol */}
        {shouldShowTree && bracketData && bracketData.matches.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === "tree" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("tree")}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Árbol
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !bracketData || bracketData.matches.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No hay llaves generadas para esta categoría. Ve a "Gestionar Brackets" para generarlas.
        </p>
      ) : (
        <div className="mt-6">
          {shouldShowTree && viewMode === "tree" ? (
            <BracketTree
              tournamentId={tournament.id}
              categoryId={selectedCategoryId}
              categoryName={selectedCategory?.category.name || ""}
              matches={bracketData.matches}
              rounds={bracketData.rounds}
              totalRounds={bracketData.totalRounds}
              onRefresh={() => fetchBracketData(selectedCategoryId)}
            />
          ) : (
            <BracketVisualization
              tournamentId={tournament.id}
              categoryId={selectedCategoryId}
              refreshTrigger={0}
            />
          )}
        </div>
      )}
    </div>
  )
}