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
  Building,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Mail,
  Globe,
  SquareSplitHorizontal,
  Trophy,
  CheckCircle,
  Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { getClubStatusStyle, getClubStatusLabel } from "@/lib/utils/status-styles"
import { useRouter } from "next/navigation"

interface Club {
  id: string
  name: string
  description?: string
  address: string
  city: string
  state?: string
  country: string
  phone?: string
  email?: string
  website?: string
  status: string
  _count: {
    courts: number
    tournaments?: number
    tournamentClubs?: number
  }
}

interface ClubsPaginatedResponse {
  clubs: Club[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function ClubsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clubs, setClubs] = useState<Club[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [clubToActivate, setClubToActivate] = useState<Club | null>(null)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [clubToMaintenance, setClubToMaintenance] = useState<Club | null>(null)
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()

  const orderBy = searchParams.get('orderBy') || 'name'
  const order = searchParams.get('order') || 'asc'

  useEffect(() => {
    fetchClubs()
  }, [searchParams])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/clubs?${params.toString()}`)

      if (response.ok) {
        const data: ClubsPaginatedResponse = await response.json()
        setClubs(data.clubs || [])
        setPagination(data.pagination)
      } else {
        throw new Error("Error al cargar clubes")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los clubes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!clubToDelete) return

    try {
      const response = await fetch(`/api/clubs/${clubToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "✅ Club desactivado",
          description: "El club ha sido desactivado exitosamente",
          variant: "success",
        })
        fetchClubs()
      } else {
        const error = await response.json()
        console.error("Error response:", error)
        throw new Error(error.details || error.error || "Error al desactivar club")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al desactivar club",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setClubToDelete(null)
    }
  }

  const handleActivate = async () => {
    if (!clubToActivate) return

    try {
      const response = await fetch(`/api/clubs/${clubToActivate.id}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast({
          title: "✅ Club activado",
          description: "El club ha sido activado exitosamente",
        })
        fetchClubs()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar club")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al activar club",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setClubToActivate(null)
    }
  }

  const handleMaintenance = async () => {
    if (!clubToMaintenance) return

    try {
      const response = await fetch(`/api/clubs/${clubToMaintenance.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "MAINTENANCE" })
      })

      if (response.ok) {
        toast({
          title: "✅ Club en mantenimiento",
          description: "El club ha sido puesto en modo mantenimiento exitosamente",
          variant: "success",
        })
        fetchClubs()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al poner club en mantenimiento")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al poner club en mantenimiento",
        variant: "destructive",
      })
    } finally {
      setMaintenanceDialogOpen(false)
      setClubToMaintenance(null)
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
    router.push(`/dashboard/clubs?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (clubId: string, e: React.MouseEvent) => {
    // No navegar si se hizo click en el dropdown menu o sus elementos
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('a')) {
      return
    }
    router.push(`/dashboard/clubs/${clubId}`)
  }

  // Componente de tarjeta para mobile
  const ClubCard = ({ club }: { club: Club }) => (
    <Card
      className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={(e) => handleRowClick(club.id, e)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {(club as any).logoUrl ? (
                <img
                  src={(club as any).logoUrl}
                  alt={`Logo de ${club.name}`}
                  className="h-12 w-12 rounded-full object-cover border"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{club.name}</h3>
              {club.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/dashboard/clubs/${club.id}`}>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </DropdownMenuItem>
              </Link>
              {isAdminOrClubAdmin && (
                <>
                  <Link href={`/dashboard/clubs/${club.id}/edit`}>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  {club.status === "ACTIVE" ? (
                    <>
                      <DropdownMenuItem
                        className="text-yellow-600"
                        onClick={() => {
                          setClubToMaintenance(club)
                          setMaintenanceDialogOpen(true)
                        }}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Mantenimiento
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setClubToDelete(club)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Desactivar
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      className="text-green-600"
                      onClick={() => {
                        setClubToActivate(club)
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

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="truncate">{club.address}</div>
              <div className="text-muted-foreground">
                {club.city}, {club.state && `${club.state}, `}{club.country}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant="outline" className={getClubStatusStyle(club.status)}>
              {getClubStatusLabel(club.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
            <div className="flex items-center gap-1">
              <SquareSplitHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{club._count.courts}</span>
              <span className="text-muted-foreground">Canchas</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{(club._count.tournaments || 0) + (club._count.tournamentClubs || 0)}</span>
              <span className="text-muted-foreground">Torneos</span>
            </div>
          </div>

          {(club.phone || club.email) && (
            <div className="space-y-1 text-sm pt-2 border-t">
              {club.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{club.phone}</span>
                </div>
              )}
              {club.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{club.email}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando clubes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Vista de tarjetas para mobile */}
      <div className="lg:hidden space-y-3">
        {clubs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron clubes
            </CardContent>
          </Card>
        ) : (
          clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))
        )}
      </div>

      {/* Vista de tabla para desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Club
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('city')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Ubicación
                    {getSortIcon('city')}
                  </Button>
                </TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estadísticas</TableHead>
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
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No se encontraron clubes
                  </TableCell>
                </TableRow>
              ) : (
                clubs.map((club) => (
                  <TableRow
                    key={club.id}
                    onClick={(e) => handleRowClick(club.id, e)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {(club as any).logoUrl ? (
                            <img
                              src={(club as any).logoUrl}
                              alt={`Logo de ${club.name}`}
                              className="h-10 w-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Building className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{club.name}</div>
                          {club.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {club.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-sm">{club.address}</div>
                          <div className="text-sm text-muted-foreground">
                            {club.city}, {club.state && `${club.state}, `}{club.country}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {club.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {club.phone}
                          </div>
                        )}
                        {club.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {club.email}
                          </div>
                        )}
                        {club.website && (
                          <div className="flex items-center gap-1 text-sm">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            Sitio web
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <SquareSplitHorizontal className="h-3 w-3 text-muted-foreground" />
                          {club._count.courts} Canchas
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-muted-foreground" />
                          {(club._count.tournaments || 0) + (club._count.tournamentClubs || 0)} Torneos Activos
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getClubStatusStyle(club.status)}>
                        {getClubStatusLabel(club.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/dashboard/clubs/${club.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                          </Link>
                          {isAdminOrClubAdmin && (
                            <>
                              <Link href={`/dashboard/clubs/${club.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {club.status === "ACTIVE" ? (
                                <>
                                  <DropdownMenuItem
                                    className="text-yellow-600"
                                    onClick={() => {
                                      setClubToMaintenance(club)
                                      setMaintenanceDialogOpen(true)
                                    }}
                                  >
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Mantenimiento
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setClubToDelete(club)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => {
                                    setClubToActivate(club)
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
        </CardContent>
      </Card>

      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/clubs"
        itemName="clubes"
      />

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar club?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el club "{clubToDelete?.name}". El club no será eliminado pero no aparecerá en las listas activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
            <AlertDialogTitle>¿Activar club?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará el club "{clubToActivate?.name}". El club volverá a aparecer en las listas y estará disponible para nuevos torneos.
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

      {/* Dialog de confirmación para mantenimiento */}
      <AlertDialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Poner club en mantenimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción pondrá el club "{clubToMaintenance?.name}" en modo mantenimiento. El club seguirá visible pero no estará disponible para nuevos torneos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMaintenance} className="bg-yellow-600 hover:bg-yellow-700">
              Poner en Mantenimiento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}