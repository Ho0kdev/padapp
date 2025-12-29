"use client"

import { useEffect, useState } from "react"
import { DataTableHeader } from "@/components/ui/data-table-header"

const statusOptions = [
  { value: "SCHEDULED", label: "Programado" },
  { value: "IN_PROGRESS", label: "En Progreso" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "WALKOVER", label: "Walkover" }
]

interface Tournament {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export function MatchesHeader() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar solo categorías y torneos que tienen partidos
        const response = await fetch('/api/matches/filters')
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
      title="Partidos"
      description="Gestiona y visualiza todos los partidos del sistema"
      searchPlaceholder="Buscar por equipo, torneo, categoría..."
      showCreateButton={false}
      filterLabel="Estado"
      filterOptions={statusOptions}
      filterParamKey="status"
      secondaryFilter={{
        label: "Torneo",
        options: tournamentOptions,
        paramKey: "tournamentId",
        width: "w-full sm:w-[200px]"
      }}
      tertiaryFilter={{
        label: "Categoría",
        options: categoryOptions,
        paramKey: "categoryId",
        width: "w-full sm:w-[180px]"
      }}
      basePath="/dashboard/matches"
    />
  )
}
