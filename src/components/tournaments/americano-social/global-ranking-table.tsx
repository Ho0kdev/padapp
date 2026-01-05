"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface GlobalRankingTableProps {
  ranking: any[]
}

export function GlobalRankingTable({ ranking }: GlobalRankingTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (itemId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedRows(newExpanded)
  }

  // Agrupar ranking por categoría
  const rankingByCategory = useMemo(() => {
    const grouped = new Map<string, { categoryId: string; categoryName: string; players: any[] }>()

    ranking.forEach((item) => {
      const categoryId = item.categoryId
      const categoryName = item.category?.name || 'Sin categoría'

      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          categoryId,
          categoryName,
          players: []
        })
      }

      grouped.get(categoryId)!.players.push(item)
    })

    return Array.from(grouped.values())
  }, [ranking])

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

  // Si solo hay una categoría, mostrar directamente sin tabs
  if (rankingByCategory.length === 1) {
    const categoryGroup = rankingByCategory[0]

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking Global - {categoryGroup.categoryName}
          </CardTitle>
          <CardDescription>
            Clasificación individual de jugadores basada en games ganados
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <Table className="hidden md:table">
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
                  {categoryGroup.players.map((item) => {
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

              {/* Mobile Table */}
              <table className="w-full md:hidden text-xs min-w-0">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 font-semibold text-muted-foreground w-6">#</th>
                    <th className="text-left py-2 px-1 font-semibold text-muted-foreground min-w-0">Jugador</th>
                    <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-10" title="Games Ganados">GG</th>
                    <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-10" title="Puntos">PTS</th>
                    <th className="w-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {categoryGroup.players.map((item, index) => {
                    const position = item.position || 0
                    const totalMatches = item.totalMatchesWon + (item.totalGamesLost > 0 ? Math.ceil(item.totalGamesLost / 10) : 0)
                    const winPercentage = totalMatches > 0
                      ? ((item.totalMatchesWon / totalMatches) * 100).toFixed(1)
                      : "0.0"

                    return (
                      <React.Fragment key={`mobile-${item.id}`}>
                        <tr
                          className={cn(
                            "border-b transition-colors cursor-pointer",
                            index < 3 && "bg-muted/20",
                            expandedRows.has(item.id) && "border-b-0"
                          )}
                          onClick={() => toggleRow(item.id)}
                        >
                          <td className="py-2 px-1">
                            <div className={cn(
                              "flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold",
                              index < 3
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {position}
                            </div>
                          </td>
                          <td className="py-2 px-1 max-w-0">
                            <p className="text-[10px] font-medium leading-tight line-clamp-2 overflow-hidden text-ellipsis">
                              {item.player.firstName} {item.player.lastName}
                            </p>
                          </td>
                          <td className="text-center py-2 px-0.5">
                            <span className="text-[10px] font-semibold text-green-600">
                              {item.totalGamesWon}
                            </span>
                          </td>
                          <td className="text-center py-2 px-0.5">
                            <span className="text-[10px] font-bold text-primary">
                              {item.totalPoints}
                            </span>
                          </td>
                          <td className="py-2 px-0.5">
                            {expandedRows.has(item.id) ? (
                              <ChevronUp className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                        {expandedRows.has(item.id) && (
                          <tr className={cn(
                            "border-b",
                            index < 3 && "bg-muted/10"
                          )}>
                            <td colSpan={5} className="py-3 px-2">
                              <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Partidos:</span>
                                    <span className="font-medium">{totalMatches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">% Victoria:</span>
                                    <span className="font-medium">{winPercentage}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">G. Perdidos:</span>
                                    <span className="font-medium text-muted-foreground">{item.totalGamesLost}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Diferencia:</span>
                                    <span className={cn(
                                      "font-medium",
                                      item.totalGamesWon - item.totalGamesLost > 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                      {item.totalGamesWon - item.totalGamesLost > 0 ? "+" : ""}
                                      {item.totalGamesWon - item.totalGamesLost}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )
  }

  // Múltiples categorías: usar Tabs
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
        <Tabs defaultValue={rankingByCategory[0]?.categoryId || ''} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            {rankingByCategory.map((categoryGroup) => (
              <TabsTrigger key={categoryGroup.categoryId} value={categoryGroup.categoryId}>
                {categoryGroup.categoryName}
              </TabsTrigger>
            ))}
          </TabsList>

          {rankingByCategory.map((categoryGroup) => (
            <TabsContent key={categoryGroup.categoryId} value={categoryGroup.categoryId}>
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <Table className="hidden md:table">
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
                    {categoryGroup.players.map((item) => {
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

                {/* Mobile Table */}
                <table className="w-full md:hidden text-xs min-w-0">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground w-6">#</th>
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground min-w-0">Jugador</th>
                      <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-10" title="Games Ganados">GG</th>
                      <th className="text-center py-2 px-0.5 font-semibold text-muted-foreground w-10" title="Puntos">PTS</th>
                      <th className="w-5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryGroup.players.map((item, index) => {
                      const position = item.position || 0
                      const totalMatches = item.totalMatchesWon + (item.totalGamesLost > 0 ? Math.ceil(item.totalGamesLost / 10) : 0)
                      const winPercentage = totalMatches > 0
                        ? ((item.totalMatchesWon / totalMatches) * 100).toFixed(1)
                        : "0.0"

                      return (
                        <React.Fragment key={`mobile-${item.id}`}>
                          <tr
                            className={cn(
                              "border-b transition-colors cursor-pointer",
                              index < 3 && "bg-muted/20",
                              expandedRows.has(item.id) && "border-b-0"
                            )}
                            onClick={() => toggleRow(item.id)}
                          >
                            <td className="py-2 px-1">
                              <div className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold",
                                index < 3
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {position}
                              </div>
                            </td>
                            <td className="py-2 px-1 max-w-0">
                              <p className="text-[10px] font-medium leading-tight line-clamp-2 overflow-hidden text-ellipsis">
                                {item.player.firstName} {item.player.lastName}
                              </p>
                            </td>
                            <td className="text-center py-2 px-0.5">
                              <span className="text-[10px] font-semibold text-green-600">
                                {item.totalGamesWon}
                              </span>
                            </td>
                            <td className="text-center py-2 px-0.5">
                              <span className="text-[10px] font-bold text-primary">
                                {item.totalPoints}
                              </span>
                            </td>
                            <td className="py-2 px-0.5">
                              {expandedRows.has(item.id) ? (
                                <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </td>
                          </tr>
                          {expandedRows.has(item.id) && (
                            <tr className={cn(
                              "border-b",
                              index < 3 && "bg-muted/10"
                            )}>
                              <td colSpan={5} className="py-3 px-2">
                                <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Partidos:</span>
                                      <span className="font-medium">{totalMatches}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">% Victoria:</span>
                                      <span className="font-medium">{winPercentage}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">G. Perdidos:</span>
                                      <span className="font-medium text-muted-foreground">{item.totalGamesLost}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Diferencia:</span>
                                      <span className={cn(
                                        "font-medium",
                                        item.totalGamesWon - item.totalGamesLost > 0 ? "text-green-600" : "text-red-600"
                                      )}>
                                        {item.totalGamesWon - item.totalGamesLost > 0 ? "+" : ""}
                                        {item.totalGamesWon - item.totalGamesLost}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
