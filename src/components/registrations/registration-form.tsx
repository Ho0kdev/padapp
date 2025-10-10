"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, AlertTriangle, User, Trophy, Check, CreditCard, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getTournamentStatusStyle,
  getTournamentStatusLabel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel
} from "@/lib/utils/status-styles"
import { registrationFormSchema, RegistrationFormData } from "@/lib/validations/registration"

interface Tournament {
  id: string
  name: string
  type: string
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
      level: number | null
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
  primaryCategory?: {
    id: string
    name: string
    level: number | null
  } | null
}

interface Registration {
  id: string
  registrationStatus: string
  tournament: {
    id: string
    name: string
    type: string
  }
  category: {
    id: string
    name: string
  }
  player: {
    id: string
    firstName: string
    lastName: string
  }
  tournamentCategory?: {
    registrationFee: number | null
  }
}

interface RegistrationFormProps {
  isAdmin?: boolean
  currentPlayerId?: string | null
}

export function RegistrationForm({ isAdmin = false, currentPlayerId = null }: RegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [availableCategories, setAvailableCategories] = useState<Tournament['categories']>([])
  const [error, setError] = useState<string | null>(null)
  const [registeredPlayerIds, setRegisteredPlayerIds] = useState<Set<string>>(new Set())
  const [genderRestriction, setGenderRestriction] = useState<string | null>(null)
  const [categoryLevel, setCategoryLevel] = useState<number | null>(null)
  const [recentRegistration, setRecentRegistration] = useState<Registration | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      tournamentId: "",
      categoryId: "",
      playerId: "",
      notes: "",
      acceptTerms: false,
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Si es jugador (no admin), preseleccionar su jugador automáticamente
  useEffect(() => {
    if (!isAdmin && currentPlayerId && players.length > 0) {
      const currentPlayer = players.find(p => p.id === currentPlayerId)
      if (currentPlayer) {
        form.setValue('playerId', currentPlayerId)
      }
    }
  }, [isAdmin, currentPlayerId, players, form])

  // Verificar jugadores inscritos cuando cambian tournament o category
  useEffect(() => {
    const tournamentId = form.watch('tournamentId')
    const categoryId = form.watch('categoryId')

    if (tournamentId && categoryId) {
      checkRegisteredPlayers(tournamentId, categoryId)
    }
  }, [form.watch('tournamentId'), form.watch('categoryId')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar cambio de torneo
  const handleTournamentChange = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    setSelectedTournament(tournament || null)

    // Filtrar categorías según el jugador actual
    let categories = tournament?.categories || []

    if (!isAdmin && currentPlayerId) {
      const currentPlayer = players.find(p => p.id === currentPlayerId)
      if (currentPlayer) {
        // Obtener las categorías en las que el jugador ya está inscrito en este torneo
        const playerRegistrations = await fetch(`/api/registrations?tournamentId=${tournamentId}&playerId=${currentPlayerId}`)
        const registrationsData = await playerRegistrations.json()
        const registeredCategoryIds = new Set(
          registrationsData.registrations?.map((r: any) => r.categoryId) || []
        )

        categories = categories.filter(cat => {
          // Filtrar categorías en las que ya está inscrito
          if (registeredCategoryIds.has(cat.categoryId)) {
            return false
          }

          // Filtrar por restricción de género
          if (cat.category.genderRestriction) {
            if (cat.category.genderRestriction !== currentPlayer.gender) {
              return false
            }
          }

          // Filtrar por nivel (el jugador puede jugar en su categoría o categorías superiores)
          // Números más bajos = mejor nivel (categorías superiores)
          // Un jugador de 7ma (nivel 7) puede jugar en 7ma, 6ta, 5ta, 4ta, pero NO en 8va (nivel 8)
          if (cat.category.level !== null && currentPlayer.primaryCategory?.level !== null) {
            if (cat.category.level > currentPlayer.primaryCategory.level) {
              return false
            }
          }

          return true
        })
      }
    }

    setAvailableCategories(categories)

    // Resetear categoría cuando cambia el torneo
    form.setValue('categoryId', '')
    setRegisteredPlayerIds(new Set())
    setGenderRestriction(null)
    setCategoryLevel(null)
    setRecentRegistration(null)
  }

  // Verificar jugadores ya inscritos en la categoría
  const checkRegisteredPlayers = async (tournamentId: string, categoryId: string) => {
    if (!tournamentId || !categoryId) {
      setRegisteredPlayerIds(new Set())
      return
    }

    try {
      const url = `/api/registrations/check-players?tournamentId=${tournamentId}&categoryId=${categoryId}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        const playerIds = new Set<string>(data.playerIds || [])
        setRegisteredPlayerIds(playerIds)
        setGenderRestriction(data.genderRestriction || null)
        setCategoryLevel(data.categoryLevel || null)
      } else {
        setRegisteredPlayerIds(new Set())
        setGenderRestriction(null)
        setCategoryLevel(null)
      }
    } catch (error) {
      console.error("Error checking registered players:", error)
      setRegisteredPlayerIds(new Set())
    }
  }

  // Manejar cambio de categoría
  const handleCategoryChange = (categoryId: string) => {
    form.setValue('categoryId', categoryId)
    const tournamentId = form.getValues('tournamentId')
    if (tournamentId && categoryId) {
      checkRegisteredPlayers(tournamentId, categoryId)
    }
    setRecentRegistration(null)
  }

  // Filtrar jugadores disponibles según género, nivel y registrados
  const getAvailablePlayers = () => {
    return players.filter(player => {
      // Si no es admin, solo mostrar el jugador actual
      if (!isAdmin && currentPlayerId && player.id !== currentPlayerId) return false

      // No mostrar jugadores ya registrados
      if (registeredPlayerIds.has(player.id)) return false

      // Filtrar por restricción de género si existe
      if (genderRestriction) {
        if (genderRestriction === 'MALE' && player.gender !== 'MALE') return false
        if (genderRestriction === 'FEMALE' && player.gender !== 'FEMALE') return false
      }

      // Filtrar por nivel de categoría
      if (categoryLevel !== null && player.primaryCategory?.level !== null && player.primaryCategory?.level !== undefined) {
        if (player.primaryCategory.level < categoryLevel) return false
      }

      return true
    })
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
            primaryCategory?: {
              id: string
              name: string
              level: number | null
            } | null
          }
        }) => ({
          id: user.player.id,
          firstName: user.player.firstName,
          lastName: user.player.lastName,
          dateOfBirth: user.player.dateOfBirth ? new Date(user.player.dateOfBirth) : null,
          gender: user.player.gender,
          rankingPoints: user.player.rankingPoints || 0,
          primaryCategory: user.player.primaryCategory || null,
        }))
        .sort((a, b) => {
          // Ordenar por apellido primero, luego por nombre
          const lastNameCompare = a.lastName.localeCompare(b.lastName)
          if (lastNameCompare !== 0) return lastNameCompare
          return a.firstName.localeCompare(b.firstName)
        }) || []

      setPlayers(playersFromUsers)

    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar la información necesaria para crear la inscripción")
      toast({
        title: "Error",
        description: "Error al cargar datos",
        variant: "destructive"
      })
    } finally {
      setDataLoading(false)
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setLoading(true)

      const apiData = {
        tournamentId: data.tournamentId,
        categoryId: data.categoryId,
        playerId: data.playerId,
        notes: data.notes,
        acceptTerms: data.acceptTerms,
      }

      const response = await fetch('/api/registrations', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar la inscripción")
      }

      const registration = await response.json()
      setRecentRegistration(registration)
      toast({
        title: "Inscripción creada",
        description: "Inscripción creada exitosamente",
        variant: "success"
      })

      // Resetear el formulario completamente
      form.reset({
        tournamentId: "",
        categoryId: "",
        playerId: "",
        notes: "",
        acceptTerms: false,
      })

      // Limpiar estado
      setSelectedTournament(null)
      setAvailableCategories([])
      setRegisteredPlayerIds(new Set())
      setGenderRestriction(null)
      setCategoryLevel(null)

    } catch (error) {
      console.error("Error processing registration:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la inscripción",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
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

  if (error) {
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

  if (tournaments.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay torneos con inscripciones abiertas en este momento.
        </AlertDescription>
      </Alert>
    )
  }

  if (players.length === 0) {
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
      {/* Success Banner */}
      {recentRegistration && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-2">
              <p className="font-medium">
                ¡Inscripción creada exitosamente para {recentRegistration.player.firstName} {recentRegistration.player.lastName}!
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Badge className={getRegistrationStatusStyle(recentRegistration.registrationStatus)}>
                  {getRegistrationStatusLabel(recentRegistration.registrationStatus)}
                </Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => router.push(`/dashboard/registrations/${recentRegistration.id}`)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Ir a pagar
                </Button>
                {selectedTournament?.type !== 'AMERICANO_SOCIAL' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => router.push('/dashboard/teams/new')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Formar equipo
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Selección de Torneo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Selección de Torneo y Categoría
              </CardTitle>
              <CardDescription>
                Nuevo flujo de inscripción: Cada jugador se inscribe individualmente. Para torneos convencionales, después podrás formar equipo.
              </CardDescription>
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
                      value={field.value}
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
                      <p>
                        <strong>Tipo:</strong>{" "}
                        {selectedTournament.type === "SINGLE_ELIMINATION" && "Eliminación Directa"}
                        {selectedTournament.type === "DOUBLE_ELIMINATION" && "Doble Eliminación"}
                        {selectedTournament.type === "ROUND_ROBIN" && "Todos contra Todos"}
                        {selectedTournament.type === "SWISS" && "Sistema Suizo"}
                        {selectedTournament.type === "GROUP_STAGE_ELIMINATION" && "Grupos + Eliminación"}
                        {selectedTournament.type === "AMERICANO" && "Americano"}
                        {selectedTournament.type === "AMERICANO_SOCIAL" && "Americano Social"}
                      </p>

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
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        handleCategoryChange(value)
                      }} value={field.value}>
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

          {/* Formulario de Inscripción Individual */}
          {selectedTournament && form.watch('categoryId') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Inscripción Individual
                </CardTitle>
                <CardDescription>
                  {selectedTournament.type === 'AMERICANO_SOCIAL'
                    ? 'En Americano Social, cada jugador juega individualmente. Los pools se armarán automáticamente.'
                    : 'Después de inscribirse, podrás formar equipo con otro jugador inscrito en la misma categoría.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="playerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jugador *</FormLabel>
                      {!isAdmin && currentPlayerId ? (
                        // Si es jugador, mostrar solo como texto (ya está preseleccionado)
                        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {getAvailablePlayers()[0]?.firstName} {getAvailablePlayers()[0]?.lastName}
                            {getAvailablePlayers()[0] && (
                              <span className="ml-2 text-muted-foreground text-sm">
                                ({getAvailablePlayers()[0].rankingPoints} pts)
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        // Si es admin, mostrar el select normal
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el jugador a inscribir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailablePlayers().length === 0 ? (
                              <SelectItem value="none" disabled>
                                No hay jugadores disponibles para esta categoría
                              </SelectItem>
                            ) : (
                              getAvailablePlayers().map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.firstName} {player.lastName}
                                  <span className="ml-2 text-muted-foreground">
                                    ({player.rankingPoints} pts)
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
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
          )}

          {/* Términos y Condiciones */}
          {selectedTournament && form.watch('categoryId') && (
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
          {selectedTournament && form.watch('categoryId') && (
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Crear Inscripción
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/registrations')}
              >
                Volver
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
