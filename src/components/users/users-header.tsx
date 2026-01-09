"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { useAuth } from "@/hooks/use-auth"

const statusOptions = [
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
  { value: "SUSPENDED", label: "Suspendidos" }
]

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "ORGANIZER", label: "Admin Club" },
  { value: "PLAYER", label: "Jugador" },
  { value: "REFEREE", label: "Árbitro" }
]

const genderOptions = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Femenino" },
  { value: "MIXED", label: "Mixto" }
]

export function UsersHeader() {
  const { isAdmin } = useAuth()

  return (
    <DataTableHeader
      title="Usuarios"
      description="Gestiona usuarios, jugadores y sus perfiles"
      searchPlaceholder="Buscar por nombre, email..."
      createButtonText="Nuevo Usuario"
      createButtonHref="/dashboard/users/new"
      showCreateButton={isAdmin}
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