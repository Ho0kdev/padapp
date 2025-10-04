"use client"

import { useEffect, useState } from "react"
import { DataTableHeader } from "@/components/ui/data-table-header"
import { teamStatusOptions } from "@/lib/validations/team"

interface Tournament {
  id: string
  name: string
}

export function TeamsHeader() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Filtrar solo torneos activos (no draft, no cancelados, no completados)
        const statuses = ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS']
        const statusQuery = statuses.map(s => `status=${s}`).join('&')
        const response = await fetch(`/api/tournaments?${statusQuery}&limit=100`)
        if (response.ok) {
          const data = await response.json()
          setTournaments(data.tournaments || [])
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error)
      }
    }

    fetchTournaments()
  }, [])

  const tournamentOptions = tournaments.map(tournament => ({
    value: tournament.id,
    label: tournament.name
  }))

  const statusOptions = teamStatusOptions.map(option => ({
    value: option.value,
    label: option.label
  }))

  return (
    <DataTableHeader
      title="Equipos"
      description="Gestiona los equipos formados en torneos"
      searchPlaceholder="Buscar equipos..."
      createButtonText="Formar Equipo"
      createButtonHref="/dashboard/teams/new"
      filterLabel="Estado"
      filterOptions={statusOptions}
      secondaryFilter={{
        label: "Torneo",
        options: tournamentOptions,
        paramKey: "tournamentId",
        width: "w-[200px]"
      }}
      basePath="/dashboard/teams"
    />
  )
}
