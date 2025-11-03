"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  tournamentFormSchema,
  TournamentFormData,
  tournamentTypeOptions,
  tournamentVisibilityOptions
} from "@/lib/validations/tournament"
import { CategoryOption, ClubOption } from "@/types/tournament"
import {
  calculateMaxRoundsWithoutRepetition,
  getRoundsRecommendationMessage
} from "@/lib/utils/americano-rounds"

const genderFilterOptions = [
  { value: "all", label: "Todas las categorías" },
  { value: "NONE", label: "Sin restricción de género" },
  { value: "MALE", label: "Masculino (+ mixtas)" },
  { value: "FEMALE", label: "Femenino (+ mixtas)" },
]

interface TournamentFormProps {
  initialData?: Partial<TournamentFormData>
  tournamentId?: string
  initialSelectedCategories?: string[]
  initialSelectedClubs?: string[]
}

export function TournamentForm({
  initialData,
  tournamentId,
  initialSelectedCategories = [],
  initialSelectedClubs = []
}: TournamentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories)
  const [selectedClubs, setSelectedClubs] = useState<string[]>(initialSelectedClubs)
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const previousMainClubIdRef = useRef<string | null>(initialData?.mainClubId || null)

  const defaultValues = useMemo(() => {
    const now = new Date()
    return {
      name: "",
      description: "",
      type: "SINGLE_ELIMINATION",
      visibility: "PUBLIC",
      registrationStart: now,
      registrationEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      tournamentStart: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      tournamentEnd: undefined,
      maxParticipants: undefined,
      minParticipants: undefined,
      registrationFee: 0,
      prizePool: 0,
      rankingPoints: 1000,
      setsToWin: 2,
      gamesToWinSet: 6,
      tiebreakAt: 6,
      goldenPoint: true,
      americanoRounds: 1,
      mainClubId: "",
      rules: "",
      prizesDescription: "",
      logoUrl: "",
    }
  }, [])

  const form = useForm({
    resolver: zodResolver(tournamentFormSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    fetchCategories()
    fetchClubs()
  }, [])

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      // Reset form with initial data, ensuring dates are properly converted
      const formData = {
        ...defaultValues,
        ...initialData,
        // Ensure all date fields are Date objects
        registrationStart: initialData.registrationStart instanceof Date
          ? initialData.registrationStart
          : new Date(initialData.registrationStart || defaultValues.registrationStart),
        registrationEnd: initialData.registrationEnd instanceof Date
          ? initialData.registrationEnd
          : new Date(initialData.registrationEnd || defaultValues.registrationEnd),
        tournamentStart: initialData.tournamentStart instanceof Date
          ? initialData.tournamentStart
          : new Date(initialData.tournamentStart || defaultValues.tournamentStart),
        tournamentEnd: initialData.tournamentEnd
          ? (initialData.tournamentEnd instanceof Date
              ? initialData.tournamentEnd
              : new Date(initialData.tournamentEnd))
          : undefined
      }

      form.reset(formData as any)
    }
  }, [initialData, form, defaultValues])

  // Auto-seleccionar el club principal en la lista de clubes participantes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "mainClubId") {
        const newMainClubId = value.mainClubId
        const previousMainClubId = previousMainClubIdRef.current

        setSelectedClubs(prev => {
          let newSelectedClubs = [...prev]

          // Remover el club principal anterior si existe y es diferente al nuevo
          if (previousMainClubId && previousMainClubId !== newMainClubId) {
            newSelectedClubs = newSelectedClubs.filter(id => id !== previousMainClubId)
          }

          // Agregar el nuevo club principal si no está en la lista
          if (newMainClubId && !newSelectedClubs.includes(newMainClubId)) {
            newSelectedClubs = [...newSelectedClubs, newMainClubId]
          }

          return newSelectedClubs
        })

        // Actualizar la referencia del club principal anterior
        previousMainClubIdRef.current = newMainClubId ?? null
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?limit=1000&isActive=true")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/clubs?status=ACTIVE")
      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs)
      }
    } catch (error) {
      console.error("Error fetching clubs:", error)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)

      // Asegurar que el club principal esté incluido en la lista de clubes
      const allClubs = [...new Set([...selectedClubs, data.mainClubId].filter(Boolean))]

      const payload = {
        ...data,
        registrationStart: data.registrationStart.toISOString(),
        registrationEnd: data.registrationEnd.toISOString(),
        tournamentStart: data.tournamentStart.toISOString(),
        tournamentEnd: data.tournamentEnd?.toISOString(),
        categories: selectedCategories.map(categoryId => ({ categoryId })),
        clubs: allClubs,
      }

      const url = tournamentId ? `/api/tournaments/${tournamentId}` : "/api/tournaments"
      const method = tournamentId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Server error response:', error)
        if (error.details) {
          console.error('Validation details:', error.details)
          // Formatear errores de validación específicos
          const validationErrors = error.details.map((issue: any) => {
            const fieldPath = issue.path.join('.')
            return `${fieldPath}: ${issue.message}`
          }).join(', ')
          throw new Error(`${error.error}: ${validationErrors}`)
        }
        throw new Error(error.error || "Error al guardar torneo")
      }

      const tournament = await response.json()

      toast({
        title: "✅ Éxito",
        description: tournamentId ? "Torneo actualizado correctamente" : "Torneo creado correctamente",
        variant: "success",
      })

      // Redirigir a la página específica según el tipo de torneo
      if (tournament.type === "AMERICANO_SOCIAL") {
        router.push(`/dashboard/tournaments/${tournament.id}/americano-social`)
      } else {
        router.push(`/dashboard/tournaments/${tournament.id}`)
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar torneo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }, [])

  // Función para filtrar categorías por género
  const filteredCategories = useMemo(() => {
    if (genderFilter === "all") {
      return categories
    }

    return categories.filter(category => {
      if (genderFilter === "NONE") {
        return !category.genderRestriction || category.genderRestriction === null
      }

      // Las categorías MIXED aparecen en todos los filtros de género
      if (category.genderRestriction === "MIXED") {
        return true
      }

      return category.genderRestriction === genderFilter
    })
  }, [categories, genderFilter])

  const handleClubToggle = useCallback((clubId: string) => {
    const mainClubId = form.getValues("mainClubId")

    // No permitir desmarcar el club principal
    if (clubId === mainClubId) {
      return
    }

    setSelectedClubs(prev =>
      prev.includes(clubId)
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    )
  }, [form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Torneo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Torneo de Primavera 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción del torneo..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Torneo *</FormLabel>
                    <Select
                      key={`type-${field.value || 'empty'}`}
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tournamentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidad</FormLabel>
                    <Select
                      key={`visibility-${field.value || 'empty'}`}
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar visibilidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tournamentVisibilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="registrationStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Inicio Inscripciones *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fin Inscripciones *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("registrationStart")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tournamentStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Inicio Torneo *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("registrationEnd")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tournamentEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fin Torneo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha (opcional)</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("tournamentStart")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configuración */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mín. Participantes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="2"
                          placeholder="4"
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseInt(value)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. Participantes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={form.getValues("minParticipants")}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? undefined : parseInt(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa Inscripción ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? 0 : parseFloat(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Premio Total ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? 0 : parseFloat(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rankingPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puntos de Ranking</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="100"
                          max="5000"
                          step="50"
                          value={field.value || 1000}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? 1000 : parseInt(value))
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Puntos base del torneo (100-5000).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mainClubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Principal</FormLabel>
                    <Select
                      key={`mainClub-${field.value || 'empty'}`}
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar club" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name} - {club.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Reglas del Juego */}
          <Card>
            <CardHeader>
              <CardTitle>Reglas del Juego</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="setsToWin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sets a Ganar</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? undefined : parseInt(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gamesToWinSet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Games por Set</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="4"
                          max="10"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? undefined : parseInt(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiebreakAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiebreak en</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="4"
                          max="10"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === "" ? undefined : parseInt(value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="goldenPoint"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Punto de Oro</FormLabel>
                      <FormDescription>
                        Activar punto de oro en caso de empate 40-40
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Campo de rondas solo para AMERICANO_SOCIAL */}
              {form.watch("type") === "AMERICANO_SOCIAL" && (
                <FormField
                  control={form.control}
                  name="americanoRounds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Rondas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Cada ronda genera nuevos pools con rotación de jugadores.
                        {(() => {
                          const minParticipants = form.watch("minParticipants")
                          if (minParticipants && minParticipants >= 4) {
                            return (
                              <span className="block mt-1 text-blue-600 dark:text-blue-400 font-medium">
                                {getRoundsRecommendationMessage(minParticipants)}
                              </span>
                            )
                          }
                          return null
                        })()}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="rules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reglas Especiales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reglas específicas del torneo..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prizesDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción de Premios</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de los premios..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Flyer/Logo</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://ejemplo.com/imagen-torneo.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL de la imagen del flyer o logo del torneo (se mostrará en la página de detalles)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtro por género */}
            <div className="mb-4">
              <Label htmlFor="gender-filter" className="text-sm font-medium">
                Filtrar por restricción de género
              </Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Seleccionar filtro" />
                </SelectTrigger>
                <SelectContent>
                  {genderFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredCategories.length !== categories.length && (
              <div className="mb-3 text-sm text-muted-foreground">
                Mostrando {filteredCategories.length} de {categories.length} categorías
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No hay categorías que coincidan con el filtro seleccionado
                </div>
              ) : (
                filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                    selectedCategories.includes(category.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-muted-foreground">
                        {category.description}
                      </div>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clubes Participantes */}
        <Card>
          <CardHeader>
            <CardTitle>Clubes Participantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => {
                const mainClubId = form.getValues("mainClubId")
                const isMainClub = club.id === mainClubId
                const isSelected = selectedClubs.includes(club.id) || isMainClub

                return (
                  <div
                    key={club.id}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg border p-3 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                      isMainClub
                        ? "cursor-not-allowed opacity-75"
                        : "cursor-pointer"
                    )}
                    onClick={() => !isMainClub && handleClubToggle(club.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        disabled={isMainClub}
                        onCheckedChange={() => !isMainClub && handleClubToggle(club.id)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {club.name}
                        {isMainClub && (
                          <Badge variant="secondary" className="text-xs">
                            Club Principal
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {club.city} • {club._count.courts} canchas
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : tournamentId ? "Actualizar" : "Crear"} Torneo
          </Button>
        </div>
      </form>
    </Form>
  )
}