'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Calendar,
  Trophy,
  Star,
  UserCheck,
  Users,
  TrendingUp,
  Award,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getCategoryTypeStyle, getCategoryTypeLabel, getTournamentStatusStyle, getTournamentStatusLabel, getCategoryRestrictionsArray, getPlayerStatusStyle, getPlayerStatusLabel } from '@/lib/utils/status-styles'
import { cn } from '@/lib/utils'
import { MatchCard as SharedMatchCard } from '@/components/matches/match-card'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CLUB_ADMIN' | 'PLAYER' | 'REFEREE'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  player?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    dateOfBirth?: string
    gender?: 'MALE' | 'FEMALE' | 'MIXED'
    dominantHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS'
    profileImageUrl?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
    bloodType?: string
    medicalNotes?: string
    rankingPoints: number
    isActive: boolean
    primaryCategory?: {
      id: string
      name: string
      level?: number | null
    }
    rankings: Array<{
      id: string
      currentPoints: number
      seasonYear: number
      category: {
        id: string
        name: string
        description?: string
        type: string
      }
    }>
    teams?: Array<{
      id: string
      name: string | null
      status: string
      tournament: {
        id: string
        name: string
        status: string
        type: string
        tournamentStart?: string
        tournamentEnd?: string
      }
      category: {
        id: string
        name: string
        type: string
        genderRestriction?: string | null
        minAge?: number | null
        maxAge?: number | null
        minRankingPoints?: number | null
        maxRankingPoints?: number | null
      }
      registration1: {
        playerId: string
        player: {
          id: string
          firstName: string
          lastName: string
        }
      }
      registration2: {
        playerId: string
        player: {
          id: string
          firstName: string
          lastName: string
        }
      }
    }>
    tournamentStats: Array<{
      id: string
      matchesPlayed: number
      matchesWon: number
      matchesLost: number
      setsWon: number
      setsLost: number
      gamesWon: number
      gamesLost: number
      tournament: {
        id: string
        name: string
        status: string
      }
    }>
    upcomingMatches?: Array<{
      id: string
      scheduledAt: string | null
      status: string
      phaseType: string
      roundNumber: number | null
      matchNumber: number | null
      tournament: {
        id: string
        name: string
        status: string
        type: string
      }
      category: {
        id: string
        name: string
        type: string
      }
      team1: {
        id: string
        name: string | null
        registration1: {
          player: {
            id: string
            firstName: string
            lastName: string
          }
        }
        registration2: {
          player: {
            id: string
            firstName: string
            lastName: string
          }
        }
      } | null
      team2: {
        id: string
        name: string | null
        registration1: {
          player: {
            id: string
            firstName: string
            lastName: string
          }
        }
        registration2: {
          player: {
            id: string
            firstName: string
            lastName: string
          }
        }
      } | null
      court: {
        id: string
        name: string
        club: {
          id: string
          name: string
        }
      } | null
    }>
  }
  organizerTournaments: Array<{
    id: string
    name: string
    status: string
    type: string
    tournamentStart?: string
    tournamentEnd?: string
    _count: {
      teams: number
    }
  }>
  notifications: Array<{
    id: string
    type: string
    title: string
    message: string
    status: string
    createdAt: string
  }>
}

interface UserDetailProps {
  user: User
}

