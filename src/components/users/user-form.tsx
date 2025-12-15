'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2, Eye, EyeOff, User, Shield, UserCheck, Phone, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

const userFormSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  password: z.string().optional().refine((val) => !val || val.length >= 6, {
    message: 'La contraseña debe tener al menos 6 caracteres'
  }),
  role: z.enum(['ADMIN', 'CLUB_ADMIN', 'PLAYER', 'REFEREE']).default('PLAYER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  createPlayer: z.boolean().default(true),
  // Player fields
  phone: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato debe ser DD/MM/YYYY').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
  dominantHand: z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS']).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodType: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional().or(z.literal('')),
  medicalNotes: z.string().optional(),
  rankingPoints: z.number().min(0).default(0),
  categoryId: z.string().optional(),
  profileImageUrl: z.string().optional()
}).refine((data) => {
  // If creating a player, category is required
  if (data.createPlayer) {
    return data.categoryId && data.categoryId.length > 0
  }
  return true
}, {
  message: 'Debe seleccionar una categoría para el jugador',
  path: ['categoryId']
})

type UserFormValues = z.infer<typeof userFormSchema>

interface Category {
  id: string
  name: string
  description?: string
  type: string
  minAge?: number
  maxAge?: number
  genderRestriction?: 'MALE' | 'FEMALE' | 'MIXED'
  minRankingPoints?: number
  maxRankingPoints?: number
}

interface UserFormProps {
  initialData?: Partial<UserFormValues>
  userId?: string
  currentUserRole?: string
  isOwnProfile?: boolean
}

