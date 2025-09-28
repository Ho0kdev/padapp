import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserDetail } from '@/components/users/user-detail'

interface Props {
  params: {
    id: string
  }
}

export const metadata: Metadata = {
  title: 'Perfil de Usuario | PadApp'
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
            team1Memberships: {
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
                    type: true
                  }
                },
                player2: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            team2Memberships: {
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
                    type: true
                  }
                },
                player1: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
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

    return user

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
      <UserDetail user={user} />
    </DashboardLayout>
  )
}