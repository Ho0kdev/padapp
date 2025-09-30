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
  Tag,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Users,
  Calendar,
  Trophy
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { getCategoryTypeStyle, getCategoryTypeLabel, getGenderRestrictionStyle, getGenderRestrictionLabel, formatAgeRange, formatRankingRange } from "@/lib/utils/status-styles"

interface Category {
  id: string
  name: string
  description?: string
  type: string
  minAge?: number
  maxAge?: number
  genderRestriction?: string
  minRankingPoints?: number
  maxRankingPoints?: number
  isActive: boolean
  _count: {
    tournamentCategories: number
  }
}

interface CategoriesPaginatedResponse {
  categories: Category[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function CategoriesTable() {
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [categoryToActivate, setCategoryToActivate] = useState<Category | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    fetchCategories()
  }, [searchParams])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/categories?${params.toString()}`)

      if (response.ok) {
        const data: CategoriesPaginatedResponse = await response.json()
        setCategories(data.categories || [])
        setPagination(data.pagination)
      } else {
        throw new Error("Error al cargar categorías")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Categoría desactivada",
          description: "La categoría ha sido desactivada exitosamente",
          variant: "success",
        })
        fetchCategories()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar categoría")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al desactivar categoría",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleActivate = async () => {
    if (!categoryToActivate) return

    try {
      const response = await fetch(`/api/categories/${categoryToActivate.id}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast({
          title: "Categoría activada",
          description: "La categoría ha sido activada exitosamente",
          variant: "success",
        })
        fetchCategories()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar categoría")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar categoría",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setCategoryToActivate(null)
    }
  }

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className={getCategoryTypeStyle(type)}>
        {getCategoryTypeLabel(type)}
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant="outline" className={isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
        {isActive ? "Activa" : "Inactiva"}
      </Badge>
    )
  }

  const getGenderBadge = (gender?: string) => {
    if (!gender) return null

    return (
      <Badge variant="outline" className={getGenderRestrictionStyle(gender)}>
        {getGenderRestrictionLabel(gender)}
      </Badge>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Cargando categorías...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Restricciones</TableHead>
              <TableHead>Torneos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron categorías
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(category.type)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {formatAgeRange(category.minAge, category.maxAge) && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatAgeRange(category.minAge, category.maxAge)}
                          </div>
                        )}
                        {category.genderRestriction && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {getGenderBadge(category.genderRestriction)}
                          </div>
                        )}
                        {formatRankingRange(category.minRankingPoints, category.maxRankingPoints) && (
                          <div className="flex items-center gap-1 text-sm">
                            <Trophy className="h-3 w-3 text-muted-foreground" />
                            {formatRankingRange(category.minRankingPoints, category.maxRankingPoints)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {category._count.tournamentCategories} torneos
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(category.isActive)}
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
                            <Link href={`/dashboard/categories/${category.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/categories/${category.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {category.isActive ? (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setCategoryToDelete(category)
                                    setDeleteDialogOpen(true)
                                  }}
                                  disabled={category._count.tournamentCategories > 0}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Desactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => {
                                    setCategoryToActivate(category)
                                    setActivateDialogOpen(true)
                                  }}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activar
                                </DropdownMenuItem>
                              )}
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
        basePath="/dashboard/categories"
        itemName="categorías"
      />

      {/* Dialog de confirmación para desactivar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la categoría "{categoryToDelete?.name}". La categoría no será eliminada pero no aparecerá en las listas activas.
              {categoryToDelete?._count.tournamentCategories > 0 && (
                <span className="block mt-2 text-red-600">
                  No se puede desactivar esta categoría porque está siendo usada en {categoryToDelete._count.tournamentCategories} torneo(s) activos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={categoryToDelete?._count.tournamentCategories > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para activar */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará la categoría "{categoryToActivate?.name}". La categoría volverá a aparecer en las listas y estará disponible para nuevos torneos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
              Activar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}