"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { useAuth } from "@/hooks/use-auth"

const statusOptions = [
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" }
]

export function CategoriesHeader() {
  const { isAdmin } = useAuth()

  return (
    <DataTableHeader
      title="Categorías"
      description="Gestiona las categorías para organizar torneos"
      searchPlaceholder="Buscar por nombre o descripción..."
      createButtonText="Nueva Categoría"
      createButtonHref="/dashboard/categories/new"
      showCreateButton={isAdmin}
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="isActive"
      basePath="/dashboard/categories"
    />
  )
}