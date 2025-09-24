import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RankingsTable } from "@/components/rankings/rankings-table"
import { RankingsHeader } from "@/components/rankings/rankings-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function RankingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <RankingsHeader />

        <Suspense fallback={<DataTableSkeleton columns={6} rows={5} showHeader={false} />}>
          <RankingsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}