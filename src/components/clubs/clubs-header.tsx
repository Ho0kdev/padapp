"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "MAINTENANCE", label: "Mantenimiento" }
]

export function ClubsHeader() {
  return (
    <DataTableHeader
      title="Clubes"
      description="Gestiona los clubes de pádel de la plataforma"
      searchPlaceholder="Buscar clubes..."
      createButtonText="Nuevo Club"
      createButtonHref="/dashboard/clubs/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      basePath="/dashboard/clubs"
    />
  )
}