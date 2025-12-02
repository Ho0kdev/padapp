import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AmericanoSocialDetail } from "@/components/tournaments/americano-social/americano-social-detail"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Forzar que esta página siempre se ejecute en el servidor sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoryId?: string }>
}

export default async function AmericanoSocialPage({
  params,
  searchParams
}: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const { id } = await params
  const { categoryId: categoryIdParam } = await searchParams

  // Verificar que el torneo existe y es AMERICANO_SOCIAL
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      status: true,
      visibility: true,
      registrationStart: true,
      registrationEnd: true,
      tournamentStart: true,
      tournamentEnd: true,
      maxParticipants: true,
      minParticipants: true,
      registrationFee: true,
      prizePool: true,
      rankingPoints: true,
      setsToWin: true,
      gamesToWinSet: true,
      tiebreakAt: true,
      goldenPoint: true,
      americanoRounds: true,
      organizerId: true,
      mainClubId: true,
      rules: true,
      prizesDescription: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
      organizer: {
        select: { id: true, name: true, email: true }
      },
      mainClub: {
        select: { id: true, name: true, city: true }
      },
      categories: {
        include: {
          category: true
        }
      },
      clubs: {
        include: {
          club: true
        }
      }
    }
  })

  if (!tournament) {
    redirect("/dashboard/tournaments")
  }

  if (tournament.type !== "AMERICANO_SOCIAL") {
    redirect(`/dashboard/tournaments/${id}`)
  }

  const categoryId = categoryIdParam || tournament.categories[0]?.categoryId

  if (!categoryId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Americano Social</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay categorías configuradas para este torneo.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<AmericanoSocialSkeleton />}>
        <AmericanoSocialDetail
          tournament={tournament}
          categoryId={categoryId}
          currentUserId={session.user.id}
        />
      </Suspense>
    </DashboardLayout>
  )
}

function AmericanoSocialSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>

      <Skeleton className="h-64 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
