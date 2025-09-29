"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, AlertTriangle, Users, Trophy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getTournamentStatusStyle, getTournamentStatusLabel } from "@/lib/utils/status-styles"
import { z } from "zod"

const registrationFormSchema = z.object({
  tournamentId: z.string().min(1, "Debe seleccionar un torneo"),
  categoryId: z.string().min(1, "Debe seleccionar una categoría"),
  player1Id: z.string().min(1, "Debe seleccionar el jugador 1"),
  player2Id: z.string().min(1, "Debe seleccionar el jugador 2"),
  teamName: z.string().max(100, "El nombre no puede tener más de 100 caracteres").optional(),
  notes: z.string().max(500, "Las notas no pueden tener más de 500 caracteres").optional(),
  acceptTerms: z.boolean().refine(val => val === true, "Debe aceptar los términos y condiciones")
}).refine((data) => {
  return data.player1Id !== data.player2Id
}, {
  message: "Los jugadores deben ser diferentes",
  path: ["player2Id"]
})

type RegistrationFormData = z.infer<typeof registrationFormSchema>

interface Tournament {
  id: string
  name: string
  status: string
  tournamentStart: Date | null
  tournamentEnd: Date | null
  registrationStart: Date | null
  registrationEnd: Date | null
  categories: Array<{
    id: string
    categoryId: string
    registrationFee: number | null
    maxTeams: number | null
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
  }>
}

interface Player {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: string | null
  rankingPoints: number
}

interface RegistrationFormProps {
  initialData?: Partial<RegistrationFormData>
  registrationId?: string
}

