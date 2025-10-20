"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function TournamentFormSimple() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "SINGLE_ELIMINATION",
    visibility: "PUBLIC",
    registrationStart: new Date().toISOString().split('T')[0],
    registrationEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tournamentStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    minParticipants: 4,
    registrationFee: 0,
    prizePool: 0,
    setsToWin: 2,
    gamesToWinSet: 6,
    tiebreakAt: 6,
    goldenPoint: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const payload = {
        ...formData,
        registrationStart: new Date(formData.registrationStart).toISOString(),
        registrationEnd: new Date(formData.registrationEnd).toISOString(),
        tournamentStart: new Date(formData.tournamentStart).toISOString(),
      }

      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Tournament creation error:", error)

        if (response.status === 401) {
          throw new Error("Sesión expirada. Por favor, vuelve a iniciar sesión.")
        }

        throw new Error(error.error || error.details || "Error al crear torneo")
      }

      const tournament = await response.json()

      toast({
        title: "✅ Éxito",
        description: "Torneo creado correctamente",
        variant: "success",
      })

      router.push(`/dashboard/tournaments/${tournament.id}`)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al crear torneo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Torneo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ej: Torneo de Primavera 2024"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Descripción del torneo..."
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de Torneo *</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
              className="w-full p-2 border border-input bg-background rounded-md"
              required
            >
              <option value="SINGLE_ELIMINATION">Eliminación Simple</option>
              <option value="DOUBLE_ELIMINATION">Eliminación Doble</option>
              <option value="ROUND_ROBIN">Todos contra Todos</option>
              <option value="SWISS">Sistema Suizo</option>
              <option value="GROUP_STAGE_ELIMINATION">Grupos + Eliminatoria</option>
              <option value="AMERICANO">Americano</option>
            </select>
          </div>

          <div>
            <Label htmlFor="visibility">Visibilidad</Label>
            <select
              id="visibility"
              value={formData.visibility}
              onChange={(e) => handleChange("visibility", e.target.value)}
              className="w-full p-2 border border-input bg-background rounded-md"
            >
              <option value="PUBLIC">Público</option>
              <option value="PRIVATE">Privado</option>
              <option value="CLUB_MEMBERS">Solo Miembros del Club</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fechas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="registrationStart">Inicio Inscripciones *</Label>
            <Input
              id="registrationStart"
              type="date"
              value={formData.registrationStart}
              onChange={(e) => handleChange("registrationStart", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="registrationEnd">Fin Inscripciones *</Label>
            <Input
              id="registrationEnd"
              type="date"
              value={formData.registrationEnd}
              onChange={(e) => handleChange("registrationEnd", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="tournamentStart">Inicio Torneo *</Label>
            <Input
              id="tournamentStart"
              type="date"
              value={formData.tournamentStart}
              onChange={(e) => handleChange("tournamentStart", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minParticipants">Mín. Participantes</Label>
              <Input
                id="minParticipants"
                type="number"
                min="2"
                value={formData.minParticipants}
                onChange={(e) => handleChange("minParticipants", parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="registrationFee">Tarifa Inscripción ($)</Label>
              <Input
                id="registrationFee"
                type="number"
                min="0"
                step="0.01"
                value={formData.registrationFee}
                onChange={(e) => handleChange("registrationFee", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prizePool">Premio Total ($)</Label>
            <Input
              id="prizePool"
              type="number"
              min="0"
              step="0.01"
              value={formData.prizePool}
              onChange={(e) => handleChange("prizePool", parseFloat(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

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
          {loading ? "Guardando..." : "Crear"} Torneo
        </Button>
      </div>
    </form>
  )
}