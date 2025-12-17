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
  Grid,
  Wrench,
  Calendar
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { getCourtStatusStyle, getCourtStatusLabel, getCourtSurfaceStyle, getCourtSurfaceLabel } from "@/lib/utils/status-styles"

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
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [courtToPermanentlyDelete, setCourtToPermanentlyDelete] = useState<Court | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [courtToActivate, setCourtToActivate] = useState<Court | null>(null)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [courtToMaintenance, setCourtToMaintenance] = useState<Court | null>(null)
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false)
  const [courtToReserve, setCourtToReserve] = useState<Court | null>(null)
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()

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
        title: "❌ Error",
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
          title: "✅ Cancha desactivada",
          description: "La cancha ha sido desactivada exitosamente",
          variant: "success",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar cancha")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "AVAILABLE" })
      })

      if (response.ok) {
        toast({
          title: "✅ Cancha activada",
          description: "La cancha ha sido puesta como disponible exitosamente",
          variant: "success",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar cancha")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al activar cancha",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setCourtToActivate(null)
    }
  }

  const handleMaintenance = async () => {
    if (!courtToMaintenance) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/courts/${courtToMaintenance.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "MAINTENANCE" })
      })

      if (response.ok) {
        toast({
          title: "✅ Cancha en mantenimiento",
          description: "La cancha ha sido puesta en mantenimiento exitosamente",
          variant: "success",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al poner cancha en mantenimiento")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al poner cancha en mantenimiento",
        variant: "destructive",
      })
    } finally {
      setMaintenanceDialogOpen(false)
      setCourtToMaintenance(null)
    }
  }

  const handleReserve = async () => {
    if (!courtToReserve) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/courts/${courtToReserve.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "RESERVED" })
      })

      if (response.ok) {
        toast({
          title: "✅ Cancha reservada",
          description: "La cancha ha sido reservada exitosamente",
          variant: "success",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al reservar cancha")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al reservar cancha",
        variant: "destructive",
      })
    } finally {
      setReserveDialogOpen(false)
      setCourtToReserve(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (!courtToPermanentlyDelete) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/courts/${courtToPermanentlyDelete.id}/delete`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "✅ Cancha eliminada",
          description: "La cancha ha sido eliminada permanentemente",
          variant: "success",
        })
        fetchCourts()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar cancha")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar cancha",
        variant: "destructive",
      })
    } finally {
      setPermanentDeleteDialogOpen(false)
      setCourtToPermanentlyDelete(null)
    }
  }


  const filteredCourts = courts.filter(court => {
    const searchLower = searchTerm.toLowerCase()

    // Búsqueda en nombre
    const matchesName = court.name.toLowerCase().includes(searchLower)

    // Búsqueda en características
    const characteristics = []
    if (court.hasLighting) characteristics.push("iluminación", "luz", "lighting")
    if (court.hasRoof) characteristics.push("techo", "techada", "cubierta", "roof")
    if (court.isOutdoor) characteristics.push("exterior", "outdoor", "al aire libre")
    else characteristics.push("interior", "indoor", "cerrada")
    if (court.hasPanoramicGlass) characteristics.push("cristal", "panorámico", "vidrio", "glass")
    if (court.hasConcreteWall) characteristics.push("concreto", "pared", "concrete")
    if (court.hasNet4m) characteristics.push("red", "4m", "net")

    // Búsqueda en superficie
    const surfaceLabels = {
      CONCRETE: ["concreto", "concrete"],
      ARTIFICIAL_GRASS: ["césped", "artificial", "grass", "cesped"],
      CERAMIC: ["cerámica", "ceramic", "ceramica"],
      OTHER: ["otra", "other"]
    }
    const surfaceWords = surfaceLabels[court.surface as keyof typeof surfaceLabels] || []

    const matchesCharacteristics = characteristics.some(char => char.includes(searchLower)) ||
                                  surfaceWords.some(word => word.includes(searchLower))

    const matchesSearch = !searchTerm || matchesName || matchesCharacteristics
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <SquareSplitHorizontal className="h-5 w-5" />
          Canchas ({filteredCourts.length})
        </h3>
        {isAdminOrClubAdmin && (
          <Link href={`/dashboard/clubs/${clubId}/courts/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cancha
            </Button>
          </Link>
        )}
      </div>

      {/* Vista Mobile - Cards */}
      <div className="md:hidden space-y-4">
        {filteredCourts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No hay canchas registradas
            </CardContent>
          </Card>
        ) : (
          filteredCourts.map((court) => (
            <Card key={court.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{court.name}</h3>
                    {court.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {court.notes}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
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
                      {isAdminOrClubAdmin && (
                        <>
                          <Link href={`/dashboard/clubs/${clubId}/courts/${court.id}/edit`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          {court.status === "AVAILABLE" ? (
                            <>
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onClick={() => {
                                  setCourtToMaintenance(court)
                                  setMaintenanceDialogOpen(true)
                                }}
                              >
                                <Wrench className="mr-2 h-4 w-4" />
                                Mantenimiento
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-blue-600"
                                onClick={() => {
                                  setCourtToReserve(court)
                                  setReserveDialogOpen(true)
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Reservar
                              </DropdownMenuItem>
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
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() => {
                                setCourtToActivate(court)
                                setActivateDialogOpen(true)
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Poner Disponible
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Superficie</span>
                  <Badge variant="outline" className={getCourtSurfaceStyle(court.surface)}>
                    {getCourtSurfaceLabel(court.surface)}
                  </Badge>
                </div>

                {(court.hasLighting || court.hasRoof || court.isOutdoor || court.hasPanoramicGlass || court.hasConcreteWall || court.hasNet4m) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Características</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {court.hasLighting && <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Luz</div>}
                      {court.hasRoof && <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Techo</div>}
                      {court.isOutdoor && <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Exterior</div>}
                      {court.hasPanoramicGlass && <div className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">Cristal</div>}
                    </div>
                  </div>
                )}

                {court.hourlyRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precio/Hora</span>
                    <span className="font-medium">${court.hourlyRate}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Partidos</span>
                  <span className="font-medium">{court._count.matches}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant="outline" className={getCourtStatusStyle(court.status)}>
                    {getCourtStatusLabel(court.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vista Desktop - Tabla */}
      <Card className="hidden md:block">
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
                    No hay canchas registradas
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
                      <Badge variant="outline" className={getCourtSurfaceStyle(court.surface)}>
                        {getCourtSurfaceLabel(court.surface)}
                      </Badge>
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
                      <Badge variant="outline" className={getCourtStatusStyle(court.status)}>
                        {getCourtStatusLabel(court.status)}
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
                          <Link href={`/dashboard/clubs/${clubId}/courts/${court.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                          </Link>
                          {isAdminOrClubAdmin && (
                            <>
                              <Link href={`/dashboard/clubs/${clubId}/courts/${court.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {court.status === "AVAILABLE" ? (
                                <>
                                  <DropdownMenuItem
                                    className="text-yellow-600"
                                    onClick={() => {
                                      setCourtToMaintenance(court)
                                      setMaintenanceDialogOpen(true)
                                    }}
                                  >
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Mantenimiento
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-blue-600"
                                    onClick={() => {
                                      setCourtToReserve(court)
                                      setReserveDialogOpen(true)
                                    }}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Reservar
                                  </DropdownMenuItem>
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
                                  {court._count.matches === 0 ? (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setCourtToPermanentlyDelete(court)
                                        setPermanentDeleteDialogOpen(true)
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled
                                      className="text-gray-400 cursor-not-allowed"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                      <span className="ml-1 text-xs">(tiene partidos)</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => {
                                    setCourtToActivate(court)
                                    setActivateDialogOpen(true)
                                  }}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Poner Disponible
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
            <AlertDialogTitle>¿Poner cancha disponible?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción pondrá la cancha "{courtToActivate?.name}" como disponible. La cancha estará lista para programar partidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
              Poner Disponible
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para mantenimiento */}
      <AlertDialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Poner cancha en mantenimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción pondrá la cancha "{courtToMaintenance?.name}" en modo mantenimiento. La cancha no estará disponible para nuevos partidos.
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

      {/* Dialog de confirmación para reservar */}
      <AlertDialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reservar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la cancha "{courtToReserve?.name}" como reservada. La cancha no estará disponible para otros partidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReserve} className="bg-blue-600 hover:bg-blue-700">
              Reservar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminación permanente */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cancha permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la cancha "{courtToPermanentlyDelete?.name}". Esta acción no se puede deshacer.
              <br /><br />
              <strong>Esta cancha no tiene partidos asociados, por lo que se puede eliminar de forma segura.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}