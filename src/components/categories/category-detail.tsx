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
  Tag,
  Settings,
  Trash2,
  Copy,
  TrendingUp,
  Activity
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { categoryTypeOptions, genderOptions } from "@/lib/validations/category"
import { getTournamentStatusStyle, getTournamentStatusLabel, getCategoryTypeStyle } from "@/lib/utils/status-styles"

interface CategoryWithDetails {
  id: string
  name: string
  description: string | null
  type: "AGE" | "SKILL" | "RANKING" | "GENDER" | "MIXED"
  minAge: number | null
  maxAge: number | null
  genderRestriction: "MALE" | "FEMALE" | null
  minRankingPoints: number | null
  maxRankingPoints: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tournamentCategories: {
    id: string
    maxTeams: number | null
    registrationFee: number | null
    tournament: {
      id: string
      name: string
      status: string
      tournamentStart: Date
      tournamentEnd: Date | null
      organizerId: string
      _count: {
        teams: number
      }
    }
    teams: {
      id: string
      name: string | null
      player1: {
        firstName: string
        lastName: string
      }
      player2: {
        firstName: string
        lastName: string
      }
    }[]
  }[]
  _count: {
    tournamentCategories: number
  }
}

interface CategoryDetailProps {
  category: CategoryWithDetails
  currentUserId: string
}

export function CategoryDetail({ category, currentUserId }: CategoryDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const typeConfig = categoryTypeOptions.find(t => t.value === category.type)
  const genderConfig = genderOptions.find(g => g.value === category.genderRestriction)

  const totalTeams = category.tournamentCategories.reduce((sum, tc) => sum + tc.teams.length, 0)
  const activeTournaments = category.tournamentCategories.filter(tc =>
    tc.tournament.status !== "CANCELLED" && tc.tournament.status !== "COMPLETED" && tc.tournament.status !== "DRAFT"
  ).length

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al desactivar categoría")
      }

      toast({
        title: "Éxito",
        description: "Categoría desactivada correctamente",
      })

      router.push("/dashboard/categories")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al desactivar categoría",
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
        description: "El enlace de la categoría ha sido copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTournamentStatusStyle(status)}>
        {getTournamentStatusLabel(status)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
            <Badge variant={category.isActive ? "default" : "secondary"}>
              {category.isActive ? "Activa" : "Inactiva"}
            </Badge>
            <Badge variant="outline" className={getCategoryTypeStyle(category.type)}>
              {typeConfig?.label}
            </Badge>
          </div>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {category._count.tournamentCategories} torneos
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalTeams} equipos totales
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Creada {category.createdAt ? format(new Date(category.createdAt), "dd/MM/yyyy", { locale: es }) : "fecha no disponible"}
            </div>
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
                <Link href={`/dashboard/categories/${category.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={category._count.tournamentCategories > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Desactivar
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
                <p className="text-sm font-medium text-muted-foreground">Torneos</p>
                <p className="text-2xl font-bold">{category._count.tournamentCategories}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Equipos</p>
                <p className="text-2xl font-bold">{totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{activeTournaments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <p className="text-2xl font-bold">{category.isActive ? "Activa" : "Inactiva"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="tournaments">Torneos</TabsTrigger>
          <TabsTrigger value="teams">Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo de Categoría</p>
                  <p>{typeConfig?.label}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <p>{category.isActive ? "Activa" : "Inactiva"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechas</p>
                  <div className="space-y-1 text-sm">
                    <div>Creada: {category.createdAt ? format(new Date(category.createdAt), "dd/MM/yyyy", { locale: es }) : "No disponible"}</div>
                    <div>Actualizada: {category.updatedAt ? format(new Date(category.updatedAt), "dd/MM/yyyy", { locale: es }) : "No disponible"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Restricciones */}
            <Card>
              <CardHeader>
                <CardTitle>Restricciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Edad */}
                {(category.type === "AGE" || category.type === "MIXED") && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Edad</p>
                    <p>
                      {category.minAge !== null && category.maxAge !== null
                        ? `${category.minAge} - ${category.maxAge} años`
                        : category.minAge !== null
                        ? `Mínimo ${category.minAge} años`
                        : category.maxAge !== null
                        ? `Máximo ${category.maxAge} años`
                        : "Sin restricción de edad"
                      }
                    </p>
                  </div>
                )}

                {/* Género */}
                {(category.type === "GENDER" || category.type === "MIXED") && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Género</p>
                    <p>{genderConfig?.label || "Sin restricción"}</p>
                  </div>
                )}

                {/* Ranking */}
                {(category.type === "RANKING" || category.type === "SKILL" || category.type === "MIXED") && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Puntos de Ranking</p>
                    <p>
                      {category.minRankingPoints !== null && category.maxRankingPoints !== null
                        ? `${category.minRankingPoints} - ${category.maxRankingPoints} puntos`
                        : category.minRankingPoints !== null
                        ? `Mínimo ${category.minRankingPoints} puntos`
                        : category.maxRankingPoints !== null
                        ? `Máximo ${category.maxRankingPoints} puntos`
                        : "Sin restricción de ranking"
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>Torneos que Usan esta Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {category.tournamentCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Esta categoría no se ha usado en ningún torneo aún
                </p>
              ) : (
                <div className="space-y-4">
                  {category.tournamentCategories.map((tournamentCategory) => (
                    <div key={tournamentCategory.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/tournaments/${tournamentCategory.tournament.id}`}
                            className="font-medium hover:underline"
                          >
                            {tournamentCategory.tournament.name}
                          </Link>
                          {getStatusBadge(tournamentCategory.tournament.status)}
                        </div>
                        <Badge variant="outline">
                          {tournamentCategory.teams.length} equipos
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Fechas: {format(new Date(tournamentCategory.tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
                          {tournamentCategory.tournament.tournamentEnd && (
                            ` - ${format(new Date(tournamentCategory.tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`
                          )}
                        </div>
                        {tournamentCategory.maxTeams && (
                          <div>Máximo equipos: {tournamentCategory.maxTeams}</div>
                        )}
                        {tournamentCategory.registrationFee && (
                          <div>Tarifa de inscripción: ${tournamentCategory.registrationFee}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Equipos en esta Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {totalTeams === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay equipos inscritos en esta categoría aún
                </p>
              ) : (
                <div className="space-y-6">
                  {category.tournamentCategories.map((tournamentCategory) => {
                    if (tournamentCategory.teams.length === 0) return null

                    return (
                      <div key={tournamentCategory.id}>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Link
                            href={`/dashboard/tournaments/${tournamentCategory.tournament.id}`}
                            className="hover:underline"
                          >
                            {tournamentCategory.tournament.name}
                          </Link>
                          {getStatusBadge(tournamentCategory.tournament.status)}
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {tournamentCategory.teams.map((team) => (
                            <div key={team.id} className="border rounded-lg p-3">
                              <p className="font-medium">
                                {team.name || `${team.player1.firstName} ${team.player1.lastName} / ${team.player2.firstName} ${team.player2.lastName}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {team.player1.firstName} {team.player1.lastName} - {team.player2.firstName} {team.player2.lastName}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
            <AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la categoría "{category.name}". La categoría no será eliminada pero no aparecerá en las listas activas.
              {category._count.tournamentCategories > 0 && (
                <span className="block mt-2 text-red-600">
                  No se puede desactivar esta categoría porque está siendo usada en {category._count.tournamentCategories} torneo(s) activos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || category._count.tournamentCategories > 0}
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