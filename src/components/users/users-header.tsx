"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" }
]

export function UsersHeader() {
  return (
    <DataTableHeader
      title="Usuarios"
      description="Gestiona usuarios, jugadores y sus perfiles"
      searchPlaceholder="Buscar usuarios..."
      createButtonText="Nuevo Usuario"
      createButtonHref="/dashboard/users/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="status"
      basePath="/dashboard/users"
    />
  )
}