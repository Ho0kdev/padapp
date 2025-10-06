"use client"

import { useState } from "react"
import { BracketGenerator } from "./bracket-generator"
import { GroupsVisualization } from "./groups-visualization"

interface BracketSectionProps {
  tournament: {
    id: string
    type: string
    name: string
  }
  category: {
    id: string
    categoryId: string
    category: {
      name: string
      type: string
    }
    _count?: {
      teams: number
    }
  }
}

export function BracketSection({ tournament, category }: BracketSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleBracketGenerated = () => {
    // Incrementar el trigger para refrescar GroupsVisualization
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Generador de Brackets */}
      <BracketGenerator
        tournamentId={tournament.id}
        categoryId={category.categoryId}
        categoryName={category.category.name}
        teamsCount={category._count?.teams || 0}
        tournamentType={tournament.type}
        onBracketGenerated={handleBracketGenerated}
      />

      {/* Visualización de Grupos (solo para GROUP_STAGE_ELIMINATION) */}
      {tournament.type === 'GROUP_STAGE_ELIMINATION' && (
        <GroupsVisualization
          tournamentId={tournament.id}
          categoryId={category.categoryId}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  )
}
