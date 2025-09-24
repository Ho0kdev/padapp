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
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z.string().optional().refine((val) => !val || val.length >= 6, {
    message: 'La contraseña debe tener al menos 6 caracteres'
  }),
  role: z.enum(['ADMIN', 'ORGANIZER', 'PLAYER']).default('PLAYER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  createPlayer: z.boolean().default(true),
  // Player fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato debe ser DD/MM/YYYY').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
  dominantHand: z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS']).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
  rankingPoints: z.number().min(0).default(0),
  categoryId: z.string().optional(),
  profileImageUrl: z.string().optional()
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
}

export function UserForm({ initialData, userId }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const isEditing = !!userId

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: initialData?.email || '',
      name: initialData?.name || '',
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
      medicalNotes: initialData?.medicalNotes || '',
      rankingPoints: initialData?.rankingPoints || 0,
      categoryId: initialData?.categoryId,
      profileImageUrl: initialData?.profileImageUrl || ''
    }
  })

  const createPlayer = form.watch('createPlayer')
  const selectedRole = form.watch('role')
  const fullName = form.watch('name') || ''

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
      form.setValue('medicalNotes', '')
    }
  }

  const onSubmit = async (values: UserFormValues) => {
    try {
      setLoading(true)

      // Auto-divide the full name into first and last name for player creation
      let submissionData = { ...values }

      if (values.createPlayer && values.name && values.name.trim()) {
        const nameParts = values.name.trim().split(' ')
        submissionData.firstName = nameParts[0] || ''
        submissionData.lastName = nameParts.slice(1).join(' ') || ''
      }

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
        title: isEditing ? "Usuario actualizado" : "Usuario creado",
        description: `El usuario ha sido ${isEditing ? "actualizado" : "creado"} exitosamente.`,
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
        title: "Error",
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Juan Pérez"
                        />
                      </FormControl>
                      <FormDescription>
                        {createPlayer && 'Se usará automáticamente como nombre del jugador (se dividirá en nombre y apellido)'}
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol *</FormLabel>
                      <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLAYER">Jugador</SelectItem>
                          <SelectItem value="ORGANIZER">Organizador</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {selectedRole !== 'PLAYER' && (
                  <FormField
                    control={form.control}
                    name="createPlayer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={handleCreatePlayerChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Crear perfil de jugador
                          </FormLabel>
                          <FormDescription>
                            Permite que este usuario también participe como jugador
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
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
                <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-gray-700">
                    <strong>Nombre del jugador:</strong> Se usará automáticamente el nombre completo del usuario "{fullName || 'Sin especificar'}"
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    El nombre se dividirá automáticamente en nombre y apellido cuando sea necesario
                  </p>
                </div>

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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Género</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona género" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MALE">Masculino</SelectItem>
                              <SelectItem value="FEMALE">Femenino</SelectItem>
                              <SelectItem value="MIXED">Mixto</SelectItem>
                            </SelectContent>
                          </Select>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loadingCategories}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingCategories ? "Cargando..." : "Selecciona una categoría"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                          Categoría en la que participará el jugador
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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Puntos iniciales del jugador
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
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
              <CardContent>
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