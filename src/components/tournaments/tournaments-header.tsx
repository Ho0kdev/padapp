"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { tournamentStatusOptions } from "@/lib/validations/tournament"
import { useAuth } from "@/hooks/use-auth"

const statusOptions = tournamentStatusOptions.map(option => ({
  value: option.value,
  label: option.label
}))

export function TournamentsHeader() {
  const { isAdminOrClubAdmin } = useAuth()

  return (
    <DataTableHeader
      title="Torneos"
      description="Gestiona y organiza torneos de pádel"
      searchPlaceholder="Buscar torneos..."
      createButtonText="Nuevo Torneo"
      createButtonHref="/dashboard/tournaments/new"
      showCreateButton={isAdminOrClubAdmin}
      filterLabel="Estado"
      filterOptions={statusOptions}
      basePath="/dashboard/tournaments"
    />
  )
}