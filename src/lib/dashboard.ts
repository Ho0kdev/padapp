// src/lib/dashboard.ts
import { prisma } from "@/lib/prisma"
import { TournamentStatus, MatchStatus } from "@prisma/client"

export async function getDashboardStats() {
  try {
    // Test connection first
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection verified');
    // Estadísticas de torneos
    const [
      totalTournaments,
      activeTournaments,
      upcomingTournaments,
      completedTournaments
    ] = await Promise.all([
      prisma.tournament.count(),
      prisma.tournament.count({
        where: {
          status: {
            in: [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION_OPEN]
          }
        }
      }),
      prisma.tournament.count({
        where: {
          status: TournamentStatus.PUBLISHED,
          tournamentStart: {
            gte: new Date()
          }
        }
      }),
      prisma.tournament.count({
        where: {
          status: TournamentStatus.COMPLETED
        }
      })
    ])

    // Estadísticas de jugadores
    const [
      totalPlayers,
      playersThisMonth
    ] = await Promise.all([
      prisma.player.count(),
      prisma.player.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ])

    // Estadísticas de partidos
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7))

    const [
      scheduledToday,
      inProgress,
      completedThisWeek
    ] = await Promise.all([
      prisma.match.count({
        where: {
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.match.count({
        where: {
          status: MatchStatus.IN_PROGRESS
        }
      }),
      prisma.match.count({
        where: {
          status: MatchStatus.COMPLETED,
          updatedAt: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        }
      })
    ])

    // Ingresos (suma de pagos confirmados este mes)
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyRevenue = await prisma.teamPayment.aggregate({
      where: {
        paymentStatus: 'PAID',
        paidAt: {
          gte: currentMonth
        }
      },
      _sum: {
        amount: true
      }
    })

    const pendingPayments = await prisma.teamPayment.aggregate({
      where: {
        paymentStatus: 'PENDING'
      },
      _sum: {
        amount: true
      }
    })

    return {
      tournaments: {
        total: totalTournaments,
        active: activeTournaments,
        upcoming: upcomingTournaments,
        completed: completedTournaments,
      },
      players: {
        total: totalPlayers,
        activeThisMonth: playersThisMonth,
      },
      matches: {
        scheduledToday: scheduledToday,
        inProgress: inProgress,
        completedThisWeek: completedThisWeek,
      },
      revenue: {
        thisMonth: monthlyRevenue._sum.amount || 0,
        pendingPayments: pendingPayments._sum.amount || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw new Error('Failed to fetch dashboard statistics')
  }
}

export async function getRecentTournaments() {
  try {
    const tournaments = await prisma.tournament.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        mainClub: true,
        teams: true,
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    return tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      startDate: tournament.tournamentStart,
      location: tournament.mainClub?.name || 'Multiple venues',
      participants: tournament._count.teams * 2, // 2 jugadores por equipo
      prize: tournament.prizePool,
      registrationEnd: tournament.registrationEnd,
    }))
  } catch (error) {
    console.error('Error fetching recent tournaments:', error)
    throw new Error('Failed to fetch recent tournaments')
  }
}

export async function getRecentActivity() {
  try {
    // Actividad reciente basada en diferentes eventos
    const [
      recentTeams,
      recentTournaments,
      recentMatches,
      recentPayments
    ] = await Promise.all([
      // Equipos registrados recientemente
      prisma.team.findMany({
        take: 3,
        orderBy: { registeredAt: 'desc' },
        include: {
          player1: true,
          player2: true,
          tournament: true,
        }
      }),
      // Torneos creados recientemente
      prisma.tournament.findMany({
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            include: { player: true }
          }
        }
      }),
      // Partidos completados recientemente
      prisma.match.findMany({
        take: 2,
        where: { status: MatchStatus.COMPLETED },
        orderBy: { updatedAt: 'desc' },
        include: {
          team1: {
            include: { player1: true, player2: true }
          },
          team2: {
            include: { player1: true, player2: true }
          },
          winnerTeam: true,
        }
      }),
      // Pagos recientes
      prisma.teamPayment.findMany({
        take: 2,
        where: { paymentStatus: 'PAID' },
        orderBy: { paidAt: 'desc' },
        include: {
          team: {
            include: {
              player1: true,
              tournament: true,
            }
          }
        }
      })
    ])

    const activities = []

    // Procesar equipos registrados
    recentTeams.forEach(team => {
      activities.push({
        id: `team-${team.id}`,
        user: {
          name: `${team.player1.firstName} ${team.player1.lastName}`,
          initials: `${team.player1.firstName[0]}${team.player1.lastName[0]}`
        },
        action: 'se registró en',
        target: team.tournament.name,
        time: formatRelativeTime(team.registeredAt),
        timestamp: team.registeredAt,
      })
    })

    // Procesar torneos creados
    recentTournaments.forEach(tournament => {
      const organizer = tournament.organizer.player
      if (organizer) {
        activities.push({
          id: `tournament-${tournament.id}`,
          user: {
            name: `${organizer.firstName} ${organizer.lastName}`,
            initials: `${organizer.firstName[0]}${organizer.lastName[0]}`
          },
          action: 'creó el torneo',
          target: tournament.name,
          time: formatRelativeTime(tournament.createdAt),
          timestamp: tournament.createdAt,
        })
      }
    })

    // Procesar partidos completados
    recentMatches.forEach(match => {
      if (match.team1 && match.team2 && match.winnerTeam) {
        const winnerName = match.winnerTeam.name || 
          `${match.winnerTeam === match.team1 ? match.team1.player1.firstName : match.team2!.player1.firstName} & ${match.winnerTeam === match.team1 ? match.team1.player2.firstName : match.team2!.player2.firstName}`
        
        activities.push({
          id: `match-${match.id}`,
          user: {
            name: winnerName.split(' & ')[0],
            initials: winnerName.split(' & ')[0].split(' ').map((n: string) => n[0]).join('')
          },
          action: 'ganó el partido contra',
          target: match.winnerTeam === match.team1 ? 
            (match.team2.name || `${match.team2.player1.firstName} & ${match.team2.player2.firstName}`) :
            (match.team1.name || `${match.team1.player1.firstName} & ${match.team1.player2.firstName}`),
          time: formatRelativeTime(match.updatedAt),
          timestamp: match.updatedAt,
        })
      }
    })

    // Procesar pagos
    recentPayments.forEach(payment => {
      if (payment.paidAt) {
        activities.push({
          id: `payment-${payment.id}`,
          user: {
            name: `${payment.team.player1.firstName} ${payment.team.player1.lastName}`,
            initials: `${payment.team.player1.firstName[0]}${payment.team.player1.lastName[0]}`
          },
          action: 'pagó la inscripción para',
          target: payment.team.tournament.name,
          time: formatRelativeTime(payment.paidAt),
          timestamp: payment.paidAt,
        })
      }
    })

    // Ordenar por timestamp y tomar los más recientes
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6)

  } catch (error) {
    console.error('Error fetching recent activity:', error)
    throw new Error('Failed to fetch recent activity')
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'Hace un momento'
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`
  if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`
  if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`
  
  return date.toLocaleDateString()
}