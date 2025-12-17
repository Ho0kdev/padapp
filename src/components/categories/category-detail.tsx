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
  Calendar,
  Edit,
  MoreHorizontal,
  Trophy,
  Users,
  Tag,
  Trash2,
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
  level: number | null
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
      registration1: {
        player: {
          firstName: string
          lastName: string
        }
      }
      registration2: {
        player: {
          firstName: string
          lastName: string
        }
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
        title: "✅ Éxito",
        description: "Categoría desactivada correctamente",
        variant: "success",
      })

      router.push("/dashboard/categories")
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al desactivar categoría",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
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
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Categorías", href: "/dashboard/categories" },
          { label: category.name }
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-start sm:items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{category.name}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={category.isActive ? "default" : "secondary"}>
                {category.isActive ? "Activa" : "Inactiva"}
              </Badge>
              <Badge variant="outline" className={getCategoryTypeStyle(category.type)}>
                {typeConfig?.label}
              </Badge>
            </div>
          </div>
          {category.description && (
            <p className="text-muted-foreground max-w-3xl">{category.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/dashboard/categories/${category.id}/edit`}>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            </Link>
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

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="tournaments">Torneos ({category._count.tournamentCategories})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Tipo de Categoría</span>
                  <span className="font-medium">{typeConfig?.label}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Estado</span>
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Estadísticas</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      {category._count.tournamentCategories} torneos
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {totalTeams} equipos totales
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      {activeTournaments} torneos activos
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Fechas</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Creada: {category.createdAt ? format(new Date(category.createdAt), "dd/MM/yyyy", { locale: es }) : "No disponible"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Actualizada: {category.updatedAt ? format(new Date(category.updatedAt), "dd/MM/yyyy", { locale: es }) : "No disponible"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Restricciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Restricciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Edad */}
                {(category.minAge !== null || category.maxAge !== null) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Edad</p>
                    <p>
                      {category.minAge !== null && category.maxAge !== null
                        ? `${category.minAge} - ${category.maxAge} años`
                        : category.minAge !== null
                        ? `Mínimo ${category.minAge} años`
                        : `Máximo ${category.maxAge} años`
                      }
                    </p>
                  </div>
                )}

                {/* Género */}
                {category.genderRestriction && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Género</p>
                    <p>{genderConfig?.label}</p>
                  </div>
                )}

                {/* Ranking */}
                {(category.minRankingPoints !== null || category.maxRankingPoints !== null) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Puntos de Ranking</p>
                    <p>
                      {category.minRankingPoints !== null && category.maxRankingPoints !== null
                        ? `${category.minRankingPoints} - ${category.maxRankingPoints} puntos`
                        : category.minRankingPoints !== null
                        ? `Mínimo ${category.minRankingPoints} puntos`
                        : `Máximo ${category.maxRankingPoints} puntos`
                      }
                    </p>
                  </div>
                )}

                {/* Nivel (para SKILL) */}
                {category.level && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nivel de Habilidad</p>
                    <p>Nivel {category.level}</p>
                  </div>
                )}

                {/* Mensaje si no hay restricciones */}
                {!category.genderRestriction &&
                 category.minAge === null &&
                 category.maxAge === null &&
                 category.minRankingPoints === null &&
                 category.maxRankingPoints === null &&
                 !category.level && (
                  <p className="text-sm text-muted-foreground">Esta categoría no tiene restricciones específicas</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Torneos que Usan esta Categoría
              </CardTitle>
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
                      <div className="flex items-start sm:items-center justify-between gap-3 mb-3">
                        <Link
                          href={`/dashboard/tournaments/${tournamentCategory.tournament.id}`}
                          className="font-medium hover:underline text-base break-words flex-1"
                        >
                          {tournamentCategory.tournament.name}
                        </Link>
                        {getStatusBadge(tournamentCategory.tournament.status)}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Fechas: {format(new Date(tournamentCategory.tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
                          {tournamentCategory.tournament.tournamentEnd && (
                            ` - ${format(new Date(tournamentCategory.tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`
                          )}
                        </div>
                        <div>Equipos inscritos: {tournamentCategory.teams.length}</div>
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