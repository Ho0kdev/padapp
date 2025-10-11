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
  Trash2,
  Users
} from "lucide-react"
import Link from "next/link"
import {
  getTeamStatusStyle,
  getTeamStatusLabel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel
} from "@/lib/utils/status-styles"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { Card, CardContent } from "@/components/ui/card"

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface Team {
  id: string
  name: string | null
  status: string
  seed: number | null
  createdAt: Date
  tournament: {
    id: string
    name: string
    type: string
    status: string
  }
  category: {
    id: string
    name: string
  }
  registration1: {
    id: string
    registrationStatus: string
    player: Player
  }
  registration2: {
    id: string
    registrationStatus: string
    player: Player
  }
}

interface TeamsPaginatedResponse {
  teams: Team[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function TeamsTable() {
  const searchParams = useSearchParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

  useEffect(() => {
    fetchTeams()
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/teams?${params.toString()}`)

      if (response.ok) {
        const data: TeamsPaginatedResponse = await response.json()
        setTeams(data.teams || [])
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages
        })
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los equipos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!teamToDelete) return

    try {
      const response = await fetch(`/api/teams/${teamToDelete.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar equipo")
      }

      toast({
        title: "Equipo eliminado",
        description: "El equipo ha sido disuelto. Las inscripciones individuales se mantienen.",
        variant: "success"
      })

      fetchTeams()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el equipo",
        variant: "destructive"
      })
    } finally {
      setDeleteDialogOpen(false)
      setTeamToDelete(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-muted-foreground">Cargando equipos...</div>
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isAdmin ? "No hay equipos" : "No tienes equipos formados"}
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            {isAdmin
              ? "Todavía no se han formado equipos. Comienza inscribiendo jugadores individualmente."
              : "Aún no eres parte de ningún equipo. Una vez que te inscribas en un torneo, el administrador podrá formar tu equipo."}
          </p>
          {isAdmin && (
            <div className="flex gap-2">
              <Link href="/dashboard/registrations/new">
                <Button variant="outline">
                  Inscribir Jugadores
                </Button>
              </Link>
              <Link href="/dashboard/teams/new">
                <Button>
                  Formar Equipo
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Torneo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Jugadores</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">
                  {team.name || `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`}
                  {team.seed && (
                    <Badge variant="outline" className="ml-2">
                      Seed {team.seed}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{team.tournament.name}</TableCell>
                <TableCell>{team.category.name}</TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{team.registration1.player.firstName} {team.registration1.player.lastName}</span>
                      <Badge variant="outline" className={getRegistrationStatusStyle(team.registration1.registrationStatus)}>
                        {getRegistrationStatusLabel(team.registration1.registrationStatus)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{team.registration2.player.firstName} {team.registration2.player.lastName}</span>
                      <Badge variant="outline" className={getRegistrationStatusStyle(team.registration2.registrationStatus)}>
                        {getRegistrationStatusLabel(team.registration2.registrationStatus)}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getTeamStatusStyle(team.status)}>
                    {getTeamStatusLabel(team.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
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
                      <Link href={`/dashboard/teams/${team.id}`}>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                      </Link>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setTeamToDelete(team)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Disolver equipo
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <DataTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemsPerPage={pagination.limit}
        basePath="/dashboard/teams"
        itemName="equipos"
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Disolver este equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el equipo pero <strong>mantendrá las inscripciones individuales</strong> de ambos jugadores.
              Los jugadores podrán formar otro equipo si lo desean.
              <br /><br />
              Equipo: <strong>{teamToDelete?.name || `${teamToDelete?.registration1.player.firstName} ${teamToDelete?.registration1.player.lastName} / ${teamToDelete?.registration2.player.firstName} ${teamToDelete?.registration2.player.lastName}`}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disolver equipo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
