import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Trophy, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import {
  getTeamStatusStyle,
  getTeamStatusLabel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  getCategoryLevelStyle,
  formatCategoryLevel,
  getGenderRestrictionStyle,
  getGenderRestrictionLabel
} from "@/lib/utils/status-styles"
import { TeamDetailActions } from "@/components/teams/team-detail-actions"
import { TeamStatusManager } from "@/components/teams/team-status-manager"
import { MatchCard } from "@/components/matches/match-card"

interface TeamDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const { id } = await params

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
          organizerId: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
        }
      },
      registration1: {
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
                  level: true,
                }
              },
              user: {
                select: {
                  id: true,
                  email: true,
                }
              }
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
              paidAt: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      },
      registration2: {
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
                  level: true,
                }
              },
              user: {
                select: {
                  id: true,
                  email: true,
                }
              }
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
              paidAt: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      },
      tournamentCategory: {
        select: {
          registrationFee: true,
          maxTeams: true,
        }
      }
    }
  })

  if (!team) {
    notFound()
  }

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'CLUB_ADMIN'

  // Verificar que el usuario tenga permiso para ver este equipo
  // Admins pueden ver cualquier equipo, jugadores solo pueden ver sus propios equipos
  if (!isAdmin) {
    const isPartOfTeam =
      team.registration1.player.user.id === session.user.id ||
      team.registration2.player.user.id === session.user.id

    if (!isPartOfTeam) {
      redirect("/dashboard")
    }
  }

  // Obtener próximos partidos del equipo
  const upcomingMatches = await prisma.match.findMany({
    where: {
      OR: [
        { team1Id: team.id },
        { team2Id: team.id }
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
      team1: {
        select: {
          id: true,
          name: true,
          registration1: {
            select: {
              player: {
                select: {
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
    take: 10
  })

  // Obtener últimos 4 partidos completados del equipo
  const recentMatches = await prisma.match.findMany({
    where: {
      OR: [
        { team1Id: team.id },
        { team2Id: team.id }
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
      team1: {
        select: {
          id: true,
          name: true,
          registration1: {
            select: {
              player: {
                select: {
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
    take: 4
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/teams">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {team.name || (team.tournament.type === 'AMERICANO_SOCIAL'
                ? `${team.registration1.player.lastName}, ${team.registration1.player.firstName} / ${team.registration2.player.lastName}, ${team.registration2.player.firstName}`
                : `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
              )}
            </h1>
            <p className="text-muted-foreground">
              Detalles del equipo
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <TeamStatusManager
                teamId={team.id}
                currentStatus={team.status}
                tournamentStatus={team.tournament.status}
              />
            ) : (
              <Badge className={getTeamStatusStyle(team.status)}>
                {getTeamStatusLabel(team.status)}
              </Badge>
            )}
            {isAdmin && (
              <TeamDetailActions
                teamId={team.id}
                teamName={team.name || (team.tournament.type === 'AMERICANO_SOCIAL'
                  ? `${team.registration1.player.lastName}, ${team.registration1.player.firstName} / ${team.registration2.player.lastName}, ${team.registration2.player.firstName}`
                  : `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`
                )}
                tournamentStatus={team.tournament.status}
              />
            )}
          </div>
        </div>

        {/* Información del Torneo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Información del Torneo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Torneo</p>
                <Link href={`/dashboard/tournaments/${team.tournament.id}`}>
                  <p className="font-medium hover:underline">{team.tournament.name}</p>
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{team.category.name}</p>
              </div>
              {team.tournamentCategory?.registrationFee && (
                <div>
                  <p className="text-sm text-muted-foreground">Costo de Inscripción (por jugador)</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {team.tournamentCategory.registrationFee}
                  </p>
                </div>
              )}
              {team.seed && (
                <div>
                  <p className="text-sm text-muted-foreground">Semilla (Seed)</p>
                  <p className="font-medium">{team.seed}</p>
                </div>
              )}
            </div>
            {team.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="text-sm mt-1">{team.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de los Jugadores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Jugadores del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Jugador 1 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/dashboard/registrations/${team.registration1.id}`}>
                    <h3 className="font-semibold text-lg hover:underline">
                      {team.registration1.player.firstName} {team.registration1.player.lastName}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">{team.registration1.player.user.email}</p>
                </div>
                <Badge className={getRegistrationStatusStyle(team.registration1.registrationStatus)}>
                  {getRegistrationStatusLabel(team.registration1.registrationStatus)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {team.registration1.player.gender && (
                  <Badge variant="outline" className={getGenderRestrictionStyle(team.registration1.player.gender)}>
                    {getGenderRestrictionLabel(team.registration1.player.gender)}
                  </Badge>
                )}
                <Badge variant="outline">
                  {team.registration1.player.rankingPoints} pts
                </Badge>
                {team.registration1.player.primaryCategory && (
                  <Badge variant="outline" className={getCategoryLevelStyle(team.registration1.player.primaryCategory.level || 10)}>
                    {formatCategoryLevel(team.registration1.player.primaryCategory.name, team.registration1.player.primaryCategory.level || 10)}
                  </Badge>
                )}
              </div>

              {team.registration1.payment && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Estado del Pago</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRegistrationStatusStyle(team.registration1.payment.paymentStatus)}>
                      {team.registration1.payment.paymentStatus}
                    </Badge>
                    {team.registration1.payment.paidAt && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(team.registration1.payment.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Jugador 2 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/dashboard/registrations/${team.registration2.id}`}>
                    <h3 className="font-semibold text-lg hover:underline">
                      {team.registration2.player.firstName} {team.registration2.player.lastName}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">{team.registration2.player.user.email}</p>
                </div>
                <Badge className={getRegistrationStatusStyle(team.registration2.registrationStatus)}>
                  {getRegistrationStatusLabel(team.registration2.registrationStatus)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {team.registration2.player.gender && (
                  <Badge variant="outline" className={getGenderRestrictionStyle(team.registration2.player.gender)}>
                    {getGenderRestrictionLabel(team.registration2.player.gender)}
                  </Badge>
                )}
                <Badge variant="outline">
                  {team.registration2.player.rankingPoints} pts
                </Badge>
                {team.registration2.player.primaryCategory && (
                  <Badge variant="outline" className={getCategoryLevelStyle(team.registration2.player.primaryCategory.level || 10)}>
                    {formatCategoryLevel(team.registration2.player.primaryCategory.name, team.registration2.player.primaryCategory.level || 10)}
                  </Badge>
                )}
              </div>

              {team.registration2.payment && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Estado del Pago</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRegistrationStatusStyle(team.registration2.payment.paymentStatus)}>
                      {team.registration2.payment.paymentStatus}
                    </Badge>
                    {team.registration2.payment.paidAt && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(team.registration2.payment.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Partidos */}
        {(upcomingMatches.length > 0 || recentMatches.length > 0) && (
          <div className="space-y-6">
            {upcomingMatches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Próximos Partidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {upcomingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match as any}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {recentMatches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Últimos 4 Partidos Jugados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match as any}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>ID del Equipo:</span>
              <span className="font-mono">{team.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Creado:</span>
              <span>{new Date(team.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Última actualización:</span>
              <span>{new Date(team.updatedAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
