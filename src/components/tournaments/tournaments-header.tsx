"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { tournamentStatusOptions } from "@/lib/validations/tournament"

const statusOptions = tournamentStatusOptions.map(option => ({
  value: option.value,
  label: option.label
}))

export function TournamentsHeader() {
  return (
    <DataTableHeader
      title="Torneos"
      description="Gestiona y organiza torneos de pádel"
      searchPlaceholder="Buscar torneos..."
      createButtonText="Nuevo Torneo"
      createButtonHref="/dashboard/tournaments/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      basePath="/dashboard/tournaments"
    />
  )
}