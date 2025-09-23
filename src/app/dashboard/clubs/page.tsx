import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubsList } from "@/components/clubs/clubs-list"

export default async function ClubsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clubes</h1>
          <p className="text-muted-foreground">
            Gestiona los clubes de pádel de la plataforma
          </p>
        </div>

        <ClubsList />
      </div>
    </DashboardLayout>
  )
}