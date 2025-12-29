"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Play,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { getMatchStatusStyle, getMatchStatusLabel } from "@/lib/utils/status-styles"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MatchResultDialog } from "./match-result-dialog"
import { MatchScheduleDialog } from "./match-schedule-dialog"
import { useRouter } from "next/navigation"

interface MatchSet {
  setNumber: number
  team1Games: number
  team2Games: number
  team1TiebreakPoints: number | null
  team2TiebreakPoints: number | null
}

interface Match {
  id: string
  tournamentId: string
  categoryId: string
  status: string
  phaseType: string
  roundNumber: number | null
  matchNumber: number | null
  scheduledAt: string | null
  team1SetsWon: number
  team2SetsWon: number
  isAmericano?: boolean // Indica si es un partido de Americano Social
  sets?: MatchSet[] // Sets del partido con puntajes
  tournament: {
    id: string
    name: string
    type: string
    status: string
    setsToWin: number
    gamesToWinSet: number
    tiebreakAt: number
    goldenPoint: boolean
  }
  category: {
    id: string
    name: string
    type: string
  }
  team1: {
    id: string
    name: string | null
    registration1: {
      player: {
        firstName: string
        lastName: string
      }
    }
    registration2: {
      player: {
        firstName: string
        lastName: string
      }
    }
  } | null
  team2: {
    id: string
    name: string | null
    registration1: {
      player: {
        firstName: string
        lastName: string
      }
    }
    registration2: {
      player: {
        firstName: string
        lastName: string
      }
    }
  } | null
  court: {
    id: string
    name: string
    club: {
      name: string
    }
  } | null
  winnerTeam: {
    id: string
    name: string | null
  } | null
  zone: {
    id: string
    name: string
  } | null
}

