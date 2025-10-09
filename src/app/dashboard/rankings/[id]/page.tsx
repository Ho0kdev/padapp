import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RankingDetail } from "@/components/rankings/ranking-detail"

interface RankingDetailPageProps {
  params: Promise<{ id: string }>
}

async function getRanking(id: string) {
  const ranking = await prisma.playerRanking.findUnique({
    where: { id },
    include: {
      player: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrations: {
            include: {
              tournament: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  tournamentStart: true,
                  tournamentEnd: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      },
      category: {
        include: {
          _count: {
            select: {
              rankings: true
            }
          }
        }
      }
    }
  })

  if (!ranking) return null

  // Serialize dates for client component
  return {
    ...ranking,
    lastUpdated: ranking.lastUpdated.toISOString(),
    player: {
      ...ranking.player,
      registrations: ranking.player.registrations.map(reg => ({
        ...reg,
        tournament: {
          ...reg.tournament,
          tournamentStart: reg.tournament.tournamentStart.toISOString(),
          tournamentEnd: reg.tournament.tournamentEnd ? reg.tournament.tournamentEnd.toISOString() : null
        }
      }))
    }
  }
}

export default async function RankingDetailPage({ params }: RankingDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const ranking = await getRanking(id)

  if (!ranking) {
    notFound()
  }

  return (
    <DashboardLayout>
      <RankingDetail ranking={ranking as any} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}