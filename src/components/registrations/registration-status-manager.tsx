"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { registrationStatusOptions, getRegistrationStatusStyle, getRegistrationStatusLabel } from "@/lib/utils/status-styles"
import { Settings2 } from "lucide-react"

interface RegistrationStatusManagerProps {
  registrationId: string
  currentStatus: string
  tournamentStatus: string
}

// Definir transiciones válidas de estados
const validTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "WAITLIST"],
  CONFIRMED: ["PAID", "PENDING", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  WAITLIST: ["PENDING", "CONFIRMED", "CANCELLED"],
  CANCELLED: ["PENDING"] // Permitir reactivar inscripciones canceladas
}

// Descripciones de cada estado
const statusDescriptions: Record<string, string> = {
  PENDING: "La inscripción está pendiente de confirmación por el organizador",
  CONFIRMED: "La inscripción ha sido confirmada y el equipo está registrado oficialmente",
  PAID: "La inscripción ha sido pagada completamente y está confirmada",
  CANCELLED: "La inscripción ha sido cancelada y el equipo no participará",
  WAITLIST: "La inscripción está en lista de espera por falta de cupos",
}

export function RegistrationStatusManager({
  registrationId,
  currentStatus,
  tournamentStatus
}: RegistrationStatusManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const currentStatusOption = registrationStatusOptions.find(s => s.value === currentStatus)
  const availableTransitions = validTransitions[currentStatus] || []

  // Verificar si el torneo está completado
  const isTournamentCompleted = tournamentStatus === 'COMPLETED'

  const handleStatusChange = async () => {
    if (!selectedStatus) return

    try {
      setLoading(true)

      const response = await fetch(`/api/registrations/${registrationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedStatus,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cambiar estado")
      }

      toast({
        title: "Estado actualizado",
        description: `La inscripción ahora está en estado: ${registrationStatusOptions.find(s => s.value === selectedStatus)?.label}`,
        variant: "success",
      })

      setIsOpen(false)
      setSelectedStatus("")
      setNotes("")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar estado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (isTournamentCompleted || availableTransitions.length === 0) {
    // Solo mostrar el badge si no puede cambiar el estado
    return (
      <Badge className={getRegistrationStatusStyle(currentStatus)}>
        {currentStatusOption?.label || getRegistrationStatusLabel(currentStatus)}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={getRegistrationStatusStyle(currentStatus)}>
        {currentStatusOption?.label || getRegistrationStatusLabel(currentStatus)}
      </Badge>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings2 className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cambiar Estado de Inscripción</DialogTitle>
            <DialogDescription>
              Actualiza el estado de la inscripción. Los cambios quedarán registrados en el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Estado actual:</label>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStatusOption?.label || currentStatus}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Nuevo estado:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map((status) => {
                    const option = registrationStatusOptions.find(s => s.value === status)
                    return (
                      <SelectItem key={status} value={status}>
                        {option?.label || status}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectedStatus && (
                <p className="text-sm text-muted-foreground">
                  {statusDescriptions[selectedStatus]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Agrega notas sobre este cambio de estado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Las notas se agregarán al historial de la inscripción
              </p>
            </div>

            {/* Advertencias según el cambio */}
            {selectedStatus === 'CANCELLED' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ Cancelar esta inscripción eliminará al equipo del torneo.
                </p>
              </div>
            )}
            {selectedStatus === 'PAID' && currentStatus !== 'CONFIRMED' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  ℹ️ Se recomienda confirmar la inscripción antes de marcarla como pagada.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                setSelectedStatus("")
                setNotes("")
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || loading}
            >
              {loading ? "Actualizando..." : "Actualizar Estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
