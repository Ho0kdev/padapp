"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"
import {
  Trophy,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  History
} from "lucide-react"
import { SystemLogs } from "./system-logs"
import { tournamentStatusOptions, tournamentTypeOptions, tournamentVisibilityOptions } from "@/lib/validations/tournament"

interface AdminTournamentsDashboardProps {
  stats: {
    overview: {
      total: number
      active: number
      completed: number
      cancelled: number
      avgTeamsPerTournament: number
    }
    statusStats: Array<{ status: string; count: number }>
    typeStats: Array<{ type: string; count: number }>
    visibilityStats: Array<{ visibility: string; count: number }>
    monthlyStats: Record<string, Record<string, number>>
    topOrganizers: Array<{
      organizerId: string
      _count: { id: number }
      organizer: { name: string | null; email: string } | null
    }>
    tournamentsNeedingUpdate: Array<{
      id: string
      name: string
      status: string
      suggestedStatus: string
      reason: string
    }>
  }
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
]

const statusColors: Record<string, string> = {
  DRAFT: "#6B7280",
  PUBLISHED: "#3B82F6",
  REGISTRATION_OPEN: "#10B981",
  REGISTRATION_CLOSED: "#F59E0B",
  IN_PROGRESS: "#F97316",
  COMPLETED: "#8B5CF6",
  CANCELLED: "#EF4444",
}

export function AdminTournamentsDashboard({ stats }: AdminTournamentsDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview")

  const statusStatsWithLabels = stats.statusStats.map(stat => {
    const statusOption = tournamentStatusOptions.find(s => s.value === stat.status)
    return {
      ...stat,
      label: statusOption?.label || stat.status,
      color: statusColors[stat.status] || "#6B7280"
    }
  })

  const typeStatsWithLabels = stats.typeStats.map(stat => {
    const typeOption = tournamentTypeOptions.find(t => t.value === stat.type)
    return {
      ...stat,
      label: typeOption?.label || stat.type
    }
  })

  const visibilityStatsWithLabels = stats.visibilityStats.map(stat => {
    const visibilityOption = tournamentVisibilityOptions.find(v => v.value === stat.visibility)
    return {
      ...stat,
      label: visibilityOption?.label || stat.visibility
    }
  })

  // Procesar datos mensuales para gráfico
  const monthlyChartData = Object.entries(stats.monthlyStats).map(([month, statuses]) => ({
    month,
    ...statuses,
    total: Object.values(statuses).reduce((sum, count) => sum + count, 0)
  })).sort((a, b) => a.month.localeCompare(b.month))

  const completionRate = stats.overview.total > 0
    ? Math.round((stats.overview.completed / stats.overview.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Métricas Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Torneos</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.active} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Equipos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.avgTeamsPerTournament}</div>
            <p className="text-xs text-muted-foreground">
              por torneo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requieren Atención</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tournamentsNeedingUpdate.length}</div>
            <p className="text-xs text-muted-foreground">
              actualizaciones pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con diferentes vistas */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="status">Estados</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="attention">Atención</TabsTrigger>
          <TabsTrigger value="system-logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de tipos de torneo */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Torneo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeStatsWithLabels}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {typeStatsWithLabels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de visibilidad */}
            <Card>
              <CardHeader>
                <CardTitle>Visibilidad</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={visibilityStatsWithLabels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Organizadores */}
          <Card>
            <CardHeader>
              <CardTitle>Top Organizadores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Torneos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topOrganizers.map((org, index) => (
                    <TableRow key={org.organizerId}>
                      <TableCell className="font-medium">
                        {org.organizer?.name || "Usuario desconocido"}
                      </TableCell>
                      <TableCell>{org.organizer?.email || "N/A"}</TableCell>
                      <TableCell className="text-right">{org._count.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de estados */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={statusStatsWithLabels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#8884d8"
                    >
                      {statusStatsWithLabels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detalles por estado */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusStatsWithLabels.map((stat) => (
                    <div key={stat.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="font-medium">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{stat.count}</span>
                        <span className="text-sm text-muted-foreground">
                          ({Math.round((stat.count / stats.overview.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales (Últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    name="Total Creados"
                    strokeWidth={3}
                  />
                  {['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED'].map((status, index) => (
                    <Line
                      key={status}
                      type="monotone"
                      dataKey={status}
                      stroke={statusColors[status]}
                      name={tournamentStatusOptions.find(s => s.value === status)?.label || status}
                      strokeDasharray="5 5"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Torneos que Requieren Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.tournamentsNeedingUpdate.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">¡Todo está al día!</p>
                  <p className="text-muted-foreground">No hay torneos que requieran actualización automática</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Torneo</TableHead>
                      <TableHead>Estado Actual</TableHead>
                      <TableHead>Estado Sugerido</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.tournamentsNeedingUpdate.map((tournament) => (
                      <TableRow key={tournament.id}>
                        <TableCell className="font-medium">{tournament.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tournamentStatusOptions.find(s => s.value === tournament.status)?.label || tournament.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>
                            {tournamentStatusOptions.find(s => s.value === tournament.suggestedStatus)?.label || tournament.suggestedStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tournament.reason}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Actualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-logs" className="space-y-6">
          <SystemLogs />
        </TabsContent>
      </Tabs>
    </div>
  )
}