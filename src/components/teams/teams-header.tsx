"use client"

import { useEffect, useState } from "react"
import { DataTableHeader } from "@/components/ui/data-table-header"
import { teamStatusOptions } from "@/lib/validations/team"
import { useAuth } from "@/hooks/use-auth"

interface Tournament {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export function TeamsHeader() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar solo categorías y torneos que tienen equipos
        const response = await fetch('/api/teams/_filters')
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

  const statusOptions = teamStatusOptions.map(option => ({
    value: option.value,
    label: option.label
  }))

  return (
    <DataTableHeader
      title="Equipos"
      description={isAdmin ? "Gestiona los equipos formados en torneos" : "Tus equipos en torneos"}
      searchPlaceholder="Buscar por nombre de equipo o jugadores..."
      createButtonText={isAdmin ? "Formar Equipo" : undefined}
      createButtonHref={isAdmin ? "/dashboard/teams/new" : undefined}
      filterLabel="Estado"
      filterOptions={statusOptions}
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
      basePath="/dashboard/teams"
    />
  )
}
