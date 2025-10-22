import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TournamentDetail } from "@/components/tournaments/tournament-detail"

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
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
            where: {
              status: "CONFIRMED"
            },
            include: {
              registration1: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
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
        where: {
          status: "CONFIRMED"
        },
        select: {
          id: true,
          name: true,
          status: true,
          categoryId: true,
          registration1: {
            select: {
              registrationStatus: true,
              player: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          registration2: {
            select: {
              registrationStatus: true,
              player: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          category: {
            select: { name: true }
          }
        }
      },
      registrations: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              rankingPoints: true,
              primaryCategory: {
                select: {
                  id: true,
                  name: true,
                  level: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      matches: {
        include: {
          team1: {
            include: {
              registration1: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          },
          team2: {
            include: {
              registration1: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
              },
              registration2: {
                select: {
                  player: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
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

  const { id } = await params
  const tournament = await getTournament(id)

  if (!tournament) {
    notFound()
  }

  // Si es un torneo AMERICANO_SOCIAL, redirigir a la ruta específica
  if (tournament.type === 'AMERICANO_SOCIAL') {
    redirect(`/dashboard/tournaments/${id}/americano-social`)
  }

  return (
    <DashboardLayout>
      <TournamentDetail tournament={tournament as any} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}