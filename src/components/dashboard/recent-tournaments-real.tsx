// src/components/dashboard/recent-tournaments-real.tsx
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users } from "lucide-react"
import { getTournamentStatusStyle, getTournamentStatusLabel } from "@/lib/utils/status-styles"

// Helper function to create tournament status badge with unified styles
const getTournamentStatusBadge = (status: string) => {
  return (
    <Badge variant="outline" className={getTournamentStatusStyle(status)}>
      {getTournamentStatusLabel(status)}
    </Badge>
  )
}

interface Tournament {
  id: string
  name: string
  status: string
  type: string
  startDate: Date
  location: string
  participants: number
  prize: number
  registrationEnd: Date | null
}

interface RecentTournamentsRealProps {
  tournaments: Tournament[]
}

export function RecentTournamentsReal({ tournaments }: RecentTournamentsRealProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Torneos Recientes</CardTitle>
        <CardDescription>
          Últimos torneos creados en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tournaments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
            No hay torneos creados aún
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div key={tournament.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base truncate">{tournament.name}</h4>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{tournament.startDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{tournament.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{tournament.participants} participantes</span>
                  </div>
                  {tournament.prize > 0 && (
                    <div className="text-green-600 font-medium whitespace-nowrap">
                      ${tournament.prize.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                {getTournamentStatusBadge(tournament.status)}
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <Link href={
                    tournament.type === 'AMERICANO_SOCIAL'
                      ? `/dashboard/tournaments/${tournament.id}/americano-social`
                      : `/dashboard/tournaments/${tournament.id}`
                  }>
                    Ver Detalles
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}