export function RegistrationForm({ initialData, registrationId }: RegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [availableCategories, setAvailableCategories] = useState<Tournament['categories']>([])
  const [error, setError] = useState<string | null>(null)
  const { error: toastError, success: toastSuccess } = useToast()
  const router = useRouter()

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      tournamentId: initialData?.tournamentId || "",
      categoryId: initialData?.categoryId || "",
      player1Id: initialData?.player1Id || "",
      player2Id: initialData?.player2Id || "",
      teamName: initialData?.teamName || "",
      notes: initialData?.notes || "",
      acceptTerms: initialData?.acceptTerms || false,
    }
  })

  useEffect(() => {
    if (!registrationId) {
      fetchData()
    }
  }, [registrationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar cambio de torneo
  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    setSelectedTournament(tournament || null)
    setAvailableCategories(tournament?.categories || [])

    // Resetear categoría cuando cambia el torneo
    form.setValue('categoryId', '')
  }

  const fetchData = async () => {
    setDataLoading(true)
    setError(null)

    try {
      const [tournamentsResponse, playersResponse] = await Promise.all([
        fetch('/api/tournaments?status=REGISTRATION_OPEN&limit=100'),
        fetch('/api/users?role=PLAYER&status=ACTIVE&limit=1000')
      ])

      if (!tournamentsResponse.ok || !playersResponse.ok) {
        throw new Error("Error al cargar datos")
      }

      const [tournamentsData, playersData] = await Promise.all([
        tournamentsResponse.json(),
        playersResponse.json()
      ])

      setTournaments(tournamentsData.tournaments || [])

      // Extraer jugadores de los usuarios
      const playersFromUsers = playersData.users
        ?.filter((user: { player?: unknown }) => user.player)
        ?.map((user: {
          player: {
            id: string
            firstName: string
            lastName: string
            dateOfBirth?: string | null
            gender?: string | null
            rankingPoints?: number
          }
        }) => ({
          id: user.player.id,
          firstName: user.player.firstName,
          lastName: user.player.lastName,
          dateOfBirth: user.player.dateOfBirth ? new Date(user.player.dateOfBirth) : null,
          gender: user.player.gender,
          rankingPoints: user.player.rankingPoints || 0,
        })) || []

      setPlayers(playersFromUsers)

    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar la información necesaria para crear la inscripción")
      toastError("Error al cargar datos")
    } finally {
      setDataLoading(false)
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setLoading(true)

      // Generar nombre del equipo automáticamente si no se proporciona
      let teamName = data.teamName
      if (!teamName || teamName.trim() === '') {
        const player1 = players.find(p => p.id === data.player1Id)
        const player2 = players.find(p => p.id === data.player2Id)

        if (player1 && player2) {
          teamName = `${player1.firstName} ${player1.lastName}/${player2.firstName} ${player2.lastName}`
        } else {
          teamName = "Equipo sin nombre"
        }
      }

      // Transformar los datos para que coincidan con el esquema de la API
      const apiData = {
        tournamentId: data.tournamentId,
        categoryId: data.categoryId,
        player1Id: data.player1Id,
        player2Id: data.player2Id,
        teamName: teamName,
        notes: data.notes,
        acceptTerms: data.acceptTerms,
        acceptPrivacyPolicy: true
      }

      const url = registrationId
        ? `/api/registrations/${registrationId}`
        : `/api/registrations`
      const method = registrationId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Si hay detalles de validación de Zod, mostrar el mensaje específico
        if (errorData.details && Array.isArray(errorData.details)) {
          const specificErrors = errorData.details
            .map((detail: { message: string }) => detail.message)
            .join(', ')
          throw new Error(specificErrors)
        }

        throw new Error(errorData.error || "Error al procesar la inscripción")
      }

      const registration = await response.json()
      toastSuccess(registrationId ? "Inscripción actualizada correctamente" : "Inscripción creada exitosamente")

      // Redirigir a la página de detalle
      router.push(`/dashboard/registrations/${registration.id}`)
    } catch (error) {
      console.error("Error processing registration:", error)
      toastError(error instanceof Error ? error.message : "Error al procesar la inscripción")
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading && !registrationId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando información...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !registrationId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                No se pudieron cargar los datos necesarios
              </div>
              <button
                onClick={fetchData}
                className="text-primary underline"
              >
                Intentar nuevamente
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!registrationId && tournaments.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay torneos con inscripciones abiertas en este momento.
        </AlertDescription>
      </Alert>
    )
  }

  if (!registrationId && players.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay jugadores disponibles para inscribir. Primero debe crear usuarios con perfil de jugador.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Selección de Torneo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Selección de Torneo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tournamentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Torneo *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        handleTournamentChange(value)
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un torneo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tournaments.map((tournament) => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Información del Torneo Seleccionado */}
              {selectedTournament && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">{selectedTournament.name}</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <strong>Estado:</strong>
                      <Badge className={getTournamentStatusStyle(selectedTournament.status)}>
                        {getTournamentStatusLabel(selectedTournament.status)}
                      </Badge>
                    </div>

                    <div className="text-muted-foreground space-y-1">
                      {/* Fechas del Torneo */}
                      {selectedTournament.tournamentStart && (
                        <p><strong>Fecha de inicio:</strong> {new Date(selectedTournament.tournamentStart).toLocaleDateString()}</p>
                      )}
                      {selectedTournament.tournamentEnd && (
                        <p><strong>Fecha de fin:</strong> {new Date(selectedTournament.tournamentEnd).toLocaleDateString()}</p>
                      )}

                      {/* Fechas de Inscripción */}
                      {selectedTournament.registrationStart && (
                        <p><strong>Inscripciones desde:</strong> {new Date(selectedTournament.registrationStart).toLocaleDateString()}</p>
                      )}
                      {selectedTournament.registrationEnd && (
                        <p><strong>Inscripciones hasta:</strong> {new Date(selectedTournament.registrationEnd).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Selección de Categoría */}
              {availableCategories.length > 0 && (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category.id} value={category.categoryId}>
                              {category.category.name}
                              {category.registrationFee && (
                                <span className="ml-2 text-muted-foreground">
                                  (${category.registrationFee})
                                </span>
                              )}
                              {category.maxTeams && (
                                <span className="ml-2 text-muted-foreground">
                                  (Máx: {category.maxTeams} equipos)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Información del Equipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Información del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 1 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona jugador 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.firstName} {player.lastName}
                              <span className="ml-2 text-muted-foreground">
                                ({player.rankingPoints} pts)
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="player2Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador 2 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona jugador 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.firstName} {player.lastName}
                              <span className="ml-2 text-muted-foreground">
                                ({player.rankingPoints} pts)
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Equipo (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre personalizado para el equipo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional sobre la inscripción"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Términos y Condiciones */}
          {!registrationId && (
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Acepto los términos y condiciones del torneo *
                        </FormLabel>
                        <FormDescription>
                          Al marcar esta casilla confirmas que aceptas las reglas y condiciones del torneo seleccionado.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {registrationId ? "Actualizar Inscripción" : "Crear Inscripción"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}