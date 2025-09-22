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
import { useToast } from "@/hooks/use-toast"
import { tournamentStatusOptions } from "@/lib/validations/tournament"
import { Settings2 } from "lucide-react"

interface TournamentStatusManagerProps {
  tournamentId: string
  currentStatus: string
  isOwner: boolean
}

// Definir transiciones válidas de estados (incluyendo retrocesos permitidos)
const validTransitions: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["DRAFT", "REGISTRATION_OPEN", "CANCELLED"],
  REGISTRATION_OPEN: ["PUBLISHED", "REGISTRATION_CLOSED", "CANCELLED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REGISTRATION_CLOSED", "COMPLETED", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"], // Solo permitir volver a IN_PROGRESS si se necesita corrección
  CANCELLED: ["DRAFT", "PUBLISHED"] // Permitir reactivar torneos cancelados
}

// Definir qué transiciones son retrocesos que requieren validaciones especiales
const backwardTransitions: Record<string, string[]> = {
  PUBLISHED: ["DRAFT"],
  REGISTRATION_OPEN: ["PUBLISHED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN"],
  IN_PROGRESS: ["REGISTRATION_CLOSED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["DRAFT", "PUBLISHED"]
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  PUBLISHED: "bg-blue-100 text-blue-800 border-blue-200",
  REGISTRATION_OPEN: "bg-green-100 text-green-800 border-green-200",
  REGISTRATION_CLOSED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
  COMPLETED: "bg-purple-100 text-purple-800 border-purple-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

export function TournamentStatusManager({
  tournamentId,
  currentStatus,
  isOwner
}: TournamentStatusManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const currentStatusOption = tournamentStatusOptions.find(s => s.value === currentStatus)
  const availableTransitions = validTransitions[currentStatus] || []

  // Determinar si la transición seleccionada es un retroceso
  const isBackwardTransition = selectedStatus && backwardTransitions[currentStatus]?.includes(selectedStatus)

  // Obtener mensaje de advertencia para retrocesos
  const getBackwardWarning = (fromStatus: string, toStatus: string): string => {
    switch (fromStatus) {
      case "IN_PROGRESS":
        return "⚠️ Esto detendrá el torneo en progreso. Solo se permite si no hay partidos jugados."
      case "COMPLETED":
        return "⚠️ Esto reabrirá un torneo completado. Esta acción requiere permisos de administrador."
      case "REGISTRATION_CLOSED":
        if (toStatus === "REGISTRATION_OPEN") {
          return "⚠️ Esto reabrirá las inscripciones. Los equipos ya registrados se mantendrán."
        }
        return "⚠️ Esto retrocederá el estado del torneo."
      case "CANCELLED":
        return "⚠️ Esto reactivará un torneo cancelado."
      default:
        return "⚠️ Esto retrocederá el estado del torneo."
    }
  }

  const handleStatusChange = async () => {
    if (!selectedStatus) return

    try {
      setLoading(true)

      const response = await fetch(`/api/tournaments/${tournamentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: selectedStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al cambiar estado")
      }

      toast({
        title: "Estado actualizado",
        description: `El torneo ahora está en estado: ${tournamentStatusOptions.find(s => s.value === selectedStatus)?.label}`,
      })

      setIsOpen(false)
      setSelectedStatus("")
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

  if (!isOwner || availableTransitions.length === 0) {
    // Solo mostrar el badge si no puede cambiar el estado
    return (
      <Badge
        variant="outline"
        className={statusColors[currentStatus]}
      >
        {currentStatusOption?.label || currentStatus}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={statusColors[currentStatus]}
      >
        {currentStatusOption?.label || currentStatus}
      </Badge>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings2 className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Torneo</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo estado para el torneo. Ahora puedes avanzar o retroceder según sea necesario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Estado actual:</label>
              <p className="text-sm text-muted-foreground">
                {currentStatusOption?.label || currentStatus}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Nuevo estado:</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map((status) => {
                    const option = tournamentStatusOptions.find(s => s.value === status)
                    return (
                      <SelectItem key={status} value={status}>
                        {option?.label || status}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar advertencia para retrocesos */}
            {isBackwardTransition && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  {getBackwardWarning(currentStatus, selectedStatus)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || loading}
            >
              {loading ? "Cambiando..." : "Cambiar Estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}