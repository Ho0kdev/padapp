"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  Edit,
  MoreHorizontal,
  Trophy,
  Users,
  CreditCard,
  Copy,
  Trash2,
  DollarSign,
  UserCheck
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { categoryTypeOptions } from "@/lib/validations/category"
import {
  tournamentStatusOptions as statusStyles,
  registrationStatusOptions,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel
} from "@/lib/utils/status-styles"
import { RegistrationStatusManager } from "./registration-status-manager"

interface RegistrationWithDetails {
  id: string
  name: string | null
  registrationStatus: string
  registeredAt: Date
  seed: number | null
  notes: string | null
  isAmericanoSocial: boolean
  tournament: {
    id: string
    name: string
    type: string
    status: string
    tournamentStart: Date
    tournamentEnd: Date | null
    registrationStart: Date | null
    registrationEnd: Date | null
  }
  category: {
    id: string
    name: string
    type: string
    genderRestriction: string | null
    minAge: number | null
    maxAge: number | null
    minRankingPoints: number | null
    maxRankingPoints: number | null
  }
  player?: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    dateOfBirth: Date | null
    gender: string | null
    rankingPoints: number
    user?: {
      email: string | null
    } | null
  }
  player1: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    dateOfBirth: Date | null
    gender: string | null
    rankingPoints: number
    user?: {
      email: string | null
    } | null
  } | null
  player2: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    dateOfBirth: Date | null
    gender: string | null
    rankingPoints: number
    user?: {
      email: string | null
    } | null
  } | null
  payments: Array<{
    id: string
    amount: number
    paymentStatus: string
    paymentMethod: string
    paidAt: Date | null
    createdAt: Date
  }>
  tournamentCategory: {
    registrationFee: number | null
    maxTeams: number | null
  } | null
}

interface RegistrationDetailProps {
  registration: RegistrationWithDetails
}

