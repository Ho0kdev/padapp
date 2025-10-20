"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  CheckCircle
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

  if (loading) {
    return <div className="text-center py-8">Cargando partidos...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Torneo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Equipos</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Horario / Cancha</TableHead>
              <TableHead>Estado</TableHead>
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
                <TableRow key={match.id}>
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
                    {match.status === "COMPLETED" && match.winnerTeam ? (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="font-mono">
                          {match.team1SetsWon} - {match.team2SetsWon}
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
                          <Link href={`/dashboard/matches/${match.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>

                        {canManageMatch(match) && match.status !== "COMPLETED" && (
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
