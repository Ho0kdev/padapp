"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"

interface GlobalRankingTableProps {
  ranking: any[]
}

export function GlobalRankingTable({ ranking }: GlobalRankingTableProps) {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500">1°</Badge>
      case 2:
        return <Badge className="bg-gray-400">2°</Badge>
      case 3:
        return <Badge className="bg-amber-600">3°</Badge>
      default:
        return <Badge variant="outline">{position}°</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking Global
        </CardTitle>
        <CardDescription>
          Clasificación individual de jugadores basada en games ganados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Pos</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-center">Partidos</TableHead>
              <TableHead className="text-center">Games Ganados</TableHead>
              <TableHead className="text-center">Games Perdidos</TableHead>
              <TableHead className="text-center">Diferencia</TableHead>
              <TableHead className="text-center">% Victoria</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((item) => {
              const position = item.position || 0
              const totalMatches = item.totalMatchesWon + (item.totalGamesLost > 0 ? Math.ceil(item.totalGamesLost / 10) : 0)
              const winPercentage = totalMatches > 0
                ? ((item.totalMatchesWon / totalMatches) * 100).toFixed(1)
                : "0.0"

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPositionIcon(position)}
                      {getPositionBadge(position)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.player.profileImageUrl && (
                        <img
                          src={item.player.profileImageUrl}
                          alt={`${item.player.firstName} ${item.player.lastName}`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <p>{item.player.firstName} {item.player.lastName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{totalMatches}</TableCell>
                  <TableCell className="text-center font-semibold text-green-600">
                    {item.totalGamesWon}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {item.totalGamesLost}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={item.totalGamesWon - item.totalGamesLost > 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                      {item.totalGamesWon - item.totalGamesLost > 0 ? "+" : ""}
                      {item.totalGamesWon - item.totalGamesLost}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{winPercentage}%</TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {item.totalPoints}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
