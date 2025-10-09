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
  Trash2
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
        title: "Error",
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
          title: "Puntos actualizados",
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
        title: "Error",
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
          title: "Ranking eliminado",
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
        title: "Error",
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

  if (loading) {
    return <div className="text-center py-8">Cargando rankings...</div>
  }

  if (!currentCategoryId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold mb-2">Selecciona una categoría</h3>
        <p>Para ver los rankings, primero selecciona una categoría específica en el filtro de arriba.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Posición</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Puntos</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Última Actualización</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron rankings para esta categoría
                </TableCell>
              </TableRow>
            ) : (
              rankings.map((ranking) => (
                <TableRow key={ranking.id}>
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
                    <div className="space-y-1">
                      <div className="font-medium">{ranking.category.name}</div>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(ranking.category.type)}
                        {ranking.category.genderRestriction && getGenderBadge(ranking.category.genderRestriction)}
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