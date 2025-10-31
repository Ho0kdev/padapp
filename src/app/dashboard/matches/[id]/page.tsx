import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MatchDetail } from "@/components/matches/match-detail"

// Forzar renderizado dinámico para siempre obtener datos frescos
export const dynamic = 'force-dynamic'

interface MatchPageProps {
  params: Promise<{ id: string }>
}

async function getMatch(id: string) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          setsToWin: true,
          gamesToWinSet: true,
          tiebreakAt: true,
          goldenPoint: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      },
      team1: {
        select: {
          id: true,
          name: true,
          registration1: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rankingPoints: true,
                  rankings: {
                    orderBy: {
                      lastUpdated: 'desc'
                    },
                    take: 1
                  }
                }
              }
            }
          },
          registration2: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rankingPoints: true,
                  rankings: {
                    orderBy: {
                      lastUpdated: 'desc'
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      },
      team2: {
        select: {
          id: true,
          name: true,
          registration1: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rankingPoints: true,
                  rankings: {
                    orderBy: {
                      lastUpdated: 'desc'
                    },
                    take: 1
                  }
                }
              }
            }
          },
          registration2: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  rankingPoints: true,
                  rankings: {
                    orderBy: {
                      lastUpdated: 'desc'
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      },
      court: {
        select: {
          id: true,
          name: true,
          club: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      winnerTeam: {
        select: {
          id: true,
          name: true,
        }
      },
      zone: {
        select: {
          id: true,
          name: true,
        }
      },
      sets: {
        orderBy: {
          setNumber: 'asc'
        },
        include: {
          games: {
            orderBy: {
              gameNumber: 'asc'
            }
          }
        }
      }
    }
  })

  return match
}

export default async function MatchPage({ params }: MatchPageProps) {
  await requireAuth()

  const { id } = await params
  const match = await getMatch(id)

  if (!match) {
    notFound()
  }

  return (
    <DashboardLayout>
      <MatchDetail match={match as any} />
    </DashboardLayout>
  )
}
