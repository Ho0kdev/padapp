"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { registrationStatusOptions } from "@/lib/utils/status-styles"

export function RegistrationsHeader() {
  return (
    <DataTableHeader
      title="Inscripciones"
      description="Gestiona las inscripciones de equipos en torneos"
      searchPlaceholder="Buscar inscripciones..."
      createButtonText="Nueva Inscripción"
      createButtonHref="/dashboard/registrations/new"
      filterLabel="Estado"
      filterOptions={registrationStatusOptions}
      // filterParamKey="isActive"
      basePath="/dashboard/registrations"
    />
  )
}