export function UserDetail({ user }: UserDetailProps) {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // Solo los administradores pueden editar perfiles
  const canEdit = currentUser?.role === 'ADMIN'

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      CLUB_ADMIN: 'secondary',
      REFEREE: 'outline',
      PLAYER: 'default'
    } as const

    const labels = {
      ADMIN: 'Administrador',
      CLUB_ADMIN: 'Admin de Club',
      REFEREE: 'Árbitro',
      PLAYER: 'Jugador'
    }

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'default'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
        {status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
      </Badge>
    )
  }

  const getGenderLabel = (gender?: string) => {
    const labels = {
      MALE: 'Masculino',
      FEMALE: 'Femenino',
      MIXED: 'Mixto'
    }
    return labels[gender as keyof typeof labels] || 'No especificado'
  }

  const getDominantHandLabel = (hand?: string) => {
    const labels = {
      RIGHT: 'Diestro',
      LEFT: 'Zurdo',
      AMBIDEXTROUS: 'Ambidiestro'
    }
    return labels[hand as keyof typeof labels] || 'No especificado'
  }

  const getBloodTypeLabel = (bloodType?: string) => {
    const labels = {
      A_POSITIVE: 'A+',
      A_NEGATIVE: 'A-',
      B_POSITIVE: 'B+',
      B_NEGATIVE: 'B-',
      AB_POSITIVE: 'AB+',
      AB_NEGATIVE: 'AB-',
      O_POSITIVE: 'O+',
      O_NEGATIVE: 'O-'
    }
    return labels[bloodType as keyof typeof labels] || bloodType
  }

  const getUserInitials = () => {
    if (user.player) {
      return `${user.player.firstName[0] || ''}${user.player.lastName[0] || ''}`.toUpperCase()
    }
    return user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const getTeamPartnername = (team: any, currentPlayerId: string) => {
    // Si el jugador actual es player1, el compañero es player2
    if (team.registration1?.playerId === currentPlayerId && team.registration2?.player) {
      return `${team.registration2.player.firstName} ${team.registration2.player.lastName}`
    }
    // Si el jugador actual es player2, el compañero es player1
    if (team.registration2?.playerId === currentPlayerId && team.registration1?.player) {
      return `${team.registration1.player.firstName} ${team.registration1.player.lastName}`
    }
    return 'Sin compañero'
  }



  // Helper para crear badges con estilos unificados
  const getTournamentStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTournamentStatusStyle(status)}>
        {getTournamentStatusLabel(status)}
      </Badge>
    )
  }

  const formatTournamentDates = (start?: string, end?: string) => {
    if (!start && !end) return ''

    const startDate = start ? format(new Date(start), 'dd/MM/yyyy', { locale: es }) : ''
    const endDate = end ? format(new Date(end), 'dd/MM/yyyy', { locale: es }) : ''

    if (startDate && endDate) {
      return `${startDate} - ${endDate}`
    } else if (startDate) {
      return startDate
    } else if (endDate) {
      return endDate
    }
    return ''
  }


  // Calculate overall stats
  const overallStats = user.player?.tournamentStats.reduce(
    (acc, stat) => ({
      matchesPlayed: acc.matchesPlayed + stat.matchesPlayed,
      matchesWon: acc.matchesWon + stat.matchesWon,
      matchesLost: acc.matchesLost + (stat.matchesPlayed - stat.matchesWon),
      setsWon: acc.setsWon + stat.setsWon,
      setsLost: acc.setsLost + stat.setsLost,
      gamesWon: acc.gamesWon + stat.gamesWon,
      gamesLost: acc.gamesLost + stat.gamesLost
    }),
    { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 }
  )

  const winRate = overallStats && overallStats.matchesPlayed > 0
    ? Math.round((overallStats.matchesWon / overallStats.matchesPlayed) * 100)
    : 0

  // Get all teams
  const allTeams = user.player?.teams || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/users')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user.player
                ? `${user.player.firstName} ${user.player.lastName}`
                : user.name
              }
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
        )}
      </div>

      {/* Profile Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto">
              <AvatarImage src={user.player?.profileImageUrl} />
              <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle>
                {user.player
                  ? `${user.player.firstName} ${user.player.lastName}`
                  : user.name
                }
              </CardTitle>
              <div className="flex justify-center space-x-2">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
              {user.player?.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.player.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Registrado: {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
            </div>

            {user.player && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold">Información del Jugador</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado del jugador:</span>
                    <Badge variant="outline" className={getPlayerStatusStyle(user.player.isActive)}>
                      {getPlayerStatusLabel(user.player.isActive)}
                    </Badge>
                  </div>
                  {user.player.dateOfBirth && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fecha de nacimiento:</span>
                      <span className="text-sm">
                        {format(new Date(user.player.dateOfBirth), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Género:</span>
                    <span className="text-sm">{getGenderLabel(user.player.gender)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mano dominante:</span>
                    <span className="text-sm">{getDominantHandLabel(user.player.dominantHand)}</span>
                  </div>
                  {user.player.bloodType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grupo sanguíneo:</span>
                      <span className="text-sm font-medium text-red-600">{getBloodTypeLabel(user.player.bloodType)}</span>
                    </div>
                  )}
                  {(user.player.emergencyContactName || user.player.emergencyContactPhone) && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Contacto de emergencia:</span>
                      <div className="text-sm">
                        {user.player.emergencyContactName && (
                          <div>{user.player.emergencyContactName}</div>
                        )}
                        {user.player.emergencyContactPhone && (
                          <div>{user.player.emergencyContactPhone}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {user.player.medicalNotes && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Información médica:</span>
                      <p className="text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                        {user.player.medicalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="md:col-span-2 space-y-4">
          {user.player && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categoría Principal</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {user.player.primaryCategory ? user.player.primaryCategory.name : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.player.primaryCategory?.level
                      ? `Nivel ${user.player.primaryCategory.level}`
                      : 'Categoría principal del jugador'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Puntos de Ranking</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {user.player?.primaryCategory
                      ? user.player.rankings.find(r => r.category?.id === user.player?.primaryCategory?.id)?.currentPoints || 0
                      : user.player?.rankingPoints
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.player.primaryCategory
                      ? `En ${user.player.primaryCategory.name}`
                      : `${user.player.rankings.length} categorías activas`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Porcentaje de Victoria</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{winRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {overallStats?.matchesWon} victorias de {overallStats?.matchesPlayed} partidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Torneos Activos</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {allTeams.filter(t =>
                      t.tournament.status === 'REGISTRATION_OPEN' ||
                      t.tournament.status === 'IN_PROGRESS'
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {allTeams.length} total de participaciones
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Torneos Organizados</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.organizerTournaments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Como organizador
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList>
          {user.player && (
            <>
              {user.player.upcomingMatches && user.player.upcomingMatches.length > 0 && (
                <TabsTrigger value="matches">Próximos Partidos</TabsTrigger>
              )}
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="teams">Equipos</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            </>
          )}
          {user.organizerTournaments.length > 0 && (
            <TabsTrigger value="organized">Torneos Organizados</TabsTrigger>
          )}
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        </TabsList>

        {user.player && (
          <>
            {user.player.upcomingMatches && user.player.upcomingMatches.length > 0 && (
              <TabsContent value="matches">
                <Card>
                  <CardHeader>
                    <CardTitle>Próximos Partidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.player.upcomingMatches.map((match) => (
                        <SharedMatchCard
                          key={match.id}
                          match={match as any}
                          showTournamentInfo={true}
                          tournament={match.tournament}
                          category={match.category}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="rankings">
              <Card>
                <CardHeader>
                  <CardTitle>Rankings por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.player.rankings.length > 0 ? (
                    <div className="space-y-4">
                      {user.player.rankings.map((ranking) => (
                        <div
                          key={ranking.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium">{ranking.category?.name || 'No especificada'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ranking.category?.description || 'Sin descripción'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{ranking.currentPoints} pts</div>
                            <div className="text-sm text-muted-foreground">
                              Temporada {ranking.seasonYear}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay rankings registrados
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle>Equipos y Participaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  {allTeams.length > 0 ? (
                    <div className="space-y-4">
                      {allTeams.map((team) => (
                        <div
                          key={team.id}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          {/* Línea 1: Torneo - Categoría | Estado del Torneo */}
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-lg">
                              <span className="font-medium">{team.tournament.name}</span> - {team.category.name}
                            </div>
                            {getTournamentStatusBadge(team.tournament.status)}
                          </div>

                          {/* Línea 2: Restricciones de la categoría */}
                          {getCategoryRestrictionsArray(team.category as any).length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {getCategoryRestrictionsArray(team.category as any).map((restriction, index) => (
                                <Badge
                                  key={`${restriction.type}-${index}`}
                                  variant="outline"
                                  className={restriction.style}
                                >
                                  {restriction.label}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Línea 3: Nombre del equipo */}
                          <h4 className="text-md text-muted-foreground">{team.name}</h4>

                          {/* Línea 4: Compañero */}
                          <p className="text-sm text-muted-foreground">
                            Compañero: {user.player && getTeamPartnername(team, user.player.id)}
                          </p>

                          {/* Línea 5: Fechas del torneo */}
                          {formatTournamentDates(team.tournament.tournamentStart, team.tournament.tournamentEnd) && (
                            <p className="text-sm text-muted-foreground">
                              {formatTournamentDates(team.tournament.tournamentStart, team.tournament.tournamentEnd)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay equipos registrados
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas de Torneos</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.player.tournamentStats.length > 0 ? (
                    <div className="space-y-4">
                      {user.player.tournamentStats.map((stat) => (
                        <div
                          key={stat.id}
                          className="p-4 border rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{stat.tournament.name}</h4>
                            </div>
                            {getTournamentStatusBadge(stat.tournament.status)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Partidos</div>
                              <div className="text-muted-foreground">
                                {stat.matchesWon}W - {stat.matchesPlayed - stat.matchesWon}L
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Sets</div>
                              <div className="text-muted-foreground">
                                {stat.setsWon}W - {stat.setsLost}L
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Games</div>
                              <div className="text-muted-foreground">
                                {stat.gamesWon}W - {stat.gamesLost}L
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">% Victoria</div>
                              <div className="text-muted-foreground">
                                {stat.matchesPlayed > 0
                                  ? Math.round((stat.matchesWon / stat.matchesPlayed) * 100)
                                  : 0}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay estadísticas disponibles
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {user.organizerTournaments.length > 0 && (
          <TabsContent value="organized">
            <Card>
              <CardHeader>
                <CardTitle>Torneos Organizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.organizerTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{tournament.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {tournament._count.teams} equipos inscritos
                        </p>
                        {tournament.tournamentStart && (
                          <p className="text-sm text-muted-foreground">
                            Inicio: {format(new Date(tournament.tournamentStart), 'dd/MM/yyyy', { locale: es })}
                          </p>
                        )}
                      </div>
                      {getTournamentStatusBadge(tournament.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {user.notifications.length > 0 ? (
                <div className="space-y-4">
                  {user.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge variant={notification.status === 'SENT' ? 'default' : 'secondary'}>
                          {notification.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay notificaciones
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}