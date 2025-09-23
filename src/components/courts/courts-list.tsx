"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  SquareSplitHorizontal,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Activity,
  Lightbulb,
  Home,
  CheckCircle,
  Trees,
  Layers,
  Grid
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface Court {
  id: string
  name: string
  surface: string
  hasLighting: boolean
  hasRoof: boolean
  isOutdoor: boolean
  hasPanoramicGlass: boolean
  hasConcreteWall: boolean
  hasNet4m: boolean
  status: string
  hourlyRate?: number
  notes?: string
  _count: {
    matches: number
  }
}

interface Club {
  id: string
  name: string
}

interface CourtsListProps {
  clubId: string
}

export function CourtsList({ clubId }: CourtsListProps) {
  const [courts, setCourts] = useState<Court[]>([])
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [surfaceFilter, setSurfaceFilter] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [courtToActivate, setCourtToActivate] = useState<Court | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    fetchCourts()
  }, [clubId])

  const fetchCourts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clubs/${clubId}/courts`)
      if (response.ok) {
        const data = await response.json()
        setCourts(data.courts || [])
        setClub(data.club)
      } else {
        throw new Error("Error al cargar canchas")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las canchas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!courtToDelete) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/courts/${courtToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Cancha desactivada",
          description: "La cancha ha sido desactivada exitosamente",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar cancha")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al desactivar cancha",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setCourtToDelete(null)
    }
  }

  const handleActivate = async () => {
    if (!courtToActivate) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/courts/${courtToActivate.id}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast({
          title: "Cancha activada",
          description: "La cancha ha sido activada exitosamente",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar cancha")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar cancha",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setCourtToActivate(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      AVAILABLE: "bg-green-100 text-green-800",
      MAINTENANCE: "bg-yellow-100 text-yellow-800",
      RESERVED: "bg-blue-100 text-blue-800",
      UNAVAILABLE: "bg-red-100 text-red-800"
    }

    const labels = {
      AVAILABLE: "Disponible",
      MAINTENANCE: "Mantenimiento",
      RESERVED: "Reservada",
      UNAVAILABLE: "No Disponible"
    }

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getSurfaceBadge = (surface: string) => {
    const variants = {
      CONCRETE: "bg-gray-100 text-gray-800",
      ARTIFICIAL_GRASS: "bg-green-100 text-green-800",
      CERAMIC: "bg-orange-100 text-orange-800",
      OTHER: "bg-blue-100 text-blue-800"
    }

    const labels = {
      CONCRETE: "Concreto",
      ARTIFICIAL_GRASS: "Césped Artificial",
      CERAMIC: "Cerámica",
      OTHER: "Otra"
    }

    return (
      <Badge variant="outline" className={variants[surface as keyof typeof variants]}>
        {labels[surface as keyof typeof labels] || surface}
      </Badge>
    )
  }

  const filteredCourts = courts.filter(court => {
    const matchesSearch = court.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || court.status === statusFilter
    const matchesSurface = surfaceFilter === "all" || court.surface === surfaceFilter

    return matchesSearch && matchesStatus && matchesSurface
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Cargando canchas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <SquareSplitHorizontal className="h-5 w-5" />
              Canchas de {club?.name} ({filteredCourts.length})
            </CardTitle>
            {isAdmin && (
              <Link href={`/dashboard/clubs/${clubId}/courts/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cancha
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar canchas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="AVAILABLE">Disponible</SelectItem>
                <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                <SelectItem value="RESERVED">Reservada</SelectItem>
                <SelectItem value="UNAVAILABLE">No Disponible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={surfaceFilter} onValueChange={setSurfaceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Superficie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las superficies</SelectItem>
                <SelectItem value="CONCRETE">Concreto</SelectItem>
                <SelectItem value="ARTIFICIAL_GRASS">Césped Artificial</SelectItem>
                <SelectItem value="CERAMIC">Cerámica</SelectItem>
                <SelectItem value="OTHER">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de canchas */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cancha</TableHead>
                <TableHead>Superficie</TableHead>
                <TableHead>Características</TableHead>
                <TableHead>Precio/Hora</TableHead>
                <TableHead>Estadísticas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchTerm || statusFilter !== "all" || surfaceFilter !== "all"
                      ? "No se encontraron canchas con los filtros aplicados"
                      : "No hay canchas registradas"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourts.map((court) => (
                  <TableRow key={court.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{court.name}</div>
                        {court.notes && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {court.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSurfaceBadge(court.surface)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {court.hasLighting && (
                          <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            <Lightbulb className="h-3 w-3" />
                            Iluminación
                          </div>
                        )}
                        {court.hasRoof && (
                          <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            <Home className="h-3 w-3" />
                            Techada
                          </div>
                        )}
                        {court.isOutdoor && (
                          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            <Trees className="h-3 w-3" />
                            Exterior
                          </div>
                        )}
                        {court.hasPanoramicGlass && (
                          <div className="flex items-center gap-1 text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">
                            <Eye className="h-3 w-3" />
                            Cristal
                          </div>
                        )}
                        {court.hasConcreteWall && (
                          <div className="flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            <Layers className="h-3 w-3" />
                            Concreto
                          </div>
                        )}
                        {court.hasNet4m && (
                          <div className="flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            <Grid className="h-3 w-3" />
                            Red 4m
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {court.hourlyRate ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span>${court.hourlyRate}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No definido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        {court._count.matches} partidos
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(court.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/dashboard/clubs/${clubId}/courts/${court.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                          </Link>
                          {isAdmin && (
                            <>
                              <Link href={`/dashboard/clubs/${clubId}/courts/${court.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {court.status !== "UNAVAILABLE" ? (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setCourtToDelete(court)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Desactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => {
                                    setCourtToActivate(court)
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

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la cancha "{courtToDelete?.name}". La cancha no será eliminada pero no estará disponible para nuevos partidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para activar */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará la cancha "{courtToActivate?.name}". La cancha volverá a estar disponible para programar partidos.
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