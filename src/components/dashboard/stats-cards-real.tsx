// src/components/dashboard/stats-cards-real.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, DollarSign } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend && (
            <span className={`inline-flex items-center ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {trend && ' desde el mes pasado'}
          {!trend && description}
        </p>
      </CardContent>
    </Card>
  )
}

interface StatsCardsProps {
  stats: {
    tournaments: {
      total: number
      active: number
      upcoming: number
      completed: number
    }
    players: {
      total: number
      activeThisMonth: number
    }
    matches: {
      scheduledToday: number
      inProgress: number
      completedThisWeek: number
    }
    revenue: {
      thisMonth: number
      pendingPayments: number
    }
  }
}

export function StatsCardsReal({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Torneos Activos"
        value={stats.tournaments.active}
        description={`${stats.tournaments.total} en total`}
        icon={<Trophy className="h-4 w-4" />}
      />
      <StatsCard
        title="Jugadores Registrados"
        value={stats.players.total.toLocaleString()}
        description={`${stats.players.activeThisMonth} este mes`}
        icon={<Users className="h-4 w-4" />}
      />
      <StatsCard
        title="Partidos Programados"
        value={stats.matches.scheduledToday}
        description={`${stats.matches.completedThisWeek} completados esta semana`}
        icon={<Calendar className="h-4 w-4" />}
      />
      <StatsCard
        title="Ingresos Mensuales"
        value={`$${stats.revenue.thisMonth.toLocaleString()}`}
        description={`$${stats.revenue.pendingPayments.toLocaleString()} pendientes`}
        icon={<DollarSign className="h-4 w-4" />}
      />
    </div>
  )
}