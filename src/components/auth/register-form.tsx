// src/components/auth/register-form.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth"

type Category = {
  id: string
  name: string
  genderRestriction: "MALE" | "FEMALE" | null
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedGender, setSelectedGender] = useState<"MALE" | "FEMALE" | "">("")
  const [loadingCategories, setLoadingCategories] = useState(true)

  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const gender = watch("gender")

  // Cargar categorías al montar el componente
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories?forRegistration=true&limit=100")
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Error al cargar categorías:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Filtrar categorías por género seleccionado
  const filteredCategories = categories.filter(cat => {
    if (!gender) return false
    return cat.genderRestriction === gender || cat.genderRestriction === null
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          gender: data.gender,
          primaryCategoryId: data.primaryCategoryId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Error al crear la cuenta")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/login?message=Cuenta creada exitosamente")
      }, 2000)

    } catch (error) {
      setError("Error al crear la cuenta. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              ¡Cuenta creada exitosamente! Redirigiendo al login...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
        <CardDescription className="text-center">
          Completa los datos para registrarte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                placeholder="Juan"
                {...register("firstName")}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                placeholder="Pérez"
                {...register("lastName")}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              placeholder="+54 9 11 1234-5678"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Género</Label>
            <Select
              onValueChange={(value) => {
                setValue("gender", value as "MALE" | "FEMALE")
                // Reset category when gender changes
                setValue("primaryCategoryId", "")
              }}
            >
              <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecciona tu género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Masculino</SelectItem>
                <SelectItem value="FEMALE">Femenino</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-500">{errors.gender.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryCategoryId">Categoría Principal</Label>
            <Select
              onValueChange={(value) => setValue("primaryCategoryId", value)}
              disabled={!gender || loadingCategories}
            >
              <SelectTrigger className={errors.primaryCategoryId ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={
                    !gender
                      ? "Primero selecciona tu género"
                      : loadingCategories
                      ? "Cargando categorías..."
                      : "Selecciona tu categoría"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
                {filteredCategories.length === 0 && gender && !loadingCategories && (
                  <SelectItem value="none" disabled>
                    No hay categorías disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.primaryCategoryId && (
              <p className="text-sm text-red-500">{errors.primaryCategoryId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
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
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">¿Ya tienes cuenta? </span>
          <Link 
            href="/auth/login" 
            className="font-medium text-blue-600 hover:underline"
          >
            Inicia sesión aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}