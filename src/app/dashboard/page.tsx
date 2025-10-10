import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCardsReal } from "@/components/dashboard/stats-cards-real"
import { RecentTournamentsReal } from "@/components/dashboard/recent-tournaments-real"
import { ActivityFeedReal } from "@/components/dashboard/activity-feed-real"
import { getDashboardStats, getRecentTournaments, getRecentActivity } from "@/lib/dashboard"

export default async function DashboardPage() {
  try {
    console.log('[DashboardPage] Starting to load dashboard...');
    const [stats, tournaments, activities] = await Promise.all([
      getDashboardStats(),
      getRecentTournaments(),
      getRecentActivity(),
    ])
    console.log('[DashboardPage] All data loaded successfully');

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('Dashboard error details:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    })

    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-red-600">Error al cargar el dashboard</h3>
            <p className="text-muted-foreground">Por favor, recarga la página</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-left bg-gray-100 p-4 rounded max-w-2xl mx-auto">
                <p className="font-mono text-red-600">{errorMessage}</p>
                {errorStack && <pre className="mt-2 text-gray-600 overflow-auto">{errorStack}</pre>}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    )
  }
}