import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationsTable } from "@/components/registrations/registrations-table"
import { RegistrationsHeader } from "@/components/registrations/registrations-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function RegistrationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <RegistrationsHeader />

        <Suspense fallback={<DataTableSkeleton columns={6} rows={5} showHeader={false} />}>
          <RegistrationsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}