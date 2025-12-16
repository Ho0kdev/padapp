"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
  { value: "SUSPENDED", label: "Suspendidos" }
]

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "CLUB_ADMIN", label: "Admin Club" },
  { value: "PLAYER", label: "Jugador" },
  { value: "REFEREE", label: "Árbitro" }
]

const genderOptions = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Femenino" },
  { value: "MIXED", label: "Mixto" }
]

export function UsersHeader() {
  return (
    <DataTableHeader
      title="Usuarios"
      description="Gestiona usuarios, jugadores y sus perfiles"
      searchPlaceholder="Buscar por nombre, email..."
      createButtonText="Nuevo Usuario"
      createButtonHref="/dashboard/users/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="status"
      secondaryFilter={{
        label: "Rol",
        options: roleOptions,
        paramKey: "role",
        width: "w-full sm:w-[140px]"
      }}
      tertiaryFilter={{
        label: "Género",
        options: genderOptions,
        paramKey: "gender",
        width: "w-full sm:w-[140px]"
      }}
      basePath="/dashboard/users"
    />
  )
}