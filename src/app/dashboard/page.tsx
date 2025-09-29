import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCardsReal } from "@/components/dashboard/stats-cards-real"
import { RecentTournamentsReal } from "@/components/dashboard/recent-tournaments-real"
import { ActivityFeedReal } from "@/components/dashboard/activity-feed-real"
import { getDashboardStats, getRecentTournaments, getRecentActivity } from "@/lib/dashboard"

export default async function DashboardPage() {
  try {
    const [stats, tournaments, activities] = await Promise.all([
      getDashboardStats(),
      getRecentTournaments(),
      getRecentActivity(),
    ])

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Resumen de la actividad de torneos y gestión del sistema
            </p>
          </div>

          <StatsCardsReal stats={stats} />

          <div className="grid gap-4 md:grid-cols-4">
            <RecentTournamentsReal tournaments={tournaments} />
            <ActivityFeedReal activities={activities} />
          </div>
        </div>
      </DashboardLayout>
    )
  } catch (error) {
    console.error('Error loading dashboard:', error)
    
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600">Error al cargar el dashboard</h3>
            <p className="text-muted-foreground">Por favor, recarga la página</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
}