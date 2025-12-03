import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MatchesHeader } from "@/components/matches/matches-header"
import { MatchesTable } from "@/components/matches/matches-table"

export default function MatchesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MatchesHeader />
        <MatchesTable />
      </div>
    </DashboardLayout>
  )
}
