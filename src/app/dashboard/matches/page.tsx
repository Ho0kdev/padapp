import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MatchesTable } from "@/components/matches/matches-table"
import { MatchesHeader } from "@/components/matches/matches-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function MatchesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MatchesHeader />

        <Suspense fallback={<DataTableSkeleton columns={7} rows={5} showHeader={false} />}>
          <MatchesTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
