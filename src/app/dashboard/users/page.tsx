import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UsersTable } from "@/components/users/users-table"
import { UsersHeader } from "@/components/users/users-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UsersHeader />

        <Suspense fallback={<DataTableSkeleton columns={10} rows={5} showHeader={false} />}>
          <UsersTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}