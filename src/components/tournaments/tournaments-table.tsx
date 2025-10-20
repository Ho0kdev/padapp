"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Eye, MoreHorizontal, Pencil, Trash2, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { tournamentStatusOptions, tournamentTypeOptions } from "@/lib/validations/tournament"
import { tournamentStatusOptions as statusStyles } from "@/lib/utils/status-styles"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

export function TournamentsTable() {
  const searchParams = useSearchParams()
  const { isAdminOrClubAdmin } = useAuth()
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

  if (loading) {
    return <div className="text-center py-8">Cargando torneos...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Club Principal</TableHead>
              <TableHead>Fechas</TableHead>
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
                <TableRow key={tournament.id}>
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
                      {tournament._count.teams}
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
                        {isAdminOrClubAdmin && (
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
                              disabled={tournament._count.teams > 0}
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