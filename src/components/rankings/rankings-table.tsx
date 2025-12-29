"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Trophy,
  MoreHorizontal,
  Edit,
  Eye,
  Calendar,
  Award,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"

interface Ranking {
  id: string
  playerId: string
  categoryId: string
  currentPoints: number
  seasonYear: number
  lastUpdated: string
  position?: number
  player: {
    id: string
    firstName: string
    lastName: string
    user: {
      id: string
      name: string
      email: string
    }
  }
  category: {
    id: string
    name: string
    description?: string
    type: string
    genderRestriction?: string
  }
}

interface RankingsPaginatedResponse {
  rankings: Ranking[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function RankingsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rankingToEdit, setRankingToEdit] = useState<Ranking | null>(null)
  const [newPoints, setNewPoints] = useState("")
  const [updating, setUpdating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rankingToDelete, setRankingToDelete] = useState<Ranking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()
  const currentCategoryId = searchParams.get("categoryId")

  const orderBy = searchParams.get('orderBy') || 'currentPoints'
  const order = searchParams.get('order') || 'desc'

  useEffect(() => {
    if (currentCategoryId) {
      fetchRankings()
    } else {
      setRankings([])
      setLoading(false)
    }
  }, [searchParams, currentCategoryId])

  const fetchRankings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      if (!params.get('seasonYear')) {
        params.set('seasonYear', new Date().getFullYear().toString())
      }

      // Asegurar que siempre tengamos categoryId
      if (!params.get('categoryId')) {
        setRankings([])
        setLoading(false)
        return
      }

      const response = await fetch(`/api/rankings?${params.toString()}`)

