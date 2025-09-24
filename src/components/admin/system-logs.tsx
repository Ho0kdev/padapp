"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  Clock,
  User,
  Trophy,
  Edit,
  Trash2,
  PlayCircle,
  RefreshCw,
  Search,
  Filter,
  Building2,
  MapPin,
  Tag,
  TrendingUp
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SystemLog {
  id: string
  action: string
  description: string
  userId: string
  ipAddress?: string
  userAgent?: string
  oldData?: any
  newData?: any
  metadata?: any
  createdAt: string
  module?: string
  user: {
    name: string
    email: string
  }
  tournament?: {
    name: string
  }
  club?: {
    name: string
  }
  court?: {
    name: string
  }
  category?: {
    name: string
  }
  player?: {
    firstName: string
    lastName: string
  }
}

const moduleIcons = {
  tournaments: Trophy,
  clubs: Building2,
  courts: MapPin,
  categories: Tag,
  rankings: TrendingUp
}

const moduleLabels = {
  tournaments: "Torneos",
  clubs: "Clubes",
  courts: "Canchas",
  categories: "Categorías",
  rankings: "Rankings"
}

const actionIcons: Record<string, any> = {
  // Torneos
  TOURNAMENT_CREATED: Trophy,
  TOURNAMENT_UPDATED: Edit,
  TOURNAMENT_DELETED: Trash2,
  TOURNAMENT_STATUS_CHANGED: PlayCircle,
  TEAM_REGISTERED: User,
  TEAM_UNREGISTERED: User,
  MATCH_CREATED: Calendar,
  MATCH_UPDATED: Calendar,
  MATCH_RESULT_ADDED: Calendar,

  // Clubes
  CLUB_CREATED: Building2,
  CLUB_UPDATED: Edit,
  CLUB_DELETED: Trash2,
  CLUB_STATUS_CHANGED: PlayCircle,

  // Canchas
  COURT_CREATED: MapPin,
  COURT_UPDATED: Edit,
  COURT_DELETED: Trash2,
  COURT_STATUS_CHANGED: PlayCircle,

  // Categorías
  CATEGORY_CREATED: Tag,
  CATEGORY_UPDATED: Edit,
  CATEGORY_DELETED: Trash2,
  CATEGORY_STATUS_CHANGED: PlayCircle,

  // Rankings
  RANKING_CREATED: TrendingUp,
  RANKING_UPDATED: Edit,
  RANKING_DELETED: Trash2,
  POINTS_UPDATED: TrendingUp,
  POINTS_CALCULATED: Calendar,
  SEASON_UPDATED: Clock,
  MANUAL_ADJUSTMENT: Edit,

  // General
  USER_ACTION: User,
}

const actionColors: Record<string, string> = {
  // Creaciones
  TOURNAMENT_CREATED: "bg-green-100 text-green-800",
  CLUB_CREATED: "bg-green-100 text-green-800",
  COURT_CREATED: "bg-green-100 text-green-800",
  CATEGORY_CREATED: "bg-green-100 text-green-800",
  RANKING_CREATED: "bg-green-100 text-green-800",

  // Actualizaciones
  TOURNAMENT_UPDATED: "bg-blue-100 text-blue-800",
  CLUB_UPDATED: "bg-blue-100 text-blue-800",
  COURT_UPDATED: "bg-blue-100 text-blue-800",
  CATEGORY_UPDATED: "bg-blue-100 text-blue-800",
  RANKING_UPDATED: "bg-blue-100 text-blue-800",

  // Eliminaciones/Desactivaciones
  TOURNAMENT_DELETED: "bg-red-100 text-red-800",
  CLUB_DELETED: "bg-red-100 text-red-800",
  COURT_DELETED: "bg-red-100 text-red-800",
  CATEGORY_DELETED: "bg-red-100 text-red-800",
  RANKING_DELETED: "bg-red-100 text-red-800",

  // Cambios de estado
  TOURNAMENT_STATUS_CHANGED: "bg-orange-100 text-orange-800",
  CLUB_STATUS_CHANGED: "bg-orange-100 text-orange-800",
  COURT_STATUS_CHANGED: "bg-orange-100 text-orange-800",
  CATEGORY_STATUS_CHANGED: "bg-orange-100 text-orange-800",

  // Equipos/Usuarios
  TEAM_REGISTERED: "bg-purple-100 text-purple-800",
  TEAM_UNREGISTERED: "bg-gray-100 text-gray-800",
  USER_ACTION: "bg-yellow-100 text-yellow-800",

  // Partidos
  MATCH_CREATED: "bg-cyan-100 text-cyan-800",
  MATCH_UPDATED: "bg-indigo-100 text-indigo-800",
  MATCH_RESULT_ADDED: "bg-emerald-100 text-emerald-800",

  // Rankings específicos
  POINTS_UPDATED: "bg-blue-100 text-blue-800",
  POINTS_CALCULATED: "bg-green-100 text-green-800",
  SEASON_UPDATED: "bg-orange-100 text-orange-800",
  MANUAL_ADJUSTMENT: "bg-yellow-100 text-yellow-800",
}

