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
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'ORGANIZER' | 'PLAYER'
  status: 'ACTIVE' | 'INACTIVE'
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
    medicalNotes?: string
    rankingPoints: number
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
    team1Memberships: Array<{
      id: string
      name: string
      registrationStatus: string
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
      }
      player2: {
        id: string
        firstName: string
        lastName: string
      }
    }>
    team2Memberships: Array<{
      id: string
      name: string
      registrationStatus: string
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
      }
      player1: {
        id: string
        firstName: string
        lastName: string
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
      category: {
        id: string
        name: string
      }
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

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      ORGANIZER: 'secondary',
      PLAYER: 'default'
    } as const

    const labels = {
      ADMIN: 'Administrador',
      ORGANIZER: 'Organizador',
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

  const getUserInitials = () => {
    if (user.player) {
      return `${user.player.firstName[0] || ''}${user.player.lastName[0] || ''}`.toUpperCase()
    }
    return user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const getTeamPartnername = (team: any) => {
    if (team.player1) {
      return `${team.player1.firstName} ${team.player1.lastName}`
    }
    if (team.player2) {
      return `${team.player2.firstName} ${team.player2.lastName}`
    }
    return 'Sin compañero'
  }

  const getTournamentStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'secondary',
      PUBLISHED: 'outline',
      REGISTRATION_OPEN: 'default',
      REGISTRATION_CLOSED: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'secondary',
      CANCELLED: 'destructive'
    } as const

    return colors[status as keyof typeof colors] || 'outline'
  }

  const getTournamentStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'Borrador',
      PUBLISHED: 'Publicado',
      REGISTRATION_OPEN: 'Inscripción Abierta',
      REGISTRATION_CLOSED: 'Inscripción Cerrada',
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado'
    }
    return labels[status as keyof typeof labels] || status
  }

  // Calculate overall stats
  const overallStats = user.player?.tournamentStats.reduce(
    (acc, stat) => ({
      matchesPlayed: acc.matchesPlayed + stat.matchesPlayed,
      matchesWon: acc.matchesWon + stat.matchesWon,
      matchesLost: acc.matchesLost + stat.matchesLost,
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
  const allTeams = [
    ...(user.player?.team1Memberships || []),
    ...(user.player?.team2Memberships || [])
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
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
        <Button onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar Perfil
        </Button>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="md:col-span-2 space-y-4">
          {user.player && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Puntos de Ranking</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.player.rankingPoints}</div>
                  <p className="text-xs text-muted-foreground">
                    {user.player.rankings.length} categorías activas
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
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          {user.player && (
            <>
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
                            <h4 className="font-medium">{ranking.category.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ranking.category.description}
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
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{team.name}</h4>
                              <Badge variant="outline">{team.category.name}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Compañero: {getTeamPartnername(team)}
                            </p>
                            <p className="text-sm">
                              Torneo: {team.tournament.name}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={getTournamentStatusColor(team.tournament.status)}>
                              {getTournamentStatusLabel(team.tournament.status)}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {team.registrationStatus}
                            </div>
                          </div>
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
                              <p className="text-sm text-muted-foreground">
                                Categoría: {stat.category.name}
                              </p>
                            </div>
                            <Badge variant={getTournamentStatusColor(stat.tournament.status)}>
                              {getTournamentStatusLabel(stat.tournament.status)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Partidos</div>
                              <div className="text-muted-foreground">
                                {stat.matchesWon}W - {stat.matchesLost}L
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
                      <Badge variant={getTournamentStatusColor(tournament.status)}>
                        {getTournamentStatusLabel(tournament.status)}
                      </Badge>
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