"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Loader2,
  Trophy,
  Users,
  Play,
  Edit,
  Calendar,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Copy,
  Settings,
  Download,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TournamentStatusManager } from "../tournament-status-manager"
import { tournamentStatusOptions, tournamentTypeOptions } from "@/lib/validations/tournament"
import { GlobalRankingTable } from "./global-ranking-table"
import { PoolCard } from "./pool-card"
import { CategorySelector } from "./category-selector"
import { AmericanoMatchCard } from "./americano-match-card"
import { AmericanoMatchResultDialog } from "./americano-match-result-dialog"
import {
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  getGenderRestrictionStyle,
  getGenderRestrictionLabel,
  getCategoryLevelStyle,
  formatCategoryLevel
} from "@/lib/utils/status-styles"

interface AmericanoSocialDetailProps {
  tournament: any
  categoryId: string
  currentUserId: string
}

export function AmericanoSocialDetail({
  tournament,
  categoryId,
  currentUserId
}: AmericanoSocialDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [existingPoolsInfo, setExistingPoolsInfo] = useState<{
    totalPools: number
    totalMatches: number
    completedMatches: number
    numberOfRounds: number
    poolsPerRound: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pools, setPools] = useState<any[]>([])
  const [ranking, setRanking] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  const isOwner = tournament.organizerId === currentUserId
  const canManage = isOwner || isAdminOrClubAdmin
  const statusConfig = tournamentStatusOptions.find(s => s.value === tournament.status)
  const typeLabel = tournamentTypeOptions.find(t => t.value === tournament.type)?.label

  useEffect(() => {
    loadData()
    loadRegistrations()
  }, [categoryId])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tournaments/${tournament.id}/americano-social/pools?categoryId=${categoryId}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error cargando datos")
      }

      const data = await response.json()
      setPools(data.pools || [])
      setRanking(data.ranking || [])
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrations = async () => {
    try {
      const response = await fetch(
        `/api/registrations?tournamentId=${tournament.id}&categoryId=${categoryId}&limit=1000`
      )

      if (!response.ok) {
        throw new Error("Error cargando inscripciones")
      }

      const data = await response.json()
      setRegistrations(data.registrations || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const generatePools = async (force = false) => {
    try {
      // Si no se está forzando y ya hay pools, mostrar confirmación
      if (!force && hasPools) {
        // Calcular información de los pools existentes
        const totalMatches = pools.reduce((sum, pool) => sum + (pool.matches?.length || 0), 0)
        const completedMatches = pools.reduce((sum, pool) => {
          return sum + (pool.matches?.filter((m: any) => m.status === 'COMPLETED').length || 0)
        }, 0)

        // Calcular número de rondas únicas
        const uniqueRounds = new Set(pools.map((pool: any) => pool.roundNumber))
        const numberOfRounds = uniqueRounds.size
        const poolsPerRound = numberOfRounds > 0 ? Math.round(pools.length / numberOfRounds) : 0

        setExistingPoolsInfo({
          totalPools: pools.length,
          totalMatches,
          completedMatches,
          numberOfRounds,
          poolsPerRound
        })
        setRegenerateDialogOpen(true)
        return
      }

      setGenerating(true)

      const response = await fetch(
        `/api/tournaments/${tournament.id}/americano-social/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, force })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error generando pools")
      }

      toast({
        title: "✅ ¡Pools generados!",
        description: data.message,
        variant: "success",
      })

      setRegenerateDialogOpen(false)
      setExistingPoolsInfo(null)
      await loadData()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error generando pools",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmRegenerate = () => {
    setRegenerateDialogOpen(false)
    generatePools(true)
  }

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
        title: "✅ Éxito",
        description: "Torneo eliminado correctamente",
        variant: "success",
      })

      router.push("/dashboard/tournaments")
    } catch (error) {
      toast({
        title: "❌ Error",
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
        title: "✅ Enlace copiado",
        description: "El enlace del torneo ha sido copiado al portapapeles",
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

  const hasPools = pools.length > 0

  // Agrupar pools por ronda
  const poolsByRound = useMemo(() => {
    const grouped = new Map<number, typeof pools>()
    pools.forEach(pool => {
      const roundNumber = pool.roundNumber || 1
      if (!grouped.has(roundNumber)) {
        grouped.set(roundNumber, [])
      }
      grouped.get(roundNumber)!.push(pool)
    })
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])
  }, [pools])

  const numberOfRounds = poolsByRound.length

  // Calcular si hay rondas anteriores con partidos incompletos
  const hasIncompletePreviousRounds = useMemo(() => {
    const incompleteMapp = new Map<number, boolean>()

    poolsByRound.forEach(([roundNum, roundPools]) => {
      // Verificar si la ronda actual tiene partidos incompletos
      const hasIncomplete = roundPools.some(pool =>
        pool.matches?.some((match: any) => match.status !== 'COMPLETED')
      )
      incompleteMapp.set(roundNum, hasIncomplete)
    })

    // Para cada ronda, verificar si ALGUNA ronda anterior tiene partidos incompletos
    const result = new Map<number, boolean>()
    poolsByRound.forEach(([roundNum]) => {
      let hasPreviousIncomplete = false
      for (let i = 1; i < roundNum; i++) {
        if (incompleteMapp.get(i)) {
          hasPreviousIncomplete = true
          break
        }
      }
      result.set(roundNum, hasPreviousIncomplete)
    })

    return result
  }, [poolsByRound])

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
              {registrations.length} jugadores
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && hasPools && (
            <Button variant="default" onClick={() => generatePools(false)} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Regenerar Pools
                </>
              )}
            </Button>
          )}

          {canManage && !hasPools && (
            <Button variant="default" onClick={() => generatePools(false)} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generar Pools
                </>
              )}
            </Button>
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
                  disabled={hasPools}
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
                <p className="text-sm font-medium text-muted-foreground">Jugadores</p>
                <p className="text-2xl font-bold">
                  {registrations.length}
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
                <p className="text-2xl font-bold">{pools.length * 3}</p>
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
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="pools">Pools</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        {/* Tab: Info */}
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
                  <p>{tournament.organizer?.name || tournament.organizer?.email}</p>
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
                      <div>Inscripciones: {format(new Date(tournament.registrationStart), "dd/MM/yyyy", { locale: es })} - {format(new Date(tournament.registrationEnd), "dd/MM/yyyy", { locale: es })}</div>
                    )}
                    <div>Torneo: {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}{tournament.tournamentEnd && ` - ${format(new Date(tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`}</div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Participación</p>
                  <div className="space-y-1 text-sm">
                    <div>Mínimo: {tournament.minParticipants} jugadores</div>
                    {tournament.maxParticipants && <div>Máximo: {tournament.maxParticipants} jugadores</div>}
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
                {tournament.categories.map((tournamentCategory: any) => (
                  <div key={tournamentCategory.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tournamentCategory.category.name}</h4>
                      <Badge variant="outline">{ranking.filter((r: any) => r.categoryId === tournamentCategory.categoryId).length} jugadores</Badge>
                    </div>
                    {tournamentCategory.category.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {tournamentCategory.category.description}
                      </p>
                    )}
                    {tournamentCategory.maxTeams && (
                      <p className="text-sm">Máximo: {tournamentCategory.maxTeams} jugadores</p>
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
          {tournament.clubs && tournament.clubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clubes Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tournament.clubs.map((tournamentClub: any) => (
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

        {/* Tab: Players */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Jugadores Inscritos</CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay jugadores inscritos aún
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {registrations.map((registration: any) => (
                    <div key={registration.id} className="border rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {registration.player.firstName} {registration.player.lastName}
                        </p>
                        <Badge className={`text-xs ${getRegistrationStatusStyle(registration.registrationStatus)}`}>
                          {getRegistrationStatusLabel(registration.registrationStatus)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {registration.player.rankingPoints} pts
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {registration.player.primaryCategory && (
                            <Badge className={`text-xs ${getCategoryLevelStyle(registration.player.primaryCategory.level)}`}>
                              {formatCategoryLevel(registration.player.primaryCategory.name, registration.player.primaryCategory.level)}
                            </Badge>
                          )}
                          {registration.player.gender && (
                            <Badge className={`text-xs ${getGenderRestrictionStyle(registration.player.gender)}`}>
                              {getGenderRestrictionLabel(registration.player.gender)}
                            </Badge>
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

        {/* Tab: Pools */}
        <TabsContent value="pools" className="space-y-4">
          {!hasPools ? (
            <Card>
              <CardHeader>
                <CardTitle>Pools</CardTitle>
                <CardDescription>
                  {canManage
                    ? "Los jugadores confirmados se dividirán automáticamente en pools de 4. Cada pool jugará 3 partidos donde todos rotan parejas."
                    : "Los pools aún no han sido generados. Espera a que el organizador genere los pools."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <Button
                    onClick={() => generatePools(false)}
                    disabled={generating}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Generar Pools
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Solo administradores y organizadores pueden generar pools.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : numberOfRounds > 1 ? (
            // Múltiples rondas: mostrar con tabs
            <Tabs defaultValue="round-1">
              <TabsList>
                {poolsByRound.map(([roundNum]) => (
                  <TabsTrigger key={roundNum} value={`round-${roundNum}`}>
                    Ronda {roundNum}
                  </TabsTrigger>
                ))}
              </TabsList>

              {poolsByRound.map(([roundNum, roundPools]) => (
                <TabsContent key={roundNum} value={`round-${roundNum}`} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Ronda {roundNum}</h3>
                      <p className="text-sm text-muted-foreground">
                        {roundPools.length} pool{roundPools.length > 1 ? 's' : ''} • {roundPools.length * 3} partidos
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roundPools.map((pool) => (
                      <PoolCard
                        key={pool.id}
                        pool={pool}
                        onMatchUpdate={loadData}
                        hasPreviousRoundsIncomplete={hasIncompletePreviousRounds.get(roundNum) || false}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            // Una sola ronda: mostrar directamente
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Pools</h3>
                  <p className="text-sm text-muted-foreground">
                    {pools.length} pool{pools.length > 1 ? 's' : ''} • {pools.length * 3} partidos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pools.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    onMatchUpdate={loadData}
                    hasPreviousRoundsIncomplete={false}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Matches */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasPools ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay partidos programados aún. Genera los pools primero.
                </p>
              ) : numberOfRounds > 1 ? (
                // Múltiples rondas: agrupar por ronda
                <div className="space-y-8">
                  {poolsByRound.map(([roundNum, roundPools]) => (
                    <div key={roundNum}>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Ronda {roundNum}</h3>
                        <p className="text-sm text-muted-foreground">
                          {roundPools.length * 3} partidos en {roundPools.length} pool{roundPools.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="space-y-6">
                        {roundPools.map((pool) => (
                          <div key={pool.id}>
                            <h4 className="font-medium mb-3">{pool.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {pool.matches.map((match: any, index: number) => (
                                <AmericanoMatchCard
                                  key={match.id}
                                  match={match}
                                  canManage={canManage}
                                  onLoadResult={() => setSelectedMatch(match)}
                                  showPoolInfo={false}
                                  hasPreviousRoundsIncomplete={hasIncompletePreviousRounds.get(roundNum) || false}
                                  matchNumber={index + 1}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Una sola ronda: mostrar sin agrupar
                <div className="space-y-6">
                  {pools.map((pool) => (
                    <div key={pool.id}>
                      <h4 className="font-medium mb-3">{pool.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pool.matches.map((match: any, index: number) => (
                          <AmericanoMatchCard
                            key={match.id}
                            match={match}
                            canManage={canManage}
                            onLoadResult={() => setSelectedMatch(match)}
                            showPoolInfo={false}
                            hasPreviousRoundsIncomplete={false}
                            matchNumber={index + 1}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ranking */}
        <TabsContent value="ranking" className="space-y-4">
          {hasPools && ranking.length > 0 ? (
            <GlobalRankingTable ranking={ranking} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay ranking disponible. Genera los pools primero.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El torneo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Pools Confirmation Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              ¿Regenerar pools?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-base">
                  Ya existen pools generados. Si continúas, se eliminarán{" "}
                  <strong>todas las rondas, pools y partidos existentes</strong> y se crearán nuevos
                  según la configuración actual del torneo ({tournament.americanoRounds || 1} {(tournament.americanoRounds || 1) === 1 ? 'ronda' : 'rondas'}).
                </div>

                {existingPoolsInfo && (
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      Datos que se eliminarán:
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Número de rondas:</span>
                        <Badge variant="secondary">{existingPoolsInfo.numberOfRounds}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Pools por ronda:</span>
                        <Badge variant="secondary">{existingPoolsInfo.poolsPerRound}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Total de pools:</span>
                        <Badge variant="secondary">{existingPoolsInfo.totalPools}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Total de partidos:</span>
                        <Badge variant="secondary">{existingPoolsInfo.totalMatches}</Badge>
                      </div>
                      {existingPoolsInfo.completedMatches > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-800 dark:text-orange-200">Partidos completados:</span>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {existingPoolsInfo.completedMatches}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Esta acción <strong>no se puede deshacer</strong>. Se perderán todos los
                  resultados cargados hasta el momento.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Sí, eliminar y regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Match Result Dialog */}
      {selectedMatch && (
        <AmericanoMatchResultDialog
          match={selectedMatch}
          tournament={{
            setsToWin: tournament.setsToWin,
            gamesToWinSet: tournament.gamesToWinSet,
            tiebreakAt: tournament.tiebreakAt,
            goldenPoint: tournament.goldenPoint
          }}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onSuccess={() => {
            setSelectedMatch(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
