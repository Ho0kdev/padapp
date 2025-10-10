// src/lib/dashboard.ts
import { prisma } from "@/lib/prisma"
import { TournamentStatus, MatchStatus } from "@prisma/client"

export async function getDashboardStats() {
  try {
    console.log('[getDashboardStats] Starting...');
    // Test connection first
    await prisma.$queryRaw`SELECT 1`;
    console.log('[getDashboardStats] Database connection verified');
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

    const monthlyRevenue = await prisma.registrationPayment.aggregate({
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

    const pendingPayments = await prisma.registrationPayment.aggregate({
      where: {
        paymentStatus: 'PENDING'
      },
      _sum: {
        amount: true
      }
    })

    const result = {
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
    console.log('[getDashboardStats] Success:', result);
    return result;
  } catch (error) {
    console.error('[getDashboardStats] Error fetching dashboard stats:', error)
    throw new Error('Failed to fetch dashboard statistics')
  }
}

export async function getRecentTournaments() {
  try {
    console.log('[getRecentTournaments] Starting...');
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

    const result = tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      startDate: tournament.tournamentStart,
      location: tournament.mainClub?.name || 'Multiple venues',
      participants: tournament._count.teams * 2, // 2 jugadores por equipo
      prize: tournament.prizePool,
      registrationEnd: tournament.registrationEnd,
    }))
    console.log('[getRecentTournaments] Success, count:', result.length);
    return result;
  } catch (error) {
    console.error('[getRecentTournaments] Error fetching recent tournaments:', error)
    throw new Error('Failed to fetch recent tournaments')
  }
}

export async function getRecentActivity() {
  try {
    console.log('[getRecentActivity] Starting...');
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
        orderBy: { createdAt: 'desc' },
        include: {
          registration1: {
            include: {
              player: true
            }
          },
          registration2: {
            include: {
              player: true
            }
          },
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
            include: {
              registration1: { include: { player: true } },
              registration2: { include: { player: true } }
            }
          },
          team2: {
            include: {
              registration1: { include: { player: true } },
              registration2: { include: { player: true } }
            }
          },
          winnerTeam: true,
        }
      }),
      // Pagos recientes
      prisma.registrationPayment.findMany({
        take: 2,
        where: { paymentStatus: 'PAID' },
        orderBy: { paidAt: 'desc' },
        include: {
          registration: {
            include: {
              player: true,
              tournament: true,
            }
          }
        }
      })
    ])

    const activities: any[] = []

    // Procesar equipos registrados
    recentTeams.forEach(team => {
      const player = team.registration1?.player
      if (player && player.firstName && player.lastName && team.tournament) {
        activities.push({
          id: `team-${team.id}`,
          user: {
            name: `${player.firstName} ${player.lastName}`,
            initials: `${player.firstName[0]}${player.lastName[0]}`
          },
          action: 'formó equipo en',
          target: team.tournament.name,
          time: formatRelativeTime(team.createdAt),
          timestamp: team.createdAt,
        })
      }
    })

    // Procesar torneos creados
    recentTournaments.forEach(tournament => {
      const organizer = tournament.organizer?.player
      if (organizer && organizer.firstName && organizer.lastName) {
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
      if (match.team1 && match.team2 && match.winnerTeam &&
          match.team1.registration1?.player && match.team1.registration2?.player &&
          match.team2.registration1?.player && match.team2.registration2?.player) {

        const winnerTeam = match.winnerTeam === match.team1 ? match.team1 : match.team2
        const loserTeam = match.winnerTeam === match.team1 ? match.team2 : match.team1

        const winnerName = winnerTeam.name ||
          `${winnerTeam.registration1.player.firstName} & ${winnerTeam.registration2.player.firstName}`
        const loserName = loserTeam.name ||
          `${loserTeam.registration1.player.firstName} & ${loserTeam.registration2.player.firstName}`

        const firstPlayerName = winnerName.split(' & ')[0]
        const initials = firstPlayerName.split(' ').map((n: string) => n[0]).join('')

        activities.push({
          id: `match-${match.id}`,
          user: {
            name: firstPlayerName,
            initials: initials || 'XX'
          },
          action: 'ganó el partido contra',
          target: loserName,
          time: formatRelativeTime(match.updatedAt),
          timestamp: match.updatedAt,
        })
      }
    })

    // Procesar pagos
    recentPayments.forEach(payment => {
      const player = payment.registration?.player
      const tournament = payment.registration?.tournament
      if (payment.paidAt && player && player.firstName && player.lastName && tournament) {
        activities.push({
          id: `payment-${payment.id}`,
          user: {
            name: `${player.firstName} ${player.lastName}`,
            initials: `${player.firstName[0]}${player.lastName[0]}`
          },
          action: 'pagó la inscripción para',
          target: tournament.name,
          time: formatRelativeTime(payment.paidAt),
          timestamp: payment.paidAt,
        })
      }
    })

    // Ordenar por timestamp y tomar los más recientes
    const result = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6)

    console.log('[getRecentActivity] Success, activities count:', result.length);
    return result;

  } catch (error) {
    console.error('[getRecentActivity] Error fetching recent activity:', error)
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