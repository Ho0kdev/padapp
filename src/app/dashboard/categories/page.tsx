import { Suspense } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CategoriesTable } from "@/components/categories/categories-table"
import { CategoriesHeader } from "@/components/categories/categories-header"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default function CategoriesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <CategoriesHeader />

        <Suspense fallback={<DataTableSkeleton columns={6} rows={5} showHeader={false} />}>
          <CategoriesTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}