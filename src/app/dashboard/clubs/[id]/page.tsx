import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubDetail } from "@/components/clubs/club-detail"

async function getClub(id: string) {
  try {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            surface: true,
            status: true
          }
        },
        tournaments: {
          where: {
            status: {
              in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
            }
          },
          select: {
            id: true,
            name: true,
            status: true,
            tournamentStart: true
          },
          orderBy: { tournamentStart: 'desc' },
          take: 10
        },
        _count: {
          select: {
            courts: true,
            tournaments: {
              where: {
                status: {
                  in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
                }
              }
            },
            tournamentClubs: {
              where: {
                tournament: {
                  status: {
                    in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
                  },
                  mainClubId: {
                    not: id
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!club) {
      return null
    }

    // Obtener torneos donde participa como sede auxiliar
    const auxiliaryTournaments = await prisma.tournamentClub.findMany({
      where: {
        clubId: id,
        tournament: {
          status: {
            in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
          },
          mainClubId: {
            not: id
          }
        }
      },
      select: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            tournamentStart: true,
            mainClub: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        tournament: {
          tournamentStart: 'desc'
        }
      },
      take: 10
    })

    // Combinar la información
    return {
      ...club,
      auxiliaryTournaments: auxiliaryTournaments.map(at => ({
        ...at.tournament,
        mainClubName: at.tournament.mainClub?.name || 'Desconocido'
      }))
    }
  } catch (error) {
    console.error('Error fetching club:', error)
    return null
  }
}

interface ClubDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const club = await getClub(id)

  if (!club) {
    notFound()
  }

  return (
    <DashboardLayout>
      <ClubDetail club={club} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}