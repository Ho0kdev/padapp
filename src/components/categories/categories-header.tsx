"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" }
]

export function CategoriesHeader() {
  return (
    <DataTableHeader
      title="Categorías"
      description="Gestiona las categorías para organizar torneos"
      searchPlaceholder="Buscar categorías..."
      createButtonText="Nueva Categoría"
      createButtonHref="/dashboard/categories/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="isActive"
      basePath="/dashboard/categories"
    />
  )
}