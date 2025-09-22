import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentsTable } from "@/components/tournaments/tournaments-table"
import { TournamentsHeader } from "@/components/tournaments/tournaments-header"
import { TournamentsTableSkeleton } from "@/components/tournaments/tournaments-table-skeleton"

export default function TournamentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <TournamentsHeader />

        <Suspense fallback={<TournamentsTableSkeleton />}>
          <TournamentsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}