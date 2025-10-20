"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tag,
  Users,
  Calendar,
  Trophy,
  FileText
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  categoryFormSchema,
  categoryEditSchema,
  CategoryFormData,
  CategoryEditData,
  categoryTypeOptions,
  genderOptions
} from "@/lib/validations/category"

interface CategoryFormProps {
  initialData?: Partial<CategoryFormData>
  categoryId?: string
}

export function CategoryForm({ initialData, categoryId }: CategoryFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<CategoryEditData | CategoryFormData>({
    resolver: zodResolver(categoryId ? categoryEditSchema : categoryFormSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      type: initialData?.type || "AGE",
      level: initialData?.level?.toString() ?? "",
      minAge: initialData?.minAge?.toString() ?? "",
      maxAge: initialData?.maxAge?.toString() ?? "",
      genderRestriction: initialData?.genderRestriction || "NONE",
      minRankingPoints: initialData?.minRankingPoints?.toString() ?? "",
      maxRankingPoints: initialData?.maxRankingPoints?.toString() ?? "",
      isActive: initialData?.isActive ?? true
    } as any
  })


  const onSubmit = async (data: CategoryEditData | CategoryFormData) => {
    try {
      setLoading(true)

      const url = categoryId
        ? `/api/categories/${categoryId}`
        : `/api/categories`
      const method = categoryId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar categoría")
      }

      const category = await response.json()

      toast({
        title: categoryId ? "✅ Categoría actualizada" : "✅ Categoría creada",
        description: `La categoría "${category.name}" ha sido ${categoryId ? "actualizada" : "creada"} exitosamente.`,
        variant: "success",
      })

      router.push(`/dashboard/categories`)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar categoría",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Categoría *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Sub-18, Avanzado, Primera..." {...field} />
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
                        placeholder="Descripción de la categoría, requisitos, etc..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Información adicional sobre la categoría (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de Categoría</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="Ej: 7 para 7ma, 4 para 4ta, 6 para B..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor numérico del nivel (1-10). Usado para validar elegibilidad de jugadores. Niveles bajos = más avanzados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Tipo de categoría para clasificación (las restricciones se configuran independientemente)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Restricciones por edad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Restricciones por Edad
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define límites de edad para los participantes (opcional)
              </p>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Mínima</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Edad mínima requerida (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad Máxima</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="100"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Edad máxima permitida (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

          {/* Restricciones por género */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Restricciones por Género
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Especifica si la categoría es para un género específico (opcional)
              </p>
            </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="genderRestriction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restricción de Género</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la restricción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">Sin restricción</SelectItem>
                          {genderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define si la categoría es específica para un género
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

          {/* Restricciones por ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Restricciones por Ranking
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Establece límites de puntos de ranking para los participantes (opcional)
              </p>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minRankingPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puntos Mínimos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Puntos de ranking mínimos (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxRankingPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puntos Máximos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="1000"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Puntos de ranking máximos (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>


          {/* Botones */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : categoryId ? "Actualizar Categoría" : "Crear Categoría"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}