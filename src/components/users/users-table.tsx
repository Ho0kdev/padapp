"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  Phone,
  User,
  Trophy,
  CheckCircle
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'ORGANIZER' | 'PLAYER'
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  player?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    gender?: 'MALE' | 'FEMALE' | 'MIXED'
    rankingPoints: number
    rankings: Array<{
      id: string
      currentPoints: number
      category: {
        id: string
        name: string
      }
    }>
    team1Memberships: Array<{
      id: string
      tournament: {
        id: string
        name: string
        status: string
      }
    }>
    team2Memberships: Array<{
      id: string
      tournament: {
        id: string
        name: string
        status: string
      }
    }>
  }
  organizerTournaments: Array<{
    id: string
    name: string
    status: string
  }>
}

interface UsersPaginatedResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    totalUsers: number
    totalPlayers: number
    totalActive: number
    totalOrganizers: number
  }
}

export function UsersTable() {
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlayers: 0,
    totalActive: 0,
    totalOrganizers: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [userToActivate, setUserToActivate] = useState<User | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    fetchUsers()
  }, [searchParams])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/users?${params.toString()}`)

      if (response.ok) {
        const data: UsersPaginatedResponse = await response.json()
        setUsers(data.users || [])
        setPagination(data.pagination)
        setStats(data.stats)
      } else {
        throw new Error("Error al cargar usuarios")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      ORGANIZER: 'secondary',
      PLAYER: 'default'
    } as const

    const labels = {
      ADMIN: 'Admin',
      ORGANIZER: 'Organizador',
      PLAYER: 'Jugador'
    }

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'default'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
        {status === "ACTIVE" ? "Activo" : "Inactivo"}
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

  const getUserInitials = (user: User) => {
    if (user.player) {
      return `${user.player.firstName[0] || ''}${user.player.lastName[0] || ''}`.toUpperCase()
    }
    return user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const getActiveTournaments = (user: User) => {
    if (!user.player) return []

    const tournaments = new Set()
    user.player.team1Memberships?.forEach(team => {
      if (team.tournament.status !== 'COMPLETED' && team.tournament.status !== 'CANCELLED') {
        tournaments.add(team.tournament.name)
      }
    })
    user.player.team2Memberships?.forEach(team => {
      if (team.tournament.status !== 'COMPLETED' && team.tournament.status !== 'CANCELLED') {
        tournaments.add(team.tournament.name)
      }
    })

    user.organizerTournaments?.forEach(tournament => {
      if (tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED') {
        tournaments.add(tournament.name)
      }
    })

    return Array.from(tournaments)
  }

  if (loading) {
    return <div className="text-center py-8">Cargando usuarios...</div>
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "INACTIVE"
        }),
      })

      if (response.ok) {
        toast({
          title: "Usuario desactivado",
          description: "El usuario ha sido desactivado exitosamente",
        })
        fetchUsers()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar usuario")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al desactivar usuario",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleActivate = async () => {
    if (!userToActivate) return

    try {
      const response = await fetch(`/api/users/${userToActivate.id}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast({
          title: "Usuario activado",
          description: "El usuario ha sido activado exitosamente",
        })
        fetchUsers()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar usuario")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar usuario",
        variant: "destructive",
      })
    } finally {
      setActivateDialogOpen(false)
      setUserToActivate(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizers}</div>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Puntos</TableHead>
              <TableHead>Torneos Activos</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const activeTournaments = getActiveTournaments(user)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.player?.profileImageUrl} />
                            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.player
                                ? `${user.player.firstName} ${user.player.lastName}`
                                : user.name
                              }
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        {user.player?.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {user.player.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {getGenderBadge(user.player?.gender) || <span className="text-muted-foreground text-sm">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">
                              {user.player?.rankingPoints || 0} pts
                            </div>
                            {user.player?.rankings && user.player.rankings.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {user.player.rankings[0].category.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activeTournaments.length > 0 ? (
                          <div className="space-y-1">
                            {activeTournaments.slice(0, 2).map((tournament, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tournament}
                              </Badge>
                            ))}
                            {activeTournaments.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{activeTournaments.length - 2} más
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: es })}
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
                              <Link href={`/dashboard/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/users/${user.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status === "ACTIVE" ? (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setUserToDelete(user)
                                      setDeleteDialogOpen(true)
                                    }}
                                    disabled={activeTournaments.length > 0}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-green-600"
                                    onClick={() => {
                                      setUserToActivate(user)
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/users"
        itemName="usuarios"
      />

      {/* Dialog de confirmación para desactivar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará al usuario "{userToDelete?.name || userToDelete?.player?.firstName + ' ' + userToDelete?.player?.lastName}". El usuario no podrá iniciar sesión pero sus datos se mantendrán en el sistema.
              {userToDelete && getActiveTournaments(userToDelete).length > 0 && (
                <span className="block mt-2 text-red-600">
                  No se puede desactivar este usuario porque está inscrito en {getActiveTournaments(userToDelete).length} torneo(s) activo(s): {getActiveTournaments(userToDelete).join(", ")}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={userToDelete && getActiveTournaments(userToDelete).length > 0}
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
            <AlertDialogTitle>¿Activar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción activará al usuario "{userToActivate?.name || userToActivate?.player?.firstName + ' ' + userToActivate?.player?.lastName}". El usuario volverá a tener acceso al sistema y podrá participar en torneos.
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