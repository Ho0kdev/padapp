import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CourtDetail } from "@/components/courts/court-detail"

interface PageProps {
  params: Promise<{
    id: string
    courtId: string
  }>
}

async function getCourt(clubId: string, courtId: string) {
  try {
    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
        clubId
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        matches: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            tournament: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            team1: {
              select: {
                id: true,
                name: true,
                player1: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                player2: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            team2: {
              select: {
                id: true,
                name: true,
                player1: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                player2: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            winnerTeam: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            scheduledAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            matches: true
          }
        }
      }
    })

    return court
  } catch (error) {
    console.error("Error fetching court:", error)
    return null
  }
}

export default async function CourtDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const { id: clubId, courtId } = await params
  const court = await getCourt(clubId, courtId)

  if (!court || !court.club) {
    redirect("/dashboard/clubs")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <CourtDetail court={court} currentUserId={session.user.id} />
      </div>
    </DashboardLayout>
  )
}