"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "PENDING", label: "Pendiente" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "PAID", label: "Pagado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "WAITLIST", label: "En Lista de Espera" }
]

export function RegistrationsHeader() {
  return (
    <DataTableHeader
      title="Inscripciones"
      description="Gestiona las inscripciones de equipos en torneos"
      searchPlaceholder="Buscar inscripciones..."
      createButtonText="Nueva Inscripción"
      createButtonHref="/dashboard/registrations/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      // filterParamKey="isActive"
      basePath="/dashboard/registrations"
    />
  )
}