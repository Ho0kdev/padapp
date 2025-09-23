import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubsHeader } from "@/components/clubs/clubs-header"
import { ClubsTable } from "@/components/clubs/clubs-table"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

export default async function ClubsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ClubsHeader />

        <Suspense fallback={<DataTableSkeleton columns={6} rows={5} showHeader={false} />}>
          <ClubsTable />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}