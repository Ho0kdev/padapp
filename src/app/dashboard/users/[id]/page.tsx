import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserDetail } from '@/components/users/user-detail'

interface Props {
  params: Promise<{
    id: string
  }>
}

export const metadata: Metadata = {
  title: 'Perfil de Usuario | PDLShot'
}

export const dynamic = 'force-dynamic'

async function getUser(id: string) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/prisma')

    const session = await getServerSession(authOptions)

    if (!session) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        player: {
          include: {
            primaryCategory: true,
            rankings: {
              include: {
                category: true
              },
              where: {
                seasonYear: new Date().getFullYear(),
                category: {
                  isActive: true
                }
              },
              orderBy: {
                currentPoints: 'desc'
              }
            },
            registrations: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    type: true,
                    tournamentStart: true,
                    tournamentEnd: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    genderRestriction: true,
                    minAge: true,
                    maxAge: true,
                    minRankingPoints: true,
                    maxRankingPoints: true
                  }
                },
                payments: {
                  select: {
                    id: true,
                    amount: true,
                    paymentStatus: true,
                    paymentMethod: true,
                    paidAt: true,
                    createdAt: true
                  },
                  orderBy: {
                    createdAt: 'desc'
                  }
                }
              }
            },
            tournamentStats: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                }
              }
            }
          }
        },
        organizerTournaments: {
          select: {
            id: true,
            name: true,
            status: true,
            type: true,
            tournamentStart: true,
            tournamentEnd: true,
            _count: {
              select: {
                teams: true
              }
            }
          }
        },
        notifications: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    })

    if (!user) {
      return null
    }

    // Check permissions - users can only view their own profile unless admin
    if (session.user.id !== user.id && session.user.role !== 'ADMIN') {
      return null
    }

    // Get teams where the player is either player1 or player2
    let teams: any[] = []
    let upcomingMatches: any[] = []
    let recentMatches: any[] = []
    if (user.player) {
      teams = await prisma.team.findMany({
        where: {
          OR: [
            {
              registration1: {
                playerId: user.player.id
              }
            },
            {
              registration2: {
                playerId: user.player.id
              }
            }
          ]
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
              type: true,
              tournamentStart: true,
              tournamentEnd: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              genderRestriction: true,
              minAge: true,
              maxAge: true,
              minRankingPoints: true,
              maxRankingPoints: true
            }
          },
          registration1: {
            select: {
              playerId: true,
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          registration2: {
            select: {
              playerId: true,
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })

      // Get upcoming matches for the player's teams
      const teamIds = teams.map(team => team.id)
      if (teamIds.length > 0) {
        upcomingMatches = await prisma.match.findMany({
          where: {
            OR: [
              { team1Id: { in: teamIds } },
              { team2Id: { in: teamIds } }
            ],
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            }
          },
          select: {
            id: true,
            matchNumber: true,
            status: true,
            phaseType: true,
            roundNumber: true,
            scheduledAt: true,
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
                type: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                type: true
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
                        lastName: true
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
                        lastName: true
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
                        lastName: true
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
                        lastName: true
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
                    name: true
                  }
                }
              }
            }
          },
          orderBy: [
            { scheduledAt: 'asc' },
            { createdAt: 'asc' }
          ],
          take: 10 // Limit to next 10 matches
        })

        // Get recent completed matches for the player's teams
        recentMatches = await prisma.match.findMany({
          where: {
            OR: [
              { team1Id: { in: teamIds } },
              { team2Id: { in: teamIds } }
            ],
            status: {
              in: ['COMPLETED', 'WALKOVER']
            }
          },
          select: {
            id: true,
            matchNumber: true,
            status: true,
            phaseType: true,
            roundNumber: true,
            scheduledAt: true,
            winnerTeamId: true,
            team1SetsWon: true,
            team2SetsWon: true,
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
                type: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                type: true
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
                        lastName: true
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
                        lastName: true
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
                        lastName: true
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
                        lastName: true
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
                    name: true
                  }
                }
              }
            },
            sets: {
              select: {
                setNumber: true,
                team1Games: true,
                team2Games: true,
                team1TiebreakPoints: true,
                team2TiebreakPoints: true
              },
              orderBy: {
                setNumber: 'asc'
              }
            }
          },
          orderBy: [
            { scheduledAt: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 4 // Limit to last 4 matches
        })
      }
    }

    return {
      ...user,
      player: user.player ? {
        ...user.player,
        teams,
        upcomingMatches,
        recentMatches
      } : undefined
    }

  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export default async function UserPage({ params }: Props) {
  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  return (
    <DashboardLayout>
      <UserDetail user={user as any} />
    </DashboardLayout>
  )
}