const actionLabels: Record<string, string> = {
  // Torneos
  TOURNAMENT_CREATED: "Torneo Creado",
  TOURNAMENT_UPDATED: "Torneo Actualizado",
  TOURNAMENT_DELETED: "Torneo Eliminado",
  TOURNAMENT_STATUS_CHANGED: "Estado de Torneo Cambiado",
  TEAM_REGISTERED: "Equipo Registrado",
  TEAM_UNREGISTERED: "Equipo Des-registrado",
  MATCH_CREATED: "Partido Creado",
  MATCH_UPDATED: "Partido Actualizado",
  MATCH_RESULT_ADDED: "Resultado Agregado",

  // Clubes
  CLUB_CREATED: "Club Creado",
  CLUB_UPDATED: "Club Actualizado",
  CLUB_DELETED: "Club Eliminado",
  CLUB_STATUS_CHANGED: "Estado de Club Cambiado",

  // Canchas
  COURT_CREATED: "Cancha Creada",
  COURT_UPDATED: "Cancha Actualizada",
  COURT_DELETED: "Cancha Eliminada",
  COURT_STATUS_CHANGED: "Estado de Cancha Cambiado",

  // Categorías
  CATEGORY_CREATED: "Categoría Creada",
  CATEGORY_UPDATED: "Categoría Actualizada",
  CATEGORY_DELETED: "Categoría Desactivada",
  CATEGORY_STATUS_CHANGED: "Estado de Categoría Cambiado",

  // Rankings
  RANKING_CREATED: "Ranking Creado",
  RANKING_UPDATED: "Ranking Actualizado",
  RANKING_DELETED: "Ranking Eliminado",
  POINTS_UPDATED: "Puntos Actualizados",
  POINTS_CALCULATED: "Puntos Calculados",
  SEASON_UPDATED: "Temporada Actualizada",
  MANUAL_ADJUSTMENT: "Ajuste Manual",

  // General
  USER_ACTION: "Acción de Usuario",
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([])
  const [activeModule, setActiveModule] = useState("all")
  const [filters, setFilters] = useState({
    action: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    fetchLogs()
  }, [activeModule])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/logs?module=${activeModule}&limit=200`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Filtrar por acción
    if (filters.action !== "all") {
      filtered = filtered.filter(log => log.action === filters.action)
    }

    // Filtrar por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchLower) ||
        log.user.name.toLowerCase().includes(searchLower) ||
        log.tournament?.name?.toLowerCase().includes(searchLower) ||
        log.club?.name?.toLowerCase().includes(searchLower) ||
        log.court?.name?.toLowerCase().includes(searchLower) ||
        log.category?.name?.toLowerCase().includes(searchLower) ||
        `${log.player?.firstName} ${log.player?.lastName}`.toLowerCase().includes(searchLower)
      )
    }

    // Filtrar por fecha
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(log => new Date(log.createdAt) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // Incluir todo el día
      filtered = filtered.filter(log => new Date(log.createdAt) <= toDate)
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || Calendar
    return <Icon className="h-4 w-4" />
  }

  const getModuleIcon = (module: string) => {
    const Icon = moduleIcons[module as keyof typeof moduleIcons] || Calendar
    return <Icon className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getChangedFields = (log: SystemLog) => {
    if (log.action.includes("UPDATED") && log.metadata?.changedFields) {
      return log.metadata.changedFields.join(", ")
    }
    return "-"
  }

  const getEntityName = (log: SystemLog) => {
    return log.tournament?.name ||
           log.club?.name ||
           log.court?.name ||
           log.category?.name ||
           (log.player ? `${log.player.firstName} ${log.player.lastName}` : null) ||
           "-"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando logs...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Logs del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs por módulo */}
          <Tabs value={activeModule} onValueChange={setActiveModule} className="mb-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Torneos
              </TabsTrigger>
              <TabsTrigger value="clubs" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clubes
              </TabsTrigger>
              <TabsTrigger value="courts" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Canchas
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorías
              </TabsTrigger>
              <TabsTrigger value="rankings" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Rankings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar en descripción, usuario..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action">Acción</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Fecha Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Fecha Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          {/* Tabla de logs */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Campos Modificados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No se encontraron logs con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.module && (
                          <div className="flex items-center gap-2">
                            {getModuleIcon(log.module)}
                            <Badge variant="outline">
                              {moduleLabels[log.module as keyof typeof moduleLabels]}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant="outline" className={actionColors[log.action]}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={log.description}>
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user.name}</span>
                          <span className="text-xs text-muted-foreground">{log.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEntityName(log)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getChangedFields(log)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Estadísticas resumidas */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredLogs.length}</div>
              <div className="text-sm text-muted-foreground">Total de Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(filteredLogs.map(log => log.userId)).size}
              </div>
              <div className="text-sm text-muted-foreground">Usuarios Únicos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(filteredLogs.map(log => log.module)).size - (filteredLogs.some(log => !log.module) ? 1 : 0)}
              </div>
              <div className="text-sm text-muted-foreground">Módulos Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(filteredLogs.map(log => log.action)).size}
              </div>
              <div className="text-sm text-muted-foreground">Tipos de Acción</div>
            </div>
          </div>

          {/* Botón para refrescar */}
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}