import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AmericanoMatchDetail } from "@/components/matches/americano-match-detail"

interface AmericanoMatchDetailPageProps {
  params: Promise<{ id: string }>
}

async function getMatch(id: string) {
  const match = await prisma.americanoPoolMatch.findUnique({
    where: { id },
    include: {
      pool: {
        select: {
          id: true,
          name: true,
          poolNumber: true,
          roundNumber: true
        }
      },
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
          setsToWin: true,
          gamesToWinSet: true,
          tiebreakAt: true,
          goldenPoint: true,
          organizerId: true
        }
      },
      player1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          rankingPoints: true,
          gender: true,
          primaryCategoryId: true,
          primaryCategory: {
            select: {
              name: true,
              level: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      },
      player2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          rankingPoints: true,
          gender: true,
          primaryCategoryId: true,
          primaryCategory: {
            select: {
              name: true,
              level: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      },
      player3: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          rankingPoints: true,
          gender: true,
          primaryCategoryId: true,
          primaryCategory: {
            select: {
              name: true,
              level: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      },
      player4: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          rankingPoints: true,
          gender: true,
          primaryCategoryId: true,
          primaryCategory: {
            select: {
              name: true,
              level: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      },
      sets: {
        orderBy: {
          setNumber: 'asc'
        }
      }
    }
  })

  return match
}

export default async function AmericanoMatchDetailPage({ params }: AmericanoMatchDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const match = await getMatch(id)

  if (!match) {
    notFound()
  }

  return (
    <DashboardLayout>
      <AmericanoMatchDetail match={match as any} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}
