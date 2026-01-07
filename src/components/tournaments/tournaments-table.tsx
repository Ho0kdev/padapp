"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TournamentListItem, TournamentsPaginatedResponse } from "@/types/tournament"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Eye, MoreHorizontal, Pencil, Trash2, Users, Calendar, MapPin, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { tournamentStatusOptions, tournamentTypeOptions } from "@/lib/validations/tournament"
import { tournamentStatusOptions as statusStyles } from "@/lib/utils/status-styles"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function TournamentsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdminOrOrganizer } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const orderBy = searchParams.get('orderBy') || 'name'
  const order = searchParams.get('order') || 'asc'

  useEffect(() => {
    fetchTournaments()
  }, [searchParams])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)

      const response = await fetch(`/api/tournaments?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar torneos")

      const data: TournamentsPaginatedResponse = await response.json()
      setTournaments(data.tournaments)
      setPagination(data.pagination)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los torneos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}`, {
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

      fetchTournaments()
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar torneo",
        variant: "destructive",
      })
    } finally {
      setDeleteId(null)
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
    router.push(`/dashboard/tournaments?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (tournamentId: string, e: React.MouseEvent) => {
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
    const route = tournaments.find(t => t.id === tournamentId)?.type === "AMERICANO_SOCIAL"
      ? `/dashboard/tournaments/${tournamentId}/americano-social`
      : `/dashboard/tournaments/${tournamentId}`
    router.push(route)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = statusStyles.find(s => s.value === status)
    if (!statusConfig) return <Badge variant="secondary">{status}</Badge>

    return (
      <Badge variant="outline" className={statusConfig.css}>
        {statusConfig.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: string) => {
    return tournamentTypeOptions.find(t => t.value === type)?.label || type
  }

  // Función para obtener el número de participantes según el tipo de torneo
  const getParticipantsCount = (tournament: TournamentListItem): number => {
    if (tournament.type === "AMERICANO_SOCIAL") {
      // Para americano social, contar inscripciones activas (PENDING, CONFIRMED, PAID)
      return tournament.registrations?.filter(
        r => r.registrationStatus !== 'CANCELLED' && r.registrationStatus !== 'WAITLIST'
      ).length || 0
    }
    // Para otros torneos, usar el conteo de teams
    return tournament._count.teams
  }

  // Componente de tarjeta para mobile
  const TournamentCard = ({ tournament }: { tournament: TournamentListItem }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{tournament.name}</h3>
            {tournament.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {tournament.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={
                  tournament.type === "AMERICANO_SOCIAL"
                    ? `/dashboard/tournaments/${tournament.id}/americano-social`
                    : `/dashboard/tournaments/${tournament.id}`
                }>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </Link>
              </DropdownMenuItem>
              {isAdminOrOrganizer && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteId(tournament.id)}
                    disabled={getParticipantsCount(tournament) > 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tipo</span>
          <span className="font-medium">{getTypeLabel(tournament.type)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estado</span>
          {getStatusBadge(tournament.status)}
        </div>
        {tournament.mainClub && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{tournament.mainClub.name}</div>
              <div className="text-muted-foreground truncate">{tournament.mainClub.city}</div>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <div>{format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}</div>
            {tournament.tournamentEnd && (
              <div className="text-muted-foreground text-xs">
                hasta {format(new Date(tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" />
            Participantes
          </span>
          <span className="font-medium">
            {getParticipantsCount(tournament)}
            {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
          </span>
        </div>
        {tournament.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tournament.categories.slice(0, 3).map((cat) => (
              <Badge key={cat.category.name} variant="outline" className="text-xs">
                {cat.category.name}
              </Badge>
            ))}
            {tournament.categories.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tournament.categories.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return <div className="text-center py-8">Cargando torneos...</div>
  }

  return (
    <div className="space-y-4">
      {/* Vista de tarjetas para mobile */}
      <div className="lg:hidden space-y-3">
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron torneos
            </CardContent>
          </Card>
        ) : (
          tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))
        )}
      </div>

      {/* Vista de tabla para desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="h-8 px-2 lg:px-3 hover:bg-transparent"
                    >
                      Nombre
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="h-8 px-2 lg:px-3 hover:bg-transparent"
                    >
                      Estado
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>Club Principal</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('tournamentStart')}
                      className="h-8 px-2 lg:px-3 hover:bg-transparent"
                    >
                      Fechas
                      {getSortIcon('tournamentStart')}
                    </Button>
                  </TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Categorías</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {tournaments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron torneos
                </TableCell>
              </TableRow>
            ) : (
              tournaments.map((tournament) => (
                <TableRow
                  key={tournament.id}
                  onClick={(e) => handleRowClick(tournament.id, e)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{tournament.name}</div>
                      {tournament.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {tournament.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(tournament.type)}</TableCell>
                  <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                  <TableCell>
                    {tournament.mainClub ? (
                      <div>
                        <div className="font-medium">{tournament.mainClub.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tournament.mainClub.city}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
                      </div>
                      {tournament.tournamentEnd && (
                        <div className="text-muted-foreground">
                          hasta {format(new Date(tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {getParticipantsCount(tournament)}
                      {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tournament.categories.slice(0, 2).map((cat) => (
                        <Badge key={cat.category.name} variant="outline" className="text-xs">
                          {cat.category.name}
                        </Badge>
                      ))}
                      {tournament.categories.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{tournament.categories.length - 2}
                        </Badge>
                      )}
                    </div>
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
                          <Link href={
                            tournament.type === "AMERICANO_SOCIAL"
                              ? `/dashboard/tournaments/${tournament.id}/americano-social`
                              : `/dashboard/tournaments/${tournament.id}`
                          }>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        {isAdminOrOrganizer && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(tournament.id)}
                              disabled={getParticipantsCount(tournament) > 0}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
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
        </CardContent>
      </Card>

      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/tournaments"
        itemName="torneos"
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}