export function RegistrationDetail({ registration }: RegistrationDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const statusConfig = registrationStatusOptions.find(s => s.value === registration.registrationStatus)

  const totalPaid = registration.payments
    .filter(payment => payment.paymentStatus === 'PAID')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const registrationFee = registration.tournamentCategory?.registrationFee || 0
  const amountDue = Math.max(0, registrationFee - totalPaid)

  const getTeamName = () => {
    if (registration.isAmericanoSocial && registration.player) {
      return `${registration.player.firstName} ${registration.player.lastName}`
    }

    if (registration.player1 && registration.player2) {
      return registration.name ||
             `${registration.player1.firstName} ${registration.player1.lastName} / ${registration.player2.firstName} ${registration.player2.lastName}`
    }

    return registration.name || 'Sin nombre'
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/registrations/${registration.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar inscripción")
      }

      toast({
        title: "Éxito",
        description: "Inscripción eliminada correctamente",
        variant: "success",
      })

      router.push("/dashboard/registrations")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar inscripción",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Enlace copiado",
        description: "El enlace de la inscripción ha sido copiado al portapapeles",
        variant: "success",
      })
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={getRegistrationStatusStyle(status)}>
        {getRegistrationStatusLabel(status)}
      </Badge>
    )
  }

  const getPaymentStatusBadge = () => {
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



  const canDelete = !['IN_PROGRESS', 'COMPLETED'].includes(registration.tournament.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{getTeamName()}</h1>
            <RegistrationStatusManager
              registrationId={registration.id}
              currentStatus={registration.registrationStatus}
              tournamentStatus={registration.tournament.status}
            />
            {getPaymentStatusBadge()}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {registration.tournament.name}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {registration.category.name}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Inscrito {format(new Date(registration.registeredAt), "dd/MM/yyyy", { locale: es })}
            </div>
            {registration.seed && (
              <div className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                Seed #{registration.seed}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar enlace
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/registrations/${registration.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {registrationFee > 0 && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/registrations/${registration.id}/payment`}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Gestionar Pago
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!canDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <p className="text-2xl font-bold">{statusConfig?.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Pagado</p>
                <p className="text-2xl font-bold">${totalPaid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold">${amountDue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Seed</p>
                <p className="text-2xl font-bold">{registration.seed ? `#${registration.seed}` : "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información del Torneo */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Torneo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Torneo</p>
                  <Link href={`/dashboard/tournaments/${registration.tournament.id}`} className="hover:underline">
                    {registration.tournament.name}
                  </Link>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                  <div className="flex items-center gap-2">
                    <span>{registration.category.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        categoryTypeOptions.find(opt => opt.value === registration.category.type)?.color === 'blue' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                        categoryTypeOptions.find(opt => opt.value === registration.category.type)?.color === 'green' ? 'border-green-200 text-green-700 bg-green-50' :
                        categoryTypeOptions.find(opt => opt.value === registration.category.type)?.color === 'purple' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                        categoryTypeOptions.find(opt => opt.value === registration.category.type)?.color === 'pink' ? 'border-pink-200 text-pink-700 bg-pink-50' :
                        categoryTypeOptions.find(opt => opt.value === registration.category.type)?.color === 'orange' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                        'border-gray-200 text-gray-700 bg-gray-50'
                      }`}
                    >
                      {categoryTypeOptions.find(opt => opt.value === registration.category.type)?.label || registration.category.type}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado del Torneo</p>
                  <Badge
                    variant="outline"
                    className={statusStyles.find(opt => opt.value === registration.tournament.status)?.css || "bg-gray-100 text-gray-800 border-gray-200"}
                  >
                    {statusStyles.find(opt => opt.value === registration.tournament.status)?.label || registration.tournament.status}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechas del Torneo</p>
                  <div className="space-y-1 text-sm">
                    <div>Inicio: {format(new Date(registration.tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}</div>
                    {registration.tournament.tournamentEnd && (
                      <div>Fin: {format(new Date(registration.tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}</div>
                    )}
                  </div>
                </div>

                {registration.tournamentCategory && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tarifa de Inscripción</p>
                    <p>${registration.tournamentCategory.registrationFee || 0}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de la Inscripción */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Inscripción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <p>{statusConfig?.label}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Inscripción</p>
                  <p>{format(new Date(registration.registeredAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                </div>

                {registration.seed && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Seed</p>
                    <p>#{registration.seed}</p>
                  </div>
                )}

                {registration.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notas</p>
                    <p className="text-sm">{registration.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Inscripción</p>
                  <div className="text-sm">
                    {format(new Date(registration.registeredAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="players">
          {registration.isAmericanoSocial && registration.player ? (
            /* Vista para Americano Social - Un solo jugador */
            <Card>
              <CardHeader>
                <CardTitle>Información del Jugador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p>{registration.player.firstName} {registration.player.lastName}</p>
                </div>

                {registration.player.user?.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{registration.player.user.email}</p>
                  </div>
                )}

                {registration.player.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p>{registration.player.phone}</p>
                  </div>
                )}

                {registration.player.gender && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Género</p>
                    <p>{registration.player.gender}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Puntos de Ranking</p>
                  <p>{registration.player.rankingPoints} puntos</p>
                </div>

                {registration.player.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                    <p>{format(new Date(registration.player.dateOfBirth), "dd/MM/yyyy", { locale: es })}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Vista para torneos por equipos - Dos jugadores */
            <div className="grid gap-4 md:grid-cols-2">
              {registration.player1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Jugador 1</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                      <p>{registration.player1.firstName} {registration.player1.lastName}</p>
                    </div>

                    {registration.player1.user?.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p>{registration.player1.user.email}</p>
                      </div>
                    )}

                    {registration.player1.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p>{registration.player1.phone}</p>
                      </div>
                    )}

                    {registration.player1.gender && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Género</p>
                        <p>{registration.player1.gender}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Puntos de Ranking</p>
                      <p>{registration.player1.rankingPoints} puntos</p>
                    </div>

                    {registration.player1.dateOfBirth && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                        <p>{format(new Date(registration.player1.dateOfBirth), "dd/MM/yyyy", { locale: es })}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {registration.player2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Jugador 2</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                      <p>{registration.player2.firstName} {registration.player2.lastName}</p>
                    </div>

                    {registration.player2.user?.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p>{registration.player2.user.email}</p>
                      </div>
                    )}

                    {registration.player2.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p>{registration.player2.phone}</p>
                      </div>
                    )}

                    {registration.player2.gender && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Género</p>
                        <p>{registration.player2.gender}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Puntos de Ranking</p>
                      <p>{registration.player2.rankingPoints} puntos</p>
                    </div>

                    {registration.player2.dateOfBirth && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                        <p>{format(new Date(registration.player2.dateOfBirth), "dd/MM/yyyy", { locale: es })}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {registration.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos registrados para esta inscripción
                </p>
              ) : (
                <div className="space-y-4">
                  {registration.payments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={payment.paymentStatus === 'PAID' ? 'default' :
                                   payment.paymentStatus === 'PENDING' ? 'outline' : 'destructive'}
                            className={payment.paymentStatus === 'PAID' ? 'bg-green-600' : ''}
                          >
                            {payment.paymentStatus === 'PAID' ? 'Pagado' :
                             payment.paymentStatus === 'PENDING' ? 'Pendiente' : 'Cancelado'}
                          </Badge>
                          <span className="font-medium">${payment.amount}</span>
                        </div>
                        <Badge variant="outline">
                          {payment.paymentMethod}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Creado: {format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                        {payment.paidAt && (
                          <div>
                            Pagado: {format(new Date(payment.paidAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center font-medium">
                    <span>Total Pagado:</span>
                    <span>${totalPaid}</span>
                  </div>

                  {registrationFee > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Tarifa Total:</span>
                        <span>${registrationFee}</span>
                      </div>
                      <div className="flex justify-between items-center font-medium">
                        <span>Pendiente:</span>
                        <span className={amountDue > 0 ? "text-red-600" : "text-green-600"}>
                          ${amountDue}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la inscripción de &quot;{getTeamName()}&quot;. Esta acción no se puede deshacer.
              {!canDelete && (
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
              disabled={loading || !canDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}