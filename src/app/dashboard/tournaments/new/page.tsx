import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentForm } from "@/components/tournaments/tournament-form"

export default function NewTournamentPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Torneo</h1>
          <p className="text-muted-foreground">
            Configure un nuevo torneo con todas sus características
          </p>
        </div>

        <TournamentForm />
      </div>
    </DashboardLayout>
  )
}