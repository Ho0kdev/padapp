"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, MapPin } from "lucide-react"
import { AmericanoMatchResultDialog } from "./americano-match-result-dialog"
import { AmericanoMatchCard } from "./americano-match-card"

interface PoolCardProps {
  pool: any
  onMatchUpdate: () => void
  hasPreviousRoundsIncomplete?: boolean
}

export function PoolCard({ pool, onMatchUpdate, hasPreviousRoundsIncomplete = false }: PoolCardProps) {
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {pool.name}
            </CardTitle>
            {pool.court && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {pool.court.name}
              </Badge>
            )}
          </div>
          <CardDescription>Pool #{pool.poolNumber}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Jugadores */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Jugadores
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {pool.players
                .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
                .map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {p.player.firstName} {p.player.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.matchesWon}-{p.matchesLost} partidos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{p.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Partidos */}
          <div>
            <h4 className="font-semibold mb-3">Partidos</h4>
            <div className="space-y-3">
              {pool.matches.map((match: any) => (
                <AmericanoMatchCard
                  key={match.id}
                  match={match}
                  canManage={true}
                  onLoadResult={() => setSelectedMatch(match)}
                  hasPreviousRoundsIncomplete={hasPreviousRoundsIncomplete}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <AmericanoMatchResultDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onSuccess={() => {
            setSelectedMatch(null)
            onMatchUpdate()
          }}
        />
      )}
    </>
  )
}
