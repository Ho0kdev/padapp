"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "SCHEDULED", label: "Programado" },
  { value: "IN_PROGRESS", label: "En Progreso" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "WALKOVER", label: "Walkover" }
]

export function MatchesHeader() {
  return (
    <DataTableHeader
      title="Partidos"
      description="Gestiona y visualiza todos los partidos del sistema"
      searchPlaceholder="Buscar por equipo, torneo, categoría..."
      showCreateButton={false}
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="status"
      basePath="/dashboard/matches"
    />
  )
}
