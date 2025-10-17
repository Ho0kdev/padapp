import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorize, handleAuthError, Action, Resource } from '@/lib/rbac'
import { UserStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Solo admins pueden ver estadísticas de usuarios
    await authorize(Action.READ, Resource.DASHBOARD, undefined, request)

    // Get basic user stats
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({
      where: { status: UserStatus.ACTIVE }
    })
    const inactiveUsers = await prisma.user.count({
      where: { status: UserStatus.INACTIVE }
    })

    // Get user role distribution
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    // Get player gender distribution
    const genderStats = await prisma.player.groupBy({
      by: ['gender'],
      _count: {
        gender: true
      }
    })

    // Get users created per month (last 12 months)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const monthlySignups = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneYearAgo
        }
      },
      select: {
        createdAt: true
      }
    })

    // Group by month
    const signupsByMonth = monthlySignups.reduce((acc: any, user) => {
      const month = user.createdAt.toISOString().substring(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // Get top players by ranking points
    const topPlayers = await prisma.player.findMany({
      take: 10,
      orderBy: {
        rankingPoints: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Get recent registrations
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            rankingPoints: true
          }
        }
      }
    })

    // Get users with most tournament participations
    const activePlayers = await prisma.player.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        registrations: {
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
    })

    const playersWithTournamentCount = activePlayers.map(player => {
      const tournaments = new Set(
        player.registrations.map(r => r.tournament.id)
      )

      return {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        user: player.user,
        tournamentCount: tournaments.size,
        rankingPoints: player.rankingPoints
      }
    }).sort((a, b) => b.tournamentCount - a.tournamentCount).slice(0, 10)

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalPlayers: await prisma.player.count(),
        avgRankingPoints: await prisma.player.aggregate({
          _avg: {
            rankingPoints: true
          }
        }).then(result => Math.round(result._avg.rankingPoints || 0))
      },
      distribution: {
        byRole: roleStats.reduce((acc: any, stat) => {
          acc[stat.role] = stat._count.role
          return acc
        }, {}),
        byGender: genderStats.reduce((acc: any, stat) => {
          acc[stat.gender || 'unknown'] = stat._count.gender
          return acc
        }, {}),
        byStatus: {
          ACTIVE: activeUsers,
          INACTIVE: inactiveUsers
        }
      },
      trends: {
        signupsByMonth,
        recentUsers: recentUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          playerInfo: user.player
        }))
      },
      rankings: {
        topPlayers: topPlayers.map(player => ({
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          user: player.user,
          rankingPoints: player.rankingPoints
        })),
        mostActivePlayers: playersWithTournamentCount
      }
    }

    return NextResponse.json(stats)

  } catch (error) {
    return handleAuthError(error, request)
  }
}