      if (response.ok) {
        const data: RankingsPaginatedResponse = await response.json()
        setRankings(data.rankings || [])
        setPagination(data.pagination)
      } else {
        throw new Error("Error al cargar rankings")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los rankings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditPoints = async () => {
    if (!rankingToEdit || !newPoints) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/rankings/${rankingToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPoints: parseInt(newPoints),
          reason: "Ajuste manual desde tabla de rankings"
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ Puntos actualizados",
          description: "Los puntos del ranking han sido actualizados exitosamente",
          variant: "success",
        })
        fetchRankings()
        setEditDialogOpen(false)
        setRankingToEdit(null)
        setNewPoints("")
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

  const handleDeleteRanking = async () => {
    if (!rankingToDelete) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/rankings/${rankingToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "✅ Ranking eliminado",
          description: `${data.deletedRanking.playerName} ha sido eliminado del ranking de ${data.deletedRanking.categoryName}`,
          variant: "success",
        })
        fetchRankings()
        setDeleteDialogOpen(false)
        setRankingToDelete(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar ranking")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar ranking",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (ranking: Ranking) => {
    setRankingToDelete(ranking)
    setDeleteDialogOpen(true)
  }

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams)

    // Si ya está ordenando por esta columna, invertir el orden
    if (orderBy === column) {
      const newOrder = order === 'asc' ? 'desc' : 'asc'
      params.set('order', newOrder)
    } else {
      // Nueva columna, ordenar descendente por defecto para puntos
      params.set('orderBy', column)
      params.set('order', column === 'currentPoints' ? 'desc' : 'asc')
    }

    params.set('page', '1') // Reset a la primera página
    router.push(`/dashboard/rankings?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (rankingId: string, e: React.MouseEvent) => {
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
    router.push(`/dashboard/rankings/${rankingId}`)
  }

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

  const getPositionBadge = (position?: number) => {
    if (!position) return null

    let className = "bg-gray-100 text-gray-800"
    if (position === 1) className = "bg-yellow-100 text-yellow-800"
    else if (position === 2) className = "bg-gray-100 text-gray-600"
    else if (position === 3) className = "bg-orange-100 text-orange-800"

    return (
      <Badge variant="outline" className={className}>
        #{position}
      </Badge>
    )
  }

  // Componente de Card para mobile
  const RankingCard = ({ ranking }: { ranking: Ranking }) => {
    return (
      <Card
        className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => handleRowClick(ranking.id, e)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                {getPositionBadge(ranking.position)}
              </div>
              <h3 className="font-semibold text-base break-words">
                {ranking.player.firstName} {ranking.player.lastName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{ranking.player.user.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/rankings/${ranking.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </Link>
                </DropdownMenuItem>
                {isAdminOrClubAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/users/${ranking.player.user.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver jugador
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setRankingToEdit(ranking)
                        setNewPoints(ranking.currentPoints.toString())
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar puntos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(ranking)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar del ranking
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {/* Puntos */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Puntos</span>
            <div className="flex items-center gap-1 font-semibold">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span>{ranking.currentPoints}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>

          {/* Categoría */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categoría</span>
            <span className="truncate max-w-[180px]">{ranking.category.name}</span>
          </div>

          {/* Temporada */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Temporada</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{ranking.seasonYear}</span>
            </div>
          </div>

          {/* Última actualización */}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground text-xs">Última actualización</span>
            <span className="text-xs text-muted-foreground">
              {new Date(ranking.lastUpdated).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-muted-foreground">Cargando rankings...</div>
        </CardContent>
      </Card>
    )
  }

  if (!currentCategoryId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selecciona una categoría</h3>
          <p className="text-muted-foreground text-center">
            Para ver los rankings, primero selecciona una categoría específica en el filtro de arriba.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile cards view */}
      <div className="lg:hidden space-y-3">
        {rankings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron rankings</h3>
              <p className="text-muted-foreground text-center">
                No hay rankings para esta categoría y temporada
              </p>
            </CardContent>
          </Card>
        ) : (
          rankings.map((ranking) => (
            <RankingCard key={ranking.id} ranking={ranking} />
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block rounded-md border">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('position')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Posición
                  {getSortIcon('position')}
                </Button>
              </TableHead>
              <TableHead className="min-w-[220px]">Jugador</TableHead>
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('currentPoints')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Puntos
                  {getSortIcon('currentPoints')}
                </Button>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('seasonYear')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Temporada
                  {getSortIcon('seasonYear')}
                </Button>
              </TableHead>
              <TableHead className="min-w-[150px]">Última Actualización</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron rankings para esta categoría
                </TableCell>
              </TableRow>
            ) : (
              rankings.map((ranking) => (
                <TableRow
                  key={ranking.id}
                  onClick={(e) => handleRowClick(ranking.id, e)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      {getPositionBadge(ranking.position)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {ranking.player.firstName} {ranking.player.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ranking.player.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{ranking.currentPoints}</span>
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {ranking.seasonYear}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(ranking.lastUpdated).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
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
                          <Link href={`/dashboard/rankings/${ranking.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        {isAdminOrClubAdmin && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/users/${ranking.player.user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver jugador
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setRankingToEdit(ranking)
                                setNewPoints(ranking.currentPoints.toString())
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar puntos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(ranking)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar del ranking
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

      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/rankings"
        itemName="rankings"
      />

      {/* Dialog para editar puntos */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Puntos de Ranking</DialogTitle>
            <DialogDescription>
              Actualizar los puntos para {rankingToEdit?.player.firstName} {rankingToEdit?.player.lastName} en la categoría {rankingToEdit?.category.name}
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
              disabled={updating || !newPoints || newPoints === rankingToEdit?.currentPoints.toString()}
            >
              {updating ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar del ranking?</DialogTitle>
            <DialogDescription>
              {rankingToDelete && (
                <>
                  Estás a punto de eliminar a <strong>{rankingToDelete.player.firstName} {rankingToDelete.player.lastName}</strong> del ranking de <strong>{rankingToDelete.category.name}</strong> en la temporada {rankingToDelete.seasonYear}.
                  <br /><br />
                  Esta acción no se puede deshacer y se perderán sus {rankingToDelete.currentPoints} puntos en esta categoría.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setRankingToDelete(null)
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRanking}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar del ranking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}