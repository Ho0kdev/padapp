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
  CreditCard
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { categoryTypeOptions } from "@/lib/validations/category"
import {
  tournamentStatusOptions as statusStyles,
  registrationStatusOptions,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  getTeamFormationStatusStyle,
  getTeamFormationStatusLabel
} from "@/lib/utils/status-styles"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"

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
  }
  category: {
    id: string
    name: string
    type: string
  }
  player: Player
  payment: {
    id: string
    amount: number
    paymentStatus: string
    paymentMethod: string
    paidAt: Date | null
  } | null
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
        title: "Error",
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
          title: "Inscripción eliminada",
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
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar inscripción",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setRegistrationToDelete(null)
    }
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

  const getTotalPaid = (payment: Registration['payment']) => {
    if (!payment) return 0
    return payment.paymentStatus === 'PAID' ? payment.amount : 0
  }

  const getPaymentStatus = (registration: Registration) => {
    const registrationFee = registration.tournamentCategory?.registrationFee || 0
    const totalPaid = getTotalPaid(registration.payment)

    if (registrationFee === 0) {
      return <Badge variant="secondary">Sin Costo</Badge>
    }

    if (totalPaid >= registrationFee) {
      return <Badge variant="default" className="bg-green-600">Pagado</Badge>
    }

    if (totalPaid > 0) {
      return <Badge variant="outline">Parcial</Badge>
    }

    return <Badge variant="destructive">Pendiente</Badge>
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Torneo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron inscripciones.
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((registration) => (
                <TableRow key={registration.id}>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/registrations/${registration.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        {(registration.tournamentCategory?.registrationFee || 0) > 0 && (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/registrations/${registration.id}/payment`}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Gestionar Pago
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
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
      </div>

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