interface MatchesPaginatedResponse {
  matches: Match[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function MatchesTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [matches, setMatches] = useState<Match[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const { toast } = useToast()
  const { isAdminOrClubAdmin, isReferee } = useAuth()

  const orderBy = searchParams.get('orderBy') || 'scheduledAt'
  const order = searchParams.get('order') || 'asc'

  useEffect(() => {
    fetchMatches()
  }, [searchParams])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/matches?${params.toString()}`)

      if (response.ok) {
        const data: MatchesPaginatedResponse = await response.json()
        setMatches(data.matches || [])
        setPagination(data.pagination)
      } else {
        throw new Error("Error al cargar partidos")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los partidos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTeamDisplay = (team: Match["team1"]) => {
    if (!team) return "TBD"

    if (team.name) return team.name

    const p1 = `${team.registration1.player.firstName} ${team.registration1.player.lastName}`
    const p2 = `${team.registration2.player.firstName} ${team.registration2.player.lastName}`
    return `${p1} / ${p2}`
  }

  const getPhaseLabel = (phaseType: string) => {
    const phases: Record<string, string> = {
      FINAL: "Final",
      SEMIFINALS: "Semifinal",
      QUARTERFINALS: "Cuartos",
      ROUND_OF_16: "Octavos",
      ROUND_OF_32: "Dieciseisavos",
      GROUP_STAGE: "Fase de Grupos",
      THIRD_PLACE: "3er Lugar"
    }
    return phases[phaseType] || phaseType
  }

  const formatMatchScore = (match: Match) => {
    if (!match.sets || match.sets.length === 0) {
      return `${match.team1SetsWon} - ${match.team2SetsWon}`
    }

    return match.sets.map(set => {
      const team1Score = `${set.team1Games}${set.team1TiebreakPoints !== null ? `⁽${set.team1TiebreakPoints}⁾` : ''}`
      const team2Score = `${set.team2Games}${set.team2TiebreakPoints !== null ? `⁽${set.team2TiebreakPoints}⁾` : ''}`
      return `${team1Score}-${team2Score}`
    }).join(', ')
  }

  const canManageMatch = (match: Match) => {
    // ADMIN y CLUB_ADMIN pueden gestionar todos los partidos
    if (isAdminOrClubAdmin) return true
    // REFEREE puede gestionar sus partidos asignados
    // (TODO: agregar lógica cuando tengamos refereeId en el session)
    return isReferee
  }

  const handleLoadResult = (match: Match) => {
    setSelectedMatch(match)
    setResultDialogOpen(true)
  }

  const handleScheduleMatch = (match: Match) => {
    setSelectedMatch(match)
    setScheduleDialogOpen(true)
  }

  const handleResultSuccess = () => {
    fetchMatches() // Recargar la tabla
  }

  const handleScheduleSuccess = () => {
    fetchMatches() // Recargar la tabla
  }

  const handleChangeStatus = async (matchId: string, newStatus: string) => {
    try {
      setStatusLoading(matchId)
      const response = await fetch(`/api/matches/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error("Error al cambiar estado")
      }

      toast({
        title: "✅ Estado actualizado",
        description: "El estado del partido ha sido actualizado",
        variant: "success",
      })

      fetchMatches()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(null)
    }
  }

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams)

    // Si ya está ordenando por esta columna, invertir el orden
    if (orderBy === column) {
      const newOrder = order === 'asc' ? 'desc' : 'asc'
      params.set('order', newOrder)
    } else {
      // Nueva columna, ordenar ascendente por defecto
      params.set('orderBy', column)
      params.set('order', 'asc')
    }

    params.set('page', '1') // Reset a la primera página
    router.push(`/dashboard/matches?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (match: Match, e: React.MouseEvent) => {
    // No navegar si se hizo click en elementos interactivos
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea')
    ) {
      return
    }

    // Detectar tipo de partido y usar la ruta correcta
    if (match.isAmericano) {
      router.push(`/dashboard/americano-matches/${match.id}`)
    } else {
      router.push(`/dashboard/matches/${match.id}`)
    }
  }

  const getMatchDetailUrl = (match: Match) => {
    return match.isAmericano
      ? `/dashboard/americano-matches/${match.id}`
      : `/dashboard/matches/${match.id}`
  }

  const MatchCard = ({ match }: { match: Match }) => {
    return (
      <Card
        className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => handleRowClick(match, e)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base break-words">
                {getTeamDisplay(match.team1)} vs {getTeamDisplay(match.team2)}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Trophy className="h-3 w-3 flex-shrink-0" />
                <p className="truncate">
                  {match.tournament.name}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={getMatchDetailUrl(match)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </Link>
                </DropdownMenuItem>

                {canManageMatch(match) && match.status !== "COMPLETED" && match.status !== "WALKOVER" && !match.isAmericano && (
                  <>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleScheduleMatch(match)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Programar partido
                    </DropdownMenuItem>

                    {match.status === "SCHEDULED" && (
                      <DropdownMenuItem
                        onClick={() => handleChangeStatus(match.id, "IN_PROGRESS")}
                        disabled={statusLoading === match.id}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar partido
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => handleLoadResult(match)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Cargar resultado
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {/* Estado */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant="outline" className={getMatchStatusStyle(match.status)}>
              {getMatchStatusLabel(match.status)}
            </Badge>
          </div>

          {/* Categoría */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categoría</span>
            <span className="truncate max-w-[180px]">{match.category.name}</span>
          </div>

          {/* Fase */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fase</span>
            <Badge variant="outline" className="font-mono text-xs">
              {getPhaseLabel(match.phaseType)}
              {match.matchNumber && ` #${match.matchNumber}`}
            </Badge>
          </div>

          {/* Grupo (si existe) */}
          {match.zone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Grupo</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {match.zone.name}
              </Badge>
            </div>
          )}

          {/* Fecha y hora (si existe) */}
          {match.scheduledAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <span className="text-muted-foreground text-xs">
                {format(new Date(match.scheduledAt), "dd/MM/yyyy HH:mm", { locale: es })}
              </span>
            </div>
          )}

          {/* Cancha (si existe) */}
          {match.court && (
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground flex-shrink-0">Cancha</span>
              <span className="text-xs text-right truncate">{match.court.name}</span>
            </div>
          )}

          {/* Resultado si está completado */}
          {(match.status === "COMPLETED" || match.status === "WALKOVER") && match.winnerTeam && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Resultado</span>
              <Badge variant="secondary" className="font-mono font-semibold text-xs">
                {formatMatchScore(match)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-muted-foreground">Cargando partidos...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile cards view */}
      <div className="lg:hidden space-y-3">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron partidos</h3>
              <p className="text-muted-foreground text-center">
                No hay partidos que coincidan con los filtros seleccionados
              </p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
        )}
      </div>

      {/* Desktop/Tablet table view */}
      <div className="hidden lg:block rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Torneo</TableHead>
                <TableHead className="min-w-[100px]">Grupo</TableHead>
                <TableHead className="min-w-[140px]">Fase</TableHead>
                <TableHead className="min-w-[280px]">Equipos</TableHead>
                <TableHead className="min-w-[120px]">Resultado</TableHead>
                <TableHead className="min-w-[200px]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('scheduledAt')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Horario / Cancha
                    {getSortIcon('scheduledAt')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[140px]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('status')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Estado
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {matches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron partidos
                </TableCell>
              </TableRow>
            ) : (
              matches.map((match) => (
                <TableRow
                  key={match.id}
                  onClick={(e) => handleRowClick(match, e)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-muted-foreground" />
                        {match.tournament.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.category.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {match.zone ? (
                      <Badge variant="secondary" className="font-mono">
                        {match.zone.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {getPhaseLabel(match.phaseType)}
                      {match.matchNumber && ` #${match.matchNumber}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {getTeamDisplay(match.team1)}
                      </div>
                      <div className="text-sm text-muted-foreground">vs</div>
                      <div className="text-sm font-medium">
                        {getTeamDisplay(match.team2)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(match.status === "COMPLETED" || match.status === "WALKOVER") && match.winnerTeam ? (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatMatchScore(match)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Ganador: {getTeamDisplay(match.team1?.id === match.winnerTeam.id ? match.team1 : match.team2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {match.scheduledAt && (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(match.scheduledAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      )}
                      {match.court && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {match.court.name} - {match.court.club.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getMatchStatusStyle(match.status)}>
                      {getMatchStatusLabel(match.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={getMatchDetailUrl(match)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>

                        {canManageMatch(match) && match.status !== "COMPLETED" && match.status !== "WALKOVER" && !match.isAmericano && (
                          <>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleScheduleMatch(match)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Programar partido
                            </DropdownMenuItem>

                            {match.status === "SCHEDULED" && (
                              <DropdownMenuItem
                                onClick={() => handleChangeStatus(match.id, "IN_PROGRESS")}
                                disabled={statusLoading === match.id}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Iniciar partido
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleLoadResult(match)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Cargar resultado
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Desktop table pagination */}
      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/matches"
        itemName="partidos"
      />

      {selectedMatch && (
        <>
          <MatchResultDialog
            match={selectedMatch}
            open={resultDialogOpen}
            onOpenChange={setResultDialogOpen}
            onSuccess={handleResultSuccess}
          />
          <MatchScheduleDialog
            match={selectedMatch}
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
            onSuccess={handleScheduleSuccess}
          />
        </>
      )}
    </div>
  )
}
