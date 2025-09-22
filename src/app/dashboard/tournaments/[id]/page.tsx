import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentDetail } from "@/components/tournaments/tournament-detail"

interface TournamentDetailPageProps {
  params: { id: string }
}

async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, name: true, email: true }
      },
      mainClub: {
        select: { id: true, name: true, address: true, city: true }
      },
      categories: {
        include: {
          category: true,
          teams: {
            include: {
              player1: {
                select: { firstName: true, lastName: true }
              },
              player2: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      },
      clubs: {
        include: {
          club: {
            select: { id: true, name: true }
          }
        }
      },
      teams: {
        include: {
          player1: {
            select: { firstName: true, lastName: true }
          },
          player2: {
            select: { firstName: true, lastName: true }
          },
          category: {
            select: { name: true }
          }
        }
      },
      matches: {
        include: {
          team1: {
            include: {
              player1: { select: { firstName: true, lastName: true } },
              player2: { select: { firstName: true, lastName: true } }
            }
          },
          team2: {
            include: {
              player1: { select: { firstName: true, lastName: true } },
              player2: { select: { firstName: true, lastName: true } }
            }
          },
          court: {
            select: { name: true }
          }
        }
      },
      _count: {
        select: {
          teams: true,
          matches: true
        }
      }
    }
  })

  return tournament
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const tournament = await getTournament(params.id)

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardLayout>
      <TournamentDetail tournament={tournament} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}