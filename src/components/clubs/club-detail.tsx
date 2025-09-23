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
  ExternalLink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { CourtsList } from "@/components/courts/courts-list"

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
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

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
        title: "Club desactivado",
        description: "El club ha sido desactivado exitosamente",
      })

      router.push("/dashboard/clubs")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al desactivar club",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {club.logoUrl && (
              <img
                src={club.logoUrl}
                alt={`Logo de ${club.name}`}
                className="h-12 w-12 rounded-full object-cover border-2"
              />
            )}
            <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
            {getStatusBadge(club.status)}
          </div>
          {club.description && (
            <p className="text-muted-foreground max-w-3xl">{club.description}</p>
          )}
        </div>

        {isAdmin && (
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
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={club.status === "INACTIVE"}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Desactivar
              </DropdownMenuItem>
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

                <div>
                  <h4 className="font-medium mb-2">Estado</h4>
                  {getStatusBadge(club.status)}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Estadísticas</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Canchas:</span>
                      <span className="ml-2 font-medium">{club._count.courts}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Torneos como sede principal:</span>
                      <span className="ml-2 font-medium">{club._count.tournaments}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Torneos como sede auxiliar:</span>
                      <span className="ml-2 font-medium">{club._count.tournamentClubs}</span>
                    </div>
                  </div>
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
                    <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tournament.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tournament.tournamentStart).toLocaleDateString('es', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(tournament.status)}
                        <Link href={`/dashboard/tournaments/${tournament.id}`}>
                          <Button variant="outline" size="sm">
                            Ver torneo
                          </Button>
                        </Link>
                      </div>
                    </div>
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
                    <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tournament.name}</h4>
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
                      <div className="flex items-center gap-2">
                        {getStatusBadge(tournament.status)}
                        <Link href={`/dashboard/tournaments/${tournament.id}`}>
                          <Button variant="outline" size="sm">
                            Ver torneo
                          </Button>
                        </Link>
                      </div>
                    </div>
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
    </div>
  )
}