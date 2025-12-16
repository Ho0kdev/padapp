"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  Trophy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { getCategoryTypeStyle, getCategoryTypeLabel, getGenderRestrictionStyle, getGenderRestrictionLabel, formatAgeRange, formatRankingRange } from "@/lib/utils/status-styles"
import { Card, CardContent } from "@/components/ui/card"

interface Category {
  id: string
  name: string
  description?: string
  type: string
  level?: number
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
  const router = useRouter()
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
  const { isAdminOrClubAdmin } = useAuth()

  const orderBy = searchParams.get('orderBy') || 'name'
  const order = searchParams.get('order') || 'asc'

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
        title: "❌ Error",
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
          title: "✅ Categoría desactivada",
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
        title: "❌ Error",
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
          title: "✅ Categoría activada",
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
        title: "❌ Error",
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
    router.push(`/dashboard/categories?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (categoryId: string, e: React.MouseEvent) => {
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
    router.push(`/dashboard/categories/${categoryId}`)
  }

  if (loading) {
    return <div className="text-center py-8">Cargando categorías...</div>
  }

  return (
    <div className="space-y-4">
      {/* Vista mobile con cards clickeables */}
      <div className="lg:hidden space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron categorías
          </div>
        ) : (
          categories.map((category) => (
            <Card
              key={category.id}
              className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => handleRowClick(category.id, e)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {category.description}
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
                        <Link href={`/dashboard/categories/${category.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      {isAdminOrClubAdmin && (
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
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(category.type)}
                  {category.level && (
                    <Badge variant="secondary" className="font-mono">
                      Nivel {category.level}
                    </Badge>
                  )}
                  {getStatusBadge(category.isActive)}
                </div>
                {(formatAgeRange(category.minAge, category.maxAge) || category.genderRestriction || formatRankingRange(category.minRankingPoints, category.maxRankingPoints)) && (
                  <div className="space-y-1 text-sm">
                    {formatAgeRange(category.minAge, category.maxAge) && (
                      <div className="flex items-center gap-1">
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
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-muted-foreground" />
                        {formatRankingRange(category.minRankingPoints, category.maxRankingPoints)}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {category._count.tournamentCategories} torneos
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vista desktop con tabla clickeable */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('name')} className="h-8 px-2 lg:px-3 hover:bg-transparent">
                  Nombre
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('type')} className="h-8 px-2 lg:px-3 hover:bg-transparent">
                  Tipo
                  {getSortIcon('type')}
                </Button>
              </TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Restricciones</TableHead>
              <TableHead>Torneos</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('isActive')} className="h-8 px-2 lg:px-3 hover:bg-transparent">
                  Estado
                  {getSortIcon('isActive')}
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron categorías
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow
                    key={category.id}
                    onClick={(e) => handleRowClick(category.id, e)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
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
                      {category.level ? (
                        <Badge variant="secondary" className="font-mono">
                          Nivel {category.level}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
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
                          {isAdminOrClubAdmin && (
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
              {(categoryToDelete?._count?.tournamentCategories || 0) > 0 && (
                <span className="block mt-2 text-red-600">
                  No se puede desactivar esta categoría porque está siendo usada en {categoryToDelete?._count?.tournamentCategories} torneo(s) activos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={(categoryToDelete?._count?.tournamentCategories || 0) > 0}
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