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
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Torneos Recientes</CardTitle>
        <CardDescription>
          Últimos torneos creados en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tournaments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay torneos creados aún
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">{tournament.name}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{tournament.startDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{tournament.participants} participantes</span>
                  </div>
                  {tournament.prize > 0 && (
                    <div className="text-green-600 font-medium">
                      ${tournament.prize.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getTournamentStatusBadge(tournament.status)}
                <Button variant="outline" size="sm" asChild>
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