export function UserForm({ initialData, userId, currentUserRole, isOwnProfile }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const isEditing = !!userId
  const isAdmin = currentUserRole === 'ADMIN'
  const canEditSensitiveFields = isAdmin

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      email: initialData?.email || '',
      password: initialData?.password || '',
      role: initialData?.role || 'PLAYER',
      status: initialData?.status || 'ACTIVE',
      createPlayer: initialData?.createPlayer ?? true,
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      phone: initialData?.phone || '',
      dateOfBirth: initialData?.dateOfBirth || '',
      gender: initialData?.gender,
      dominantHand: initialData?.dominantHand,
      emergencyContactName: initialData?.emergencyContactName || '',
      emergencyContactPhone: initialData?.emergencyContactPhone || '',
      bloodType: initialData?.bloodType,
      medicalNotes: initialData?.medicalNotes || '',
      rankingPoints: initialData?.rankingPoints || 0,
      categoryId: initialData?.categoryId,
      profileImageUrl: initialData?.profileImageUrl || ''
    }
  })

  const createPlayer = form.watch('createPlayer')
  const selectedRole = form.watch('role')
  const selectedGender = form.watch('gender')

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!createPlayer) return

      try {
        setLoadingCategories(true)
        const response = await fetch('/api/categories?isActive=true&limit=100')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || data)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [createPlayer])

  // Filter categories based on selected gender
  const filteredCategories = categories.filter(category => {
    if (!selectedGender) return false // Don't show categories if no gender selected

    // Show mixed categories for all genders
    if (category.genderRestriction === 'MIXED') return true

    // Show gender-specific categories only for matching gender
    return category.genderRestriction === selectedGender
  })

  // Auto-enable create player for PLAYER role
  const handleRoleChange = (role: string) => {
    form.setValue('role', role as any)
    if (role === 'PLAYER') {
      form.setValue('createPlayer', true)
    }
  }

  // Handle create player toggle
  const handleCreatePlayerChange = (checked: boolean) => {
    form.setValue('createPlayer', checked)

    // If disabling player creation, clear player fields
    if (!checked) {
      form.setValue('phone', '')
      form.setValue('dateOfBirth', '')
      form.setValue('gender', undefined)
      form.setValue('dominantHand', undefined)
      form.setValue('rankingPoints', 0)
      form.setValue('categoryId', undefined)
      form.setValue('profileImageUrl', '')
      form.setValue('emergencyContactName', '')
      form.setValue('emergencyContactPhone', '')
      form.setValue('bloodType', undefined)
      form.setValue('medicalNotes', '')
    }
  }

  // Handle gender change - clear category selection when gender changes
  const handleGenderChange = (gender: string) => {
    form.setValue('gender', gender as any)
    // Clear category selection since available categories will change
    form.setValue('categoryId', undefined)
  }

  const onSubmit = async (values: UserFormValues) => {
    try {
      setLoading(true)

      let submissionData = { ...values }

      // Convert date format from DD/MM/YYYY to ISO string if provided
      if (submissionData.dateOfBirth && submissionData.dateOfBirth.trim()) {
        const [day, month, year] = submissionData.dateOfBirth.split('/')
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        submissionData.dateOfBirth = dateObj.toISOString()
      } else {
        submissionData.dateOfBirth = undefined
      }

      // For editing, don't send password if empty
      if (isEditing && !submissionData.password) {
        delete submissionData.password
      }

      // Clean up empty bloodType
      if (submissionData.bloodType === '') {
        submissionData.bloodType = undefined
      }

      const url = isEditing ? `/api/users/${userId}` : '/api/users'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Error al ${isEditing ? 'actualizar' : 'crear'} usuario`)
      }

      toast({
        title: isEditing ? "✅ Usuario actualizado" : "✅ Usuario creado",
        description: `El usuario ha sido ${isEditing ? "actualizado" : "creado"} exitosamente.`,
        variant: "success",
      })

      if (isEditing) {
        router.push(`/dashboard/users/${userId}`)
      } else {
        router.push('/dashboard/users')
      }
      router.refresh()
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} user:`, error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : `Error al ${isEditing ? 'actualizar' : 'crear'} usuario`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información básica de usuario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="usuario@ejemplo.com" />
                      </FormControl>
                      <FormDescription>
                        Este será el email de inicio de sesión
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Contraseña {!isEditing && '*'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder={
                              isEditing
                                ? "Dejar vacío para no cambiar contraseña"
                                : "Dejar vacío para contraseña automática"
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {isEditing
                          ? "Dejar vacío para mantener la contraseña actual"
                          : "Si no se especifica, se generará una contraseña automática"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Juan"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Pérez"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol *</FormLabel>
                      <Select onValueChange={handleRoleChange} defaultValue={field.value} disabled={!canEditSensitiveFields}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLAYER">Jugador</SelectItem>
                          <SelectItem value="CLUB_ADMIN">Administrador de Club</SelectItem>
                          <SelectItem value="REFEREE">Árbitro</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      {!canEditSensitiveFields && (
                        <FormDescription className="text-amber-600">
                          Solo administradores pueden modificar el rol
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="createPlayer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={handleCreatePlayerChange}
                          disabled={!canEditSensitiveFields}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Es jugador
                        </FormLabel>
                        <FormDescription>
                          {!canEditSensitiveFields ?
                            "Solo administradores pueden modificar este campo." :
                            "Solo Usuarios ACTIVOS pueden ser jugadores"
                          }
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          {/* Información del jugador */}
          {createPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Información del Jugador
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+54 9 11 1234-5678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de nacimiento</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                          />
                        </FormControl>
                        <FormDescription>
                          Formato: DD/MM/YYYY (ej: 15/03/1990)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Género *</FormLabel>
                        <Select onValueChange={handleGenderChange} defaultValue={field.value} disabled={!canEditSensitiveFields}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona género" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MALE">Masculino</SelectItem>
                            <SelectItem value="FEMALE">Femenino</SelectItem>
                          </SelectContent>
                        </Select>
                        {!canEditSensitiveFields && (
                          <FormDescription className="text-amber-600">
                            Solo administradores pueden modificar el género
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dominantHand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mano dominante</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona mano" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="RIGHT">Diestro</SelectItem>
                            <SelectItem value="LEFT">Zurdo</SelectItem>
                            <SelectItem value="AMBIDEXTROUS">Ambidiestro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loadingCategories || !selectedGender || !canEditSensitiveFields}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !canEditSensitiveFields ? "Solo administradores pueden cambiar categoría" :
                                loadingCategories ? "Cargando..." :
                                !selectedGender ? "Primero selecciona un género" :
                                filteredCategories.length === 0 ? "No hay categorías disponibles" :
                                "Selecciona una categoría"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                                {category.genderRestriction === 'MIXED' && (
                                  <span className="text-blue-500 ml-2 text-xs">(Mixta)</span>
                                )}
                                {category.description && (
                                  <span className="text-muted-foreground ml-2">
                                    - {category.description}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {!canEditSensitiveFields ?
                            "Solo administradores pueden modificar la categoría principal." :
                            !selectedGender ?
                              "Selecciona género para ver las categorías disponibles." :
                              "Categoría principal del jugador."
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de imagen de perfil</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://ejemplo.com/imagen.jpg"
                          />
                        </FormControl>
                        <FormDescription>
                          URL opcional de la imagen de perfil del jugador
                        </FormDescription>
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
                            {...field}
                            type="number"
                            min="0"
                            disabled={!canEditSensitiveFields}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          {!canEditSensitiveFields ?
                            "Solo administradores pueden modificar los puntos de ranking." :
                            "Puntos iniciales del jugador"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

          {/* Emergency Contact */}
          {createPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contacto de Emergencia (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del contacto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="María Pérez" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono del contacto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+54 9 11 9876-5432" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Información Médica */}
          {createPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Información Médica (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo sanguíneo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona grupo sanguíneo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A_POSITIVE">A+</SelectItem>
                          <SelectItem value="A_NEGATIVE">A-</SelectItem>
                          <SelectItem value="B_POSITIVE">B+</SelectItem>
                          <SelectItem value="B_NEGATIVE">B-</SelectItem>
                          <SelectItem value="AB_POSITIVE">AB+</SelectItem>
                          <SelectItem value="AB_NEGATIVE">AB-</SelectItem>
                          <SelectItem value="O_POSITIVE">O+</SelectItem>
                          <SelectItem value="O_NEGATIVE">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Información importante para emergencias médicas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas médicas</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Alergias, medicamentos, condiciones médicas relevantes..."
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Información médica importante para emergencias
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}