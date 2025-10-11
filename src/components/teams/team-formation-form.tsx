"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, AlertTriangle, Users, Trophy, Check, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getTournamentStatusStyle,
  getTournamentStatusLabel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel
} from "@/lib/utils/status-styles"
import { teamFormationSchema, TeamFormationData } from "@/lib/validations/team"

interface Tournament {
  id: string
  name: string
  type: string
  status: string
  tournamentStart: Date | null
  tournamentEnd: Date | null
  categories: Array<{
    id: string
    categoryId: string
    registrationFee: number | null
    maxTeams: number | null
    category: {
      id: string
      name: string
      type: string
    }
  }>
}

interface Registration {
  id: string
  tournamentId: string
  categoryId: string
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
    rankingPoints: number
  }
  teamAsPlayer1?: Array<{ id: string }>
  teamAsPlayer2?: Array<{ id: string }>
}

export function TeamFormationForm() {
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([])
  const [availablePartners, setAvailablePartners] = useState<Registration[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [availableCategories, setAvailableCategories] = useState<Tournament['categories']>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<TeamFormationData>({
    resolver: zodResolver(teamFormationSchema),
    defaultValues: {
      tournamentId: "",
      categoryId: "",
      registration1Id: "",
      registration2Id: "",
      teamName: "",
      notes: "",
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Cargar parejas disponibles cuando cambia la inscripción seleccionada
  useEffect(() => {
    const tournamentId = form.watch('tournamentId')
    const categoryId = form.watch('categoryId')
    const registration1Id = form.watch('registration1Id')

    if (tournamentId && categoryId && registration1Id) {
      loadAvailablePartners(tournamentId, categoryId, registration1Id)
    }
  }, [form.watch('tournamentId'), form.watch('categoryId'), form.watch('registration1Id')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generar nombre del equipo cuando se seleccionan ambos jugadores
  useEffect(() => {
    const registration1Id = form.watch('registration1Id')
    const registration2Id = form.watch('registration2Id')

    if (registration1Id && registration2Id) {
      const reg1 = myRegistrations.find(r => r.id === registration1Id)
      const reg2 = availablePartners.find(r => r.id === registration2Id)

      if (reg1 && reg2) {
        const autoName = `${reg1.player.firstName} ${reg1.player.lastName} / ${reg2.player.firstName} ${reg2.player.lastName}`
        form.setValue('teamName', autoName)
      }
    }
  }, [form.watch('registration1Id'), form.watch('registration2Id')]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setDataLoading(true)
    setError(null)

    try {
      // Obtener mis inscripciones (CONFIRMED o PAID) sin equipo
      const registrationsResponse = await fetch('/api/registrations?status=all&limit=100')

      if (!registrationsResponse.ok) {
        const errorData = await registrationsResponse.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `Error al cargar inscripciones: ${registrationsResponse.status}`)
      }

      const registrationsData = await registrationsResponse.json()
      console.log('Registrations data:', registrationsData)

      // Filtrar solo inscripciones CONFIRMED o PAID de torneos no AMERICANO_SOCIAL y sin equipo
      const validRegistrations = (registrationsData.registrations || []).filter((reg: Registration) => {
        const hasTeam = (reg.teamAsPlayer1 && reg.teamAsPlayer1.length > 0) ||
                        (reg.teamAsPlayer2 && reg.teamAsPlayer2.length > 0)
        return (
          reg.tournament.type !== 'AMERICANO_SOCIAL' &&
          (reg.registrationStatus === 'CONFIRMED' || reg.registrationStatus === 'PAID') &&
          !hasTeam
        )
      })

      setMyRegistrations(validRegistrations)

      // Obtener torneos únicos de mis inscripciones
      const uniqueTournaments = Array.from(
        new Map(
          validRegistrations.map((reg: Registration) => [
            reg.tournament.id,
            {
              id: reg.tournament.id,
              name: reg.tournament.name,
              type: reg.tournament.type,
              status: 'REGISTRATION_OPEN',
              tournamentStart: null,
              tournamentEnd: null,
              categories: []
            }
          ])
        ).values()
      ) as Tournament[]

      // Para cada torneo, obtener sus categorías
      const tournamentsWithCategories = await Promise.all(
        uniqueTournaments.map(async (tournament) => {
          try {
            const response = await fetch(`/api/tournaments/${tournament.id}`)
            if (response.ok) {
              const data = await response.json()
              return data
            }
            return tournament
          } catch {
            return tournament
          }
        })
      )

      setTournaments(tournamentsWithCategories)

    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar tus inscripciones")
      toast({
        title: "Error",
        description: "Error al cargar datos",
        variant: "destructive"
      })
    } finally {
      setDataLoading(false)
    }
  }

  const loadAvailablePartners = async (tournamentId: string, categoryId: string, myRegistrationId: string) => {
    try {
      // Obtener todas las inscripciones de la misma categoría
      const response = await fetch(
        `/api/registrations?tournamentId=${tournamentId}&categoryId=${categoryId}&status=all&limit=100`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `Error al cargar jugadores disponibles: ${response.status}`)
      }

      const data = await response.json()
      console.log('Available partners data:', data)

      // Filtrar jugadores disponibles:
      // - CONFIRMED o PAID
      // - No soy yo
      // - No tienen equipo aún (verificar si tienen teamAsPlayer1 o teamAsPlayer2)
      const available = (data.registrations || []).filter((reg: Registration & { teamAsPlayer1?: unknown[], teamAsPlayer2?: unknown[] }) => {
        const isNotMe = reg.id !== myRegistrationId
        const isConfirmedOrPaid = reg.registrationStatus === 'CONFIRMED' || reg.registrationStatus === 'PAID'
        const hasNoTeam = (!reg.teamAsPlayer1 || reg.teamAsPlayer1.length === 0) &&
                          (!reg.teamAsPlayer2 || reg.teamAsPlayer2.length === 0)

        console.log(`Player ${reg.player.firstName} ${reg.player.lastName}:`, {
          isNotMe,
          isConfirmedOrPaid,
          hasNoTeam,
          teamAsPlayer1: reg.teamAsPlayer1,
          teamAsPlayer2: reg.teamAsPlayer2
        })

        return isNotMe && isConfirmedOrPaid && hasNoTeam
      })

      console.log('Filtered available partners:', available)

      // Ordenar alfabéticamente por nombre y luego apellido
      const sorted = available.sort((a: Registration, b: Registration) => {
        const nameCompare = a.player.firstName.localeCompare(b.player.firstName)
        if (nameCompare !== 0) return nameCompare
        return a.player.lastName.localeCompare(b.player.lastName)
      })

      setAvailablePartners(sorted)

    } catch (error) {
      console.error("Error loading available partners:", error)
      setAvailablePartners([])
    }
  }

  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    setSelectedTournament(tournament || null)
    setAvailableCategories(tournament?.categories || [])

    form.setValue('categoryId', '')
    form.setValue('registration1Id', '')
    form.setValue('registration2Id', '')
    form.setValue('teamName', '')
    setAvailablePartners([])
  }

  const handleCategoryChange = (categoryId: string) => {
    form.setValue('categoryId', categoryId)
    form.setValue('registration1Id', '')
    form.setValue('registration2Id', '')
    form.setValue('teamName', '')
    setAvailablePartners([])
  }

  const getMyRegistrationsForCategory = () => {
    const tournamentId = form.watch('tournamentId')
    const categoryId = form.watch('categoryId')
    const registration2Id = form.watch('registration2Id')

    if (!tournamentId || !categoryId) return []

    // Filtrar mis inscripciones de esta categoría
    let filtered = myRegistrations.filter(
      reg => reg.tournamentId === tournamentId && reg.categoryId === categoryId
    )

    // Si ya seleccioné una pareja, excluir esa inscripción de mis opciones
    if (registration2Id) {
      const selectedPartner = availablePartners.find(p => p.id === registration2Id)
      if (selectedPartner) {
        // Excluir cualquier inscripción mía que sea del mismo jugador que mi pareja
        filtered = filtered.filter(reg => reg.player.id !== selectedPartner.player.id)
      }
    }

    // Ordenar alfabéticamente por nombre y luego apellido
    return filtered.sort((a, b) => {
      const nameCompare = a.player.firstName.localeCompare(b.player.firstName)
      if (nameCompare !== 0) return nameCompare
      return a.player.lastName.localeCompare(b.player.lastName)
    })
  }

  const onSubmit = async (data: TeamFormationData) => {
    try {
      setLoading(true)

      const apiData = {
        tournamentId: data.tournamentId,
        categoryId: data.categoryId,
        registration1Id: data.registration1Id,
        registration2Id: data.registration2Id,
        name: data.teamName, // El API espera 'name' no 'teamName'
        notes: data.notes,
      }

      const response = await fetch('/api/teams', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear el equipo")
      }

      const team = await response.json()
      toast({
        title: "Equipo creado",
        description: `Equipo "${team.name || 'Sin nombre'}" creado exitosamente`,
        variant: "success"
      })

      // Resetear el formulario para crear otro equipo
      form.reset({
        tournamentId: data.tournamentId,
        categoryId: data.categoryId,
        registration1Id: '',
        registration2Id: '',
        teamName: '',
        notes: ''
      })

      // Recargar datos para actualizar la lista de parejas disponibles
      fetchData()

    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el equipo",
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
            Cargando tus inscripciones...
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
                No se pudieron cargar tus inscripciones
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

  if (myRegistrations.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">No tienes inscripciones disponibles para formar equipos.</p>
            <p className="text-sm">
              Primero debes inscribirte individualmente en un torneo convencional y confirmar tu pago.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => router.push('/dashboard/registrations/new')}
            >
              Ir a inscribirme
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Para formar un equipo, ambos jugadores deben estar inscritos individualmente y haber confirmado su pago en la misma categoría.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Selección de Torneo y Categoría */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Selecciona el Torneo y Categoría
              </CardTitle>
              <CardDescription>
                Solo se muestran torneos convencionales donde tienes inscripciones confirmadas.
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

          {/* Selección de Jugadores */}
          {form.watch('categoryId') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Formar Equipo
                </CardTitle>
                <CardDescription>
                  Selecciona tu inscripción y la de tu pareja para formar el equipo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="registration1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tu Inscripción *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tu inscripción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getMyRegistrationsForCategory().length === 0 ? (
                            <SelectItem value="none" disabled>
                              No tienes inscripciones confirmadas en esta categoría
                            </SelectItem>
                          ) : (
                            getMyRegistrationsForCategory().map((registration) => (
                              <SelectItem key={registration.id} value={registration.id}>
                                {registration.player.firstName} {registration.player.lastName}
                                <Badge className={`ml-2 ${getRegistrationStatusStyle(registration.registrationStatus)}`}>
                                  {getRegistrationStatusLabel(registration.registrationStatus)}
                                </Badge>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('registration1Id') && (
                  <FormField
                    control={form.control}
                    name="registration2Id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pareja *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona a tu pareja" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availablePartners.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No hay jugadores disponibles en esta categoría
                              </SelectItem>
                            ) : (
                              availablePartners.map((registration) => (
                                <SelectItem key={registration.id} value={registration.id}>
                                  {registration.player.firstName} {registration.player.lastName}
                                  <Badge className={`ml-2 ${getRegistrationStatusStyle(registration.registrationStatus)}`}>
                                    {getRegistrationStatusLabel(registration.registrationStatus)}
                                  </Badge>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Solo se muestran jugadores inscritos y confirmados que aún no tienen equipo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('registration2Id') && (
                  <>
                    <FormField
                      control={form.control}
                      name="teamName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Equipo *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre personalizado para el equipo"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Se generó automáticamente pero puedes cambiarlo.
                          </FormDescription>
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
                              placeholder="Información adicional sobre el equipo"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botones de Acción */}
          {form.watch('registration2Id') && (
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Crear Equipo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/teams')}
              >
                Cancelar
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
