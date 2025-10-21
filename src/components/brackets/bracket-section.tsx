"use client"

import { useState, useEffect } from "react"
import { BracketGenerator } from "./bracket-generator"
import { BracketVisualization } from "./bracket-visualization"
import { BracketTree } from "./bracket-tree"
import { GroupsVisualization } from "./groups-visualization"
import { GroupStandingsAndMatches } from "./group-standings-and-matches"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutList, GitBranch, Trophy } from "lucide-react"

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
    teams: Array<{ id: string }>
  }
}

export function BracketSection({ tournament, category }: BracketSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [bracketData, setBracketData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleBracketGenerated = () => {
    setRefreshTrigger(prev => prev + 1)
    fetchBracketData()
  }

  const fetchBracketData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tournaments/${tournament.id}/bracket?categoryId=${category.categoryId}`
      )
      if (response.ok) {
        const data = await response.json()
        setBracketData(data)
      }
    } catch (error) {
      console.error("Error fetching bracket:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBracketData()
  }, [refreshTrigger])

  // Determinar si debe mostrar vista de árbol
  const shouldShowTree = [
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'GROUP_STAGE_ELIMINATION'
  ].includes(tournament.type)

  return (
    <div className="space-y-6">
      {/* Generador de Brackets */}
      <BracketGenerator
        tournamentId={tournament.id}
        categoryId={category.categoryId}
        categoryName={category.category.name}
        teamsCount={category.teams.length}
        tournamentType={tournament.type}
        onBracketGenerated={handleBracketGenerated}
      />

      {/* Visualización de Bracket */}
      {bracketData && bracketData.matches.length > 0 && (
        <>
          {tournament.type === 'GROUP_STAGE_ELIMINATION' ? (
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-3">
                <TabsTrigger value="tree" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Llaves
                </TabsTrigger>
                <TabsTrigger value="standings" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Clasificación
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" />
                  Lista de Partidos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standings" className="mt-6">
                <GroupStandingsAndMatches
                  tournamentId={tournament.id}
                  categoryId={category.categoryId}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>

              <TabsContent value="tree" className="mt-6">
                <BracketTree
                  tournamentId={tournament.id}
                  categoryId={category.categoryId}
                  categoryName={category.category?.name || ""}
                  matches={bracketData.matches}
                  rounds={bracketData.rounds}
                  totalRounds={bracketData.totalRounds}
                  onRefresh={fetchBracketData}
                />
              </TabsContent>

              <TabsContent value="list" className="mt-6">
                <BracketVisualization
                  tournamentId={tournament.id}
                  categoryId={category.categoryId}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>
            </Tabs>
          ) : shouldShowTree ? (
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="tree" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Vista Árbol
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" />
                  Vista Lista
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="mt-6">
                <BracketTree
                  tournamentId={tournament.id}
                  categoryId={category.categoryId}
                  categoryName={category.category?.name || ""}
                  matches={bracketData.matches}
                  rounds={bracketData.rounds}
                  totalRounds={bracketData.totalRounds}
                  onRefresh={fetchBracketData}
                />
              </TabsContent>

              <TabsContent value="list" className="mt-6">
                <BracketVisualization
                  tournamentId={tournament.id}
                  categoryId={category.categoryId}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <BracketVisualization
              tournamentId={tournament.id}
              categoryId={category.categoryId}
              refreshTrigger={refreshTrigger}
            />
          )}
        </>
      )}
    </div>
  )
}
