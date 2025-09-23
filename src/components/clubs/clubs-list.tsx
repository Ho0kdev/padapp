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
  Building,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Calendar,
  CheckCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

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

export function ClubsList() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [clubToActivate, setClubToActivate] = useState<Club | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/clubs")
      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs || [])
      } else {
        throw new Error("Error al cargar clubes")
      }
    } catch (error) {
      toast({
        title: "Error",
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
          title: "Club desactivado",
          description: "El club ha sido desactivado exitosamente",
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
        title: "Error",
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
          title: "Club activado",
          description: "El club ha sido activado exitosamente",
        })
        fetchClubs()
      } else {
        const error = await response.json()
        console.error("Error response:", error)
        throw new Error(error.details || error.error || "Error al activar club")
      }
    } catch (error) {
      console.error("Activate error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar club",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setClubToActivate(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: "bg-green-100 text-green-800",
      INACTIVE: "bg-red-100 text-red-800"
    }

    const labels = {
      ACTIVE: "Activo",
      INACTIVE: "Inactivo"
    }

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         club.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         club.address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || club.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Clubes ({filteredClubs.length})
            </CardTitle>
            {isAdmin && (
              <Link href="/dashboard/clubs/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Club
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
                placeholder="Buscar clubes..."
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de clubes */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estadísticas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchTerm || statusFilter !== "all"
                      ? "No se encontraron clubes con los filtros aplicados"
                      : "No hay clubes registrados"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{club.name}</div>
                        {club.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {club.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div>{club.address}</div>
                          <div className="text-muted-foreground">
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
                            <a
                              href={club.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Sitio web
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {club._count.courts} canchas
                        </div>
                        {club._count.tournaments !== undefined && club._count.tournaments > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {club._count.tournaments} como sede
                          </div>
                        )}
                        {club._count.tournamentClubs !== undefined && club._count.tournamentClubs > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {club._count.tournamentClubs} participaciones
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(club.status)}
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
                          {isAdmin && (
                            <>
                              <Link href={`/dashboard/clubs/${club.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {club.status === "ACTIVE" ? (
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

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar club?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el club &quot;{clubToDelete?.name}&quot;. El club no será eliminado pero no aparecerá en las listas activas.
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
            <AlertDialogTitle>¿Activar club?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará el club &quot;{clubToActivate?.name}&quot;. El club volverá a aparecer en las listas activas y estará disponible para torneos.
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