"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
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
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  Wrench
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { CourtsList } from "@/components/courts/courts-list"
import { getTournamentStatusStyle, getTournamentStatusLabel, getClubStatusStyle, getClubStatusLabel } from "@/lib/utils/status-styles"

interface Court {
  id: string
  name: string
  surface: string
  status: string
}

interface Tournament {
  id: string
  name: string
  status: string
  tournamentStart: string
}

interface AuxiliaryTournament {
  id: string
  name: string
  status: string
  tournamentStart: string
  mainClubName: string
}

interface Club {
  id: string
  name: string
  description?: string
  address: string
  city: string
  state?: string
  country: string
  postalCode?: string
  phone?: string
  email?: string
  website?: string
  latitude?: number
  longitude?: number
  status: string
  logoUrl?: string
  courts: Court[]
  tournaments: Tournament[]
  auxiliaryTournaments?: AuxiliaryTournament[]
  _count: {
    courts: number
    tournaments: number
    tournamentClubs: number
  }
  createdAt: string
  updatedAt: string
}

interface ClubDetailProps {
  club: Club
  currentUserId: string
}

export function ClubDetail({ club, currentUserId }: ClubDetailProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { isAdminOrOrganizer } = useAuth()

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/clubs/${club.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar club")
      }

      toast({
        title: "✅ Club desactivado",
        description: "El club ha sido desactivado exitosamente",
        variant: "success",
      })

      router.push("/dashboard/clubs")
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al desactivar club",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleActivate = async () => {
    try {
      const response = await fetch(`/api/clubs/${club.id}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast({
          title: "✅ Club activado",
          description: "El club ha sido activado exitosamente",
          variant: "success",
        })
        window.location.reload()
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
    }
  }

  const handleMaintenance = async () => {
    try {
      const response = await fetch(`/api/clubs/${club.id}`, {
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
        window.location.reload()
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
    }
  }


  const getTournamentStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTournamentStatusStyle(status)}>
        {getTournamentStatusLabel(status)}
      </Badge>
    )
  }


  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Clubes", href: "/dashboard/clubs" },
          { label: club.name }
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 sm:gap-3">
            {club.logoUrl && (
              <img
                src={club.logoUrl}
                alt={`Logo de ${club.name}`}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 flex-shrink-0"
              />
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{club.name}</h1>
            <Badge variant="outline" className={getClubStatusStyle(club.status)}>
              {getClubStatusLabel(club.status)}
            </Badge>
          </div>
          {club.description && (
            <p className="text-muted-foreground max-w-3xl">{club.description}</p>
          )}
        </div>

        {isAdminOrOrganizer && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                    onClick={() => setMaintenanceDialogOpen(true)}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Mantenimiento
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desactivar
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="text-green-600"
                  onClick={() => setActivateDialogOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Información General</TabsTrigger>
          <TabsTrigger value="courts">Canchas ({club._count.courts})</TabsTrigger>
          <TabsTrigger value="tournaments">Torneos ({club._count.tournaments + (club._count.tournamentClubs || 0)})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Información del Club
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {club.logoUrl && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Logo del Club</h4>
                    <div className="flex items-center gap-3">
                      <img
                        src={club.logoUrl}
                        alt={`Logo de ${club.name}`}
                        className="h-16 w-16 rounded-lg object-cover border"
                      />
                      <a
                        href={club.logoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        Ver en tamaño completo <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-medium">Estado</span>
                  <Badge variant="outline" className={getClubStatusStyle(club.status)}>
                    {getClubStatusLabel(club.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Ubicación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{club.address}</p>
                  <p className="text-muted-foreground">
                    {club.city}, {club.state && `${club.state}, `}{club.country}
                  </p>
                  {club.postalCode && (
                    <p className="text-sm text-muted-foreground">CP: {club.postalCode}</p>
                  )}
                </div>

                {(club.latitude && club.longitude) && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Coordenadas: {club.latitude.toFixed(6)}, {club.longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${club.latitude},${club.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                    >
                      Ver en Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {club.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{club.phone}</span>
                  </div>
                )}

                {club.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${club.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {club.email}
                    </a>
                  </div>
                )}

                {club.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={club.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Sitio web <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courts" className="space-y-6">
          <CourtsList clubId={club.id} />
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Torneos como Sede Principal</CardTitle>
            </CardHeader>
            <CardContent>
              {club.tournaments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este club no ha sido sede principal de torneos
                </p>
              ) : (
                <div className="space-y-4">
                  {club.tournaments.map((tournament) => (
                    <Link key={tournament.id} href={`/dashboard/tournaments/${tournament.id}`}>
                      <div className="p-4 border rounded-lg space-y-2 hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium flex-1">{tournament.name}</h4>
                          {getTournamentStatusBadge(tournament.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tournament.tournamentStart).toLocaleDateString('es', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Torneos como Sede Auxiliar */}
          <Card>
            <CardHeader>
              <CardTitle>Torneos como Sede Auxiliar</CardTitle>
            </CardHeader>
            <CardContent>
              {!club.auxiliaryTournaments || club.auxiliaryTournaments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este club no participa como sede auxiliar en torneos
                </p>
              ) : (
                <div className="space-y-4">
                  {(club.auxiliaryTournaments || []).map((tournament) => (
                    <Link key={tournament.id} href={`/dashboard/tournaments/${tournament.id}`}>
                      <div className="p-4 border rounded-lg space-y-2 hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium flex-1">{tournament.name}</h4>
                          {getTournamentStatusBadge(tournament.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Sede principal: <span className="font-medium">{tournament.mainClubName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tournament.tournamentStart).toLocaleDateString('es', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar club?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el club &quot;{club.name}&quot;. El club no será eliminado pero no aparecerá en las listas activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Desactivando..." : "Desactivar"}
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
              Esta acción activará el club &quot;{club.name}&quot;. El club volverá a aparecer en las listas y estará disponible para nuevos torneos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-green-600 hover:bg-green-700"
            >
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
              Esta acción pondrá el club &quot;{club.name}&quot; en modo mantenimiento. El club seguirá visible pero no estará disponible para nuevos torneos.
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