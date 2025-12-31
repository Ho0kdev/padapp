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
  DropdownMenuLabel,
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
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { categoryTypeOptions } from "@/lib/validations/category"
import {
  tournamentStatusOptions as statusStyles,
  registrationStatusOptions,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  getTeamFormationStatusStyle,
  getTeamFormationStatusLabel,
  getRegistrationPaymentStatus,
  type RegistrationPayment
} from "@/lib/utils/status-styles"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  firstName: string
  lastName: string
  user?: {
    email: string
  }
}

interface Registration {
  id: string
  registrationStatus: string
  registeredAt: Date
  notes: string | null
  tournament: {
    id: string
    name: string
    type: string
    status: string
    registrationFee: number
  }
  category: {
    id: string
    name: string
    type: string
  }
  player: Player
  payments: Array<{
    id: string
    amount: number
    paymentStatus: string
    paymentMethod: string
    paidAt: Date | null
  }>
  tournamentCategory: {
    registrationFee: number | null
  } | null
  teamAsPlayer1: Array<{
    id: string
    name: string | null
    registration2: {
      player: Player
    }
  }>
  teamAsPlayer2: Array<{
    id: string
    name: string | null
    registration1: {
      player: Player
    }
  }>
}

interface RegistrationsPaginatedResponse {
  registrations: Registration[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export function RegistrationsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"
  const orderBy = searchParams.get('orderBy') || 'createdAt'
  const order = searchParams.get('order') || 'desc'

  useEffect(() => {
    fetchRegistrations()
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/registrations?${params.toString()}`)

      if (response.ok) {
        const data: RegistrationsPaginatedResponse = await response.json()
        setRegistrations(data.registrations || [])
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        })
      } else {
        throw new Error("Error al cargar inscripciones")
      }
    } catch {
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar las inscripciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!registrationToDelete) return

    try {
      const response = await fetch(`/api/registrations/${registrationToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "✅ Inscripción eliminada",
          description: "La inscripción ha sido eliminada exitosamente",
          variant: "success",
        })
        fetchRegistrations()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar inscripción")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar inscripción",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setRegistrationToDelete(null)
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
    router.push(`/dashboard/registrations?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleRowClick = (registrationId: string, e: React.MouseEvent) => {
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
    router.push(`/dashboard/registrations/${registrationId}`)
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={getRegistrationStatusStyle(status)}>
        {getRegistrationStatusLabel(status)}
      </Badge>
    )
  }

  const getDisplayName = (registration: Registration) => {
    return `${registration.player.firstName} ${registration.player.lastName}`
  }

  const getPaymentStatus = (registration: Registration) => {
    // Usar registrationFee de la categoría, o del torneo como fallback
    const registrationFee = registration.tournamentCategory?.registrationFee ?? registration.tournament.registrationFee
    const payments = registration.payments as RegistrationPayment[]
    const paymentInfo = getRegistrationPaymentStatus(registrationFee, payments)

    // Determinar el variant basado en el status
    const variant = paymentInfo.status === 'PAID' ? 'default' :
                    paymentInfo.status === 'PARTIAL' ? 'outline' :
                    paymentInfo.status === 'PENDING' ? 'destructive' :
                    'secondary'

    return (
      <Badge variant={variant} className={paymentInfo.css}>{paymentInfo.label}</Badge>
    )
  }

  const getTeamStatus = (registration: Registration) => {
    const hasTeam = (registration.teamAsPlayer1 && registration.teamAsPlayer1.length > 0) ||
                    (registration.teamAsPlayer2 && registration.teamAsPlayer2.length > 0)

    if (hasTeam) {
      const team = registration.teamAsPlayer1[0] || registration.teamAsPlayer2[0]
      return (
        <Link href={`/dashboard/teams/${team.id}`}>
          <Badge variant="default" className={`cursor-pointer ${getTeamFormationStatusStyle(true)}`}>
            {getTeamFormationStatusLabel(true)}
          </Badge>
        </Link>
      )
    }

    return (
      <Badge variant="outline" className={getTeamFormationStatusStyle(false)}>
        {getTeamFormationStatusLabel(false)}
      </Badge>
    )
  }


  const getTournamentStatusBadge = (status: string) => {
    const statusConfig = statusStyles.find(opt => opt.value === status)
    if (!statusConfig) return <Badge variant="outline">{status}</Badge>

    return (
      <Badge variant="outline" className={`text-xs ${statusConfig.css}`}>
        {statusConfig.label}
      </Badge>
    )
  }

  const getCategoryTypeBadge = (type: string) => {
    const typeConfig = categoryTypeOptions.find(opt => opt.value === type)
    if (!typeConfig) return <span className="text-xs text-muted-foreground">{type}</span>

    const getClassName = (): string => {
      switch (typeConfig.color) {
        case "blue":
          return "border-blue-200 text-blue-700 bg-blue-50"
        case "green":
          return "border-green-200 text-green-700 bg-green-50"
        case "purple":
          return "border-purple-200 text-purple-700 bg-purple-50"
        case "pink":
          return "border-pink-200 text-pink-700 bg-pink-50"
        case "orange":
          return "border-orange-200 text-orange-700 bg-orange-50"
        default:
          return "border-gray-200 text-gray-700 bg-gray-50"
      }
    }

    return (
      <Badge variant="outline" className={`text-xs ${getClassName()}`}>
        {typeConfig.label}
      </Badge>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Cargando inscripciones...</div>
  }

  // Componente de tarjeta para mobile
  const RegistrationCard = ({ registration }: { registration: Registration }) => {
    return (
      <Card
        className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => handleRowClick(registration.id, e)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {getDisplayName(registration)}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {registration.player.user?.email}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/registrations/${registration.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/registrations/${registration.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)}
                      onClick={() => {
                        setRegistrationToDelete(registration)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            {getStatusBadge(registration.registrationStatus)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Torneo</span>
            <span className="font-medium truncate max-w-[180px]">{registration.tournament.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categoría</span>
            <span className="truncate max-w-[180px]">{registration.category.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tipo</span>
            {getCategoryTypeBadge(registration.category.type)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pago</span>
            {getPaymentStatus(registration)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Equipo</span>
            {getTeamStatus(registration)}
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Estado Torneo</span>
            {getTournamentStatusBadge(registration.tournament.status)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fecha</span>
            <span className="text-muted-foreground">
              {format(new Date(registration.registeredAt), "dd/MM/yyyy", { locale: es })}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile cards view */}
      <div className="lg:hidden space-y-3">
        {registrations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron inscripciones.
            </CardContent>
          </Card>
        ) : (
          registrations.map((registration) => (
            <RegistrationCard key={registration.id} registration={registration} />
          ))
        )}
      </div>

      {/* Desktop table view */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Torneo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('registrationStatus')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Estado
                    {getSortIcon('registrationStatus')}
                  </Button>
                </TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('createdAt')}
                    className="h-8 px-2 lg:px-3 hover:bg-transparent"
                  >
                    Fecha
                    {getSortIcon('createdAt')}
                  </Button>
                </TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron inscripciones.
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((registration) => (
                <TableRow
                  key={registration.id}
                  onClick={(e) => handleRowClick(registration.id, e)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {getDisplayName(registration)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {registration.player.user?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{registration.tournament.name}</div>
                      {getTournamentStatusBadge(registration.tournament.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{registration.category.name}</div>
                      {getCategoryTypeBadge(registration.category.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(registration.registrationStatus)}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatus(registration)}
                  </TableCell>
                  <TableCell>
                    {getTeamStatus(registration)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(registration.registeredAt), "dd/MM/yyyy", { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/registrations/${registration.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/registrations/${registration.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)}
                              onClick={() => {
                                setRegistrationToDelete(registration)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
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
        </CardContent>
      </Card>

      <DataTablePagination
        currentPage={pagination?.page || 1}
        totalPages={pagination?.totalPages || 0}
        total={pagination?.total || 0}
        itemsPerPage={pagination?.limit || 10}
        basePath="/dashboard/registrations"
        itemName="inscripciones"
      />

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la inscripción de &quot;{registrationToDelete && getDisplayName(registrationToDelete)}&quot;.
              Esta acción no se puede deshacer.
              {registrationToDelete && ['IN_PROGRESS', 'COMPLETED'].includes(registrationToDelete.tournament.status) && (
                <span className="block mt-2 text-red-600">
                  No se puede eliminar esta inscripción porque el torneo está en progreso o completado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={registrationToDelete ? ['IN_PROGRESS', 'COMPLETED'].includes(registrationToDelete.tournament.status) : false}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}