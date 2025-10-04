import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TeamsHeader } from "@/components/teams/teams-header"
import { TeamsTable } from "@/components/teams/teams-table"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function TeamsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <TeamsHeader />

        <Suspense fallback={<DataTableSkeleton columns={5} rows={5} showHeader={false} />}>
          <TeamsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
