"use client"

import { useEffect, useState } from "react"
import { DataTableHeader } from "@/components/ui/data-table-header"
import { registrationStatusOptions } from "@/lib/utils/status-styles"

interface Tournament {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export function RegistrationsHeader() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar solo categorías y torneos que tienen inscripciones
        const response = await fetch('/api/registrations/filters')
        if (response.ok) {
          const data = await response.json()
          setTournaments(data.tournaments || [])
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Error fetching filters:", error)
      }
    }

    fetchData()
  }, [])

  const tournamentOptions = tournaments.map(tournament => ({
    value: tournament.id,
    label: tournament.name
  }))

  const categoryOptions = categories.map(category => ({
    value: category.id,
    label: category.name
  }))

  return (
    <DataTableHeader
      title="Inscripciones"
      description="Gestiona las inscripciones de equipos en torneos"
      searchPlaceholder="Buscar por jugador, torneo, categoría..."
      createButtonText="Nueva Inscripción"
      createButtonHref="/dashboard/registrations/new"
      filterLabel="Estado"
      filterOptions={registrationStatusOptions as any}
      filterParamKey="status"
      secondaryFilter={{
        label: "Torneo",
        options: tournamentOptions,
        paramKey: "tournamentId",
        width: "w-[200px]"
      }}
      tertiaryFilter={{
        label: "Categoría",
        options: categoryOptions,
        paramKey: "categoryId",
        width: "w-[180px]"
      }}
      basePath="/dashboard/registrations"
    />
  )
}