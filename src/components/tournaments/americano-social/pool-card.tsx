"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Users, Trophy, MapPin, Printer } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AmericanoMatchResultDialog } from "./americano-match-result-dialog"
import { AmericanoMatchCard } from "./americano-match-card"
import { AmericanoMatchScheduleDialog } from "./americano-match-schedule-dialog"

interface PoolCardProps {
  pool: any
  tournament?: any
  category?: any
  onMatchUpdate: () => void
  hasPreviousRoundsIncomplete?: boolean
}

export function PoolCard({ pool, tournament, category, onMatchUpdate, hasPreviousRoundsIncomplete = false }: PoolCardProps) {
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [matchToSchedule, setMatchToSchedule] = useState<any>(null)
  const [matchToStart, setMatchToStart] = useState<any>(null)

  const handlePrint = async () => {
    if (!tournament || !category) return

    try {
      // Importar jsPDF dinámicamente (solo en el cliente)
      const { jsPDF } = await import('jspdf')

      // Crear PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Header - Torneo
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text(tournament.name, 20, 20)

      // Header - Pool
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text(pool.name, 20, 30)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.text(`Ronda ${pool.roundNumber}`, 20, 40)

      // Cancha (si existe)
      if (pool.court) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`Cancha: ${pool.court.name}`, 20, 48)
      }

      // Línea separadora
      doc.setLineWidth(0.5)
      doc.line(20, pool.court ? 52 : 45, 190, pool.court ? 52 : 45)

      // Jugadores
      let yPos = pool.court ? 60 : 55
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Jugadores', 20, yPos)
      yPos += 3
      doc.setLineWidth(1)
      doc.line(20, yPos, 100, yPos)
      yPos += 8

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      pool.players.forEach((p: any) => {
        doc.text(`${p.player.firstName} ${p.player.lastName}`, 20, yPos)
        yPos += 7
      })

      // Partidos
      yPos += 5
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Partidos', 20, yPos)
      yPos += 3
      doc.setLineWidth(1)
      doc.line(20, yPos, 100, yPos)
      yPos += 10

      pool.matches.forEach((match: any, idx: number) => {
        // Título del partido
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Partido ${idx + 1}`, 20, yPos)

        // Fecha/hora programada (si existe)
        if (match.scheduledFor) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          const scheduledDate = typeof match.scheduledFor === 'string'
            ? new Date(match.scheduledFor)
            : match.scheduledFor
          const dateText = format(scheduledDate, "dd/MM/yyyy HH:mm", { locale: es })
          doc.text(dateText, 70, yPos)
        }

        yPos += 7

        // Equipo 1
        doc.setFont('helvetica', 'normal')
        const team1Text = `${match.player1.firstName} ${match.player1.lastName} / ${match.player2.firstName} ${match.player2.lastName}`
        doc.text(team1Text, 25, yPos)

        // Recuadro para resultado equipo 1
        doc.setLineWidth(0.5)
        doc.rect(160, yPos - 5, 25, 10)

        yPos += 8

        // Equipo 2
        const team2Text = `${match.player3.firstName} ${match.player3.lastName} / ${match.player4.firstName} ${match.player4.lastName}`
        doc.text(team2Text, 25, yPos)

        // Recuadro para resultado equipo 2
        doc.rect(160, yPos - 5, 25, 10)

        yPos += 12

        // Línea divisoria entre partidos
        if (idx < pool.matches.length - 1) {
          doc.setLineWidth(0.2)
          doc.line(20, yPos, 190, yPos)
          yPos += 5
        }
      })

      // Descargar el PDF
      doc.save(`planilla-${pool.name.replace(/\s+/g, '-')}.pdf`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar la planilla PDF')
    }
  }

  const handleStartMatch = async () => {
    if (!matchToStart) return

    try {
      const response = await fetch(`/api/americano-matches/${matchToStart.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      })

      if (!response.ok) {
        throw new Error('Error al iniciar el partido')
      }

      setMatchToStart(null)
      onMatchUpdate()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al iniciar el partido')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
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
            </div>
            {tournament && category && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="ml-2"
                title="Imprimir planilla del pool"
              >
                <Printer className="h-4 w-4" />
              </Button>
            )}
          </div>
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
              {pool.matches.map((match: any, index: number) => (
                <AmericanoMatchCard
                  key={match.id}
                  match={match}
                  canManage={true}
                  onLoadResult={() => setSelectedMatch(match)}
                  onSchedule={() => setMatchToSchedule(match)}
                  onStartMatch={() => setMatchToStart(match)}
                  poolCourt={pool.court}
                  hasPreviousRoundsIncomplete={hasPreviousRoundsIncomplete}
                  matchNumber={index + 1}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <AmericanoMatchResultDialog
          match={selectedMatch}
          tournament={pool.tournament}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onSuccess={() => {
            setSelectedMatch(null)
            onMatchUpdate()
          }}
        />
      )}

      {matchToSchedule && (
        <AmericanoMatchScheduleDialog
          match={matchToSchedule}
          open={!!matchToSchedule}
          onOpenChange={(open) => !open && setMatchToSchedule(null)}
          onSuccess={() => {
            setMatchToSchedule(null)
            onMatchUpdate()
          }}
          poolName={pool.name}
          tournamentName={tournament?.name}
        />
      )}

      <AlertDialog open={!!matchToStart} onOpenChange={(open) => !open && setMatchToStart(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Iniciar partido?</AlertDialogTitle>
            <AlertDialogDescription>
              El partido cambiará su estado a "En Progreso". ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartMatch}>
              Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  )
}
