"use client"

import { DataTableHeader } from "@/components/ui/data-table-header"
import { useEffect, useState } from "react"

const statusOptions = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "MAINTENANCE", label: "Mantenimiento" }
]

export function ClubsHeader() {
  const [cities, setCities] = useState<Array<{ value: string; label: string }>>([])
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    // Fetch unique cities and countries
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/clubs/filters')
        if (response.ok) {
          const data = await response.json()
          setCities(data.cities || [])
          setCountries(data.countries || [])
        }
      } catch (error) {
        console.error('Error fetching filters:', error)
      }
    }
    fetchFilters()
  }, [])

  return (
    <DataTableHeader
      title="Clubes"
      description="Gestiona los clubes de pádel de la plataforma"
      searchPlaceholder="Buscar por nombre, ciudad, dirección..."
      createButtonText="Nuevo Club"
      createButtonHref="/dashboard/clubs/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="status"
      secondaryFilter={cities.length > 0 ? {
        label: "Ciudad",
        options: cities,
        paramKey: "city",
        width: "w-[150px]"
      } : undefined}
      tertiaryFilter={countries.length > 0 ? {
        label: "País",
        options: countries,
        paramKey: "country",
        width: "w-[140px]"
      } : undefined}
      basePath="/dashboard/clubs"
    />
  )
}