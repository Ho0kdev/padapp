"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CLUB_ADMIN' | 'PLAYER' | 'REFEREE'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  player?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    gender?: 'MALE' | 'FEMALE' | 'MIXED'
    rankingPoints: number
    primaryCategory?: {
      id: string
      name: string
    }
    rankings: Array<{
      id: string
      currentPoints: number
      category: {
        id: string
        name: string
      }
    }>
    registrations: Array<{
      id: string
      tournament: {
        id: string
        name: string
        status: string
      }
      category: {
        id: string
        name: string
      }
      teamAsPlayer1?: Array<{
        id: string
        tournament: {
          id: string
          name: string
          status: string
        }
      }>
      teamAsPlayer2?: Array<{
        id: string
        tournament: {
          id: string
          name: string
          status: string
        }
      }>
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
  const router = useRouter()
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
  const { isAdmin } = useAuth()

  const orderBy = searchParams.get('orderBy') || 'createdAt'
  const order = searchParams.get('order') || 'desc'

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
        title: "❌ Error",
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
      CLUB_ADMIN: 'secondary',
      REFEREE: 'outline',
      PLAYER: 'default'
    } as const

    const labels = {
      ADMIN: 'Admin',
      CLUB_ADMIN: 'Admin Club',
      REFEREE: 'Árbitro',
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
    const tournaments = new Set<string>()

    // Torneos donde el jugador está inscrito (a través de registrations -> teams)
    if (user.player?.registrations) {
      user.player.registrations.forEach(registration => {
        // teamAsPlayer1 y teamAsPlayer2 son ARRAYS de equipos
        const teamsAsPlayer1 = registration.teamAsPlayer1 || []
        const teamsAsPlayer2 = registration.teamAsPlayer2 || []

        // Verificar equipos donde el jugador es player1
        teamsAsPlayer1.forEach(team => {
          if (team?.tournament &&
              team.tournament.status !== 'COMPLETED' &&
              team.tournament.status !== 'CANCELLED') {
            tournaments.add(team.tournament.name)
          }
        })

        // Verificar equipos donde el jugador es player2
        teamsAsPlayer2.forEach(team => {
          if (team?.tournament &&
              team.tournament.status !== 'COMPLETED' &&
              team.tournament.status !== 'CANCELLED') {
            tournaments.add(team.tournament.name)
          }
        })
      })
    }

    // Torneos organizados por el usuario
    user.organizerTournaments?.forEach(tournament => {
      if (tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED') {
        tournaments.add(tournament.name)
      }
    })

    return Array.from(tournaments)
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
    router.push(`/dashboard/users?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (userId: string, e: React.MouseEvent) => {
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
    router.push(`/dashboard/users/${userId}`)
  }

  // Componente de tarjeta para mobile
  const UserCard = ({ user }: { user: User }) => {
    const activeTournaments = getActiveTournaments(user)

    return (
      <Card
        className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => handleRowClick(user.id, e)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={(user.player as any)?.profileImageUrl} />
                <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {user.player
                    ? `${user.player.firstName} ${user.player.lastName}`
                    : user.name
                  }
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categoría</span>
            {user.player?.primaryCategory ? (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{user.player.primaryCategory.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
          {activeTournaments.length > 0 && (
            <div className="flex flex-col gap-2 text-sm pt-2 border-t">
              <span className="text-muted-foreground">Torneos Activos</span>
              <div className="flex flex-wrap gap-1">
                {activeTournaments.slice(0, 3).map((tournament: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tournament}
                  </Badge>
                ))}
                {activeTournaments.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{activeTournaments.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
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
          title: "✅ Usuario desactivado",
          description: "El usuario ha sido desactivado exitosamente",
          variant: "success",
        })
        fetchUsers()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar usuario")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
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
          title: "✅ Usuario activado",
          description: "El usuario ha sido activado exitosamente",
          variant: "success",
        })
        fetchUsers()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al activar usuario")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
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
      {/* Stats Cards - Oculto en mobile */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Vista de tarjetas para mobile */}
      <div className="lg:hidden space-y-3">
        {users.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron usuarios
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <UserCard key={user.id} user={user} />
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
                  Usuario
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('role')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Rol
                  {getSortIcon('role')}
                </Button>
              </TableHead>
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
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('gender')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Género
                  {getSortIcon('gender')}
                </Button>
              </TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Torneos Activos</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="h-8 px-2 lg:px-3 hover:bg-transparent"
                >
                  Registro
                  {getSortIcon('createdAt')}
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const activeTournaments = getActiveTournaments(user)
                  return (
                    <TableRow
                      key={user.id}
                      onClick={(e) => handleRowClick(user.id, e)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={(user.player as any)?.profileImageUrl} />
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
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {getGenderBadge(user.player?.gender) || <span className="text-muted-foreground text-sm">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.player?.primaryCategory ? (
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {user.player.primaryCategory.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activeTournaments.length > 0 ? (
                          <div className="space-y-1">
                            {activeTournaments.slice(0, 2).map((tournament: any, i: number) => (
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
        </CardContent>
      </Card>

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
              disabled={userToDelete ? getActiveTournaments(userToDelete).length > 0 : false}
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