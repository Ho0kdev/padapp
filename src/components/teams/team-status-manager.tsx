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
import { teamStatusOptions, getTeamStatusStyle, getTeamStatusLabel } from "@/lib/utils/status-styles"
import { Settings2 } from "lucide-react"

interface TeamStatusManagerProps {
  teamId: string
  currentStatus: string
  tournamentStatus: string
}

// Definir transiciones válidas de estados
const validTransitions: Record<string, string[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT", "CONFIRMED"]
}

// Descripciones de cada estado
const statusDescriptions: Record<string, string> = {
  DRAFT: "El equipo está en borrador y aún no está oficialmente confirmado",
  CONFIRMED: "El equipo está confirmado y participará en el torneo",
  CANCELLED: "El equipo ha sido cancelado y no participará en el torneo",
}

export function TeamStatusManager({
  teamId,
  currentStatus,
  tournamentStatus
}: TeamStatusManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const currentStatusOption = teamStatusOptions.find(s => s.value === currentStatus)
  const availableTransitions = validTransitions[currentStatus] || []

  // Verificar si el torneo está completado
  const isTournamentCompleted = tournamentStatus === 'COMPLETED'

  const handleStatusChange = async () => {
    if (!selectedStatus) return

    try {
      setLoading(true)

      const response = await fetch(`/api/teams/${teamId}/status`, {
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
        description: `El equipo ahora está en estado: ${teamStatusOptions.find(s => s.value === selectedStatus)?.label}`,
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
      <Badge className={getTeamStatusStyle(currentStatus)}>
        {currentStatusOption?.label || getTeamStatusLabel(currentStatus)}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={getTeamStatusStyle(currentStatus)}>
        {currentStatusOption?.label || getTeamStatusLabel(currentStatus)}
      </Badge>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings2 className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Equipo</DialogTitle>
            <DialogDescription>
              Actualiza el estado del equipo. Los cambios quedarán registrados en las notas.
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
                    const option = teamStatusOptions.find(s => s.value === status)
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
                Las notas se agregarán al campo de notas del equipo
              </p>
            </div>

            {/* Advertencias según el cambio */}
            {selectedStatus === 'CANCELLED' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Cancelar este equipo lo excluirá de la competencia. Las inscripciones individuales se mantendrán.
                </p>
              </div>
            )}
            {selectedStatus === 'CONFIRMED' && currentStatus === 'DRAFT' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Confirmar el equipo lo hará elegible para participar en el torneo.
                </p>
              </div>
            )}
            {selectedStatus === 'DRAFT' && currentStatus === 'CONFIRMED' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ℹ️ Regresar a borrador permitirá realizar cambios antes de confirmar nuevamente.
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
