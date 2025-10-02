"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Trophy, MapPin } from "lucide-react"
import { AmericanoMatchResultDialog } from "./americano-match-result-dialog"

interface PoolCardProps {
  pool: any
  onMatchUpdate: () => void
}

export function PoolCard({ pool, onMatchUpdate }: PoolCardProps) {
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  const getMatchTeamName = (match: any, team: "A" | "B") => {
    if (team === "A") {
      return `${match.player1.firstName} + ${match.player2.firstName}`
    } else {
      return `${match.player3.firstName} + ${match.player4.firstName}`
    }
  }

  const getMatchStatus = (match: any) => {
    switch (match.status) {
      case "COMPLETED":
        return <Badge className="bg-green-600">Completado</Badge>
      case "IN_PROGRESS":
        return <Badge className="bg-blue-600">En Progreso</Badge>
      default:
        return <Badge variant="outline">Pendiente</Badge>
    }
  }

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
                <div
                  key={match.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Ronda {match.roundNumber}
                    </span>
                    {getMatchStatus(match)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {getMatchTeamName(match, "A")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Equipo A
                      </p>
                    </div>

                    {match.status === "COMPLETED" ? (
                      <div className="px-4 py-2 bg-muted rounded">
                        <p className="text-lg font-bold">
                          {match.teamAScore} - {match.teamBScore}
                        </p>
                      </div>
                    ) : (
                      <div className="px-4 py-2 text-muted-foreground">
                        vs
                      </div>
                    )}

                    <div className="flex-1 text-right">
                      <p className="font-medium">
                        {getMatchTeamName(match, "B")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Equipo B
                      </p>
                    </div>
                  </div>

                  {match.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedMatch(match)}
                    >
                      Cargar Resultado
                    </Button>
                  )}
                </div>
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
