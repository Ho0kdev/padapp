"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  Building,
  DollarSign,
  FileText,
  Lightbulb,
  Home,
  Square,
  Activity,
  Trees,
  Eye,
  Layers,
  Grid,
  Save,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  courtFormSchema,
  courtEditSchema,
  CourtFormData,
  CourtEditData,
  courtSurfaceOptions
} from "@/lib/validations/court"

interface CourtFormProps {
  initialData?: Partial<CourtFormData>
  courtId?: string
  clubId: string
  clubName: string
}

export function CourtForm({ initialData, courtId, clubId, clubName }: CourtFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<CourtEditData | CourtFormData>({
    resolver: zodResolver(courtId ? courtEditSchema : courtFormSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      surface: initialData?.surface || "CONCRETE",
      hasLighting: initialData?.hasLighting || false,
      hasRoof: initialData?.hasRoof || false,
      isOutdoor: initialData?.isOutdoor || false,
      hasPanoramicGlass: initialData?.hasPanoramicGlass || false,
      hasConcreteWall: initialData?.hasConcreteWall || false,
      hasNet4m: initialData?.hasNet4m || false,
      hourlyRate: initialData?.hourlyRate?.toString() ?? "",
      notes: initialData?.notes || "",
      // Solo incluir clubId para creación
      ...(courtId ? {} : { clubId })
    } as any
  })

  const onSubmit = async (data: CourtEditData | CourtFormData) => {
    try {
      setLoading(true)

      const url = courtId
        ? `/api/clubs/${clubId}/courts/${courtId}`
        : `/api/clubs/${clubId}/courts`
      const method = courtId ? "PUT" : "POST"

      // Para edición, remover el campo status. Para creación, establecer como AVAILABLE
      const submitData = courtId ? { ...data } : { ...data, status: "AVAILABLE" }
      if (courtId && 'status' in submitData) {
        delete (submitData as any).status
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar cancha")
      }

      const court = await response.json()

      toast({
        title: courtId ? "✅ Cancha actualizada" : "✅ Cancha creada",
        description: `La cancha "${court.name}" ha sido ${courtId ? "actualizada" : "creada"} exitosamente.`,
        variant: "success",
      })

      router.push(`/dashboard/clubs/${clubId}`)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar cancha",
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
          {/* Información del Club */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Club: {clubName}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Cancha *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Cancha 1, Cancha Central..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surface"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Superficie *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la superficie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courtSurfaceOptions.map((option) => (
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

          {/* Características */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Características
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hasLighting"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Iluminación
                        </FormLabel>
                        <FormDescription>
                          La cancha cuenta con iluminación artificial
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasRoof"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Techo
                        </FormLabel>
                        <FormDescription>
                          La cancha está techada/cubierta
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isOutdoor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Trees className="h-4 w-4" />
                          Juego Exterior
                        </FormLabel>
                        <FormDescription>
                          La cancha es al aire libre
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasPanoramicGlass"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Cristal Panorámico
                        </FormLabel>
                        <FormDescription>
                          La cancha tiene paredes de cristal panorámico
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasConcreteWall"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Pared de Concreto
                        </FormLabel>
                        <FormDescription>
                          La cancha tiene paredes de concreto
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasNet4m"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Grid className="h-4 w-4" />
                          Red a 4mts
                        </FormLabel>
                        <FormDescription>
                          La cancha tiene red de altura a 4 metros
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información económica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información Económica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio por Hora</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="rounded-l-none"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Precio por hora de alquiler (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notas adicionales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional sobre la cancha, observaciones, etc..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Información adicional sobre la cancha (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Botones */}
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
              {courtId ? "Guardar Cambios" : "Crear Cancha"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}