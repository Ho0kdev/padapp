import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentsTable } from "@/components/tournaments/tournaments-table"
import { TournamentsHeader } from "@/components/tournaments/tournaments-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function TournamentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <TournamentsHeader />

        <Suspense fallback={<DataTableSkeleton columns={6} rows={5} showHeader={false} />}>
          <TournamentsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}