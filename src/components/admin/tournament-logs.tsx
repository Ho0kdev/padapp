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
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TournamentLog {
  id: string
  action: string
  description: string
  tournamentId?: string
  userId: string
  ipAddress?: string
  userAgent?: string
  oldData?: any
  newData?: any
  metadata?: any
  createdAt: string
  user: {
    name: string
    email: string
  }
  tournament?: {
    name: string
  }
}

interface TournamentLogsProps {
  tournamentId?: string // Si se especifica, muestra logs solo de ese torneo
}

const actionIcons: Record<string, any> = {
  TOURNAMENT_CREATED: Trophy,
  TOURNAMENT_UPDATED: Edit,
  TOURNAMENT_DELETED: Trash2,
  TOURNAMENT_STATUS_CHANGED: PlayCircle,
  TEAM_REGISTERED: User,
  TEAM_UNREGISTERED: User,
  MATCH_CREATED: Calendar,
  MATCH_UPDATED: Calendar,
  MATCH_RESULT_ADDED: Calendar,
  USER_ACTION: User,
}

const actionColors: Record<string, string> = {
  TOURNAMENT_CREATED: "bg-green-100 text-green-800",
  TOURNAMENT_UPDATED: "bg-blue-100 text-blue-800",
  TOURNAMENT_DELETED: "bg-red-100 text-red-800",
  TOURNAMENT_STATUS_CHANGED: "bg-orange-100 text-orange-800",
  TEAM_REGISTERED: "bg-purple-100 text-purple-800",
  TEAM_UNREGISTERED: "bg-gray-100 text-gray-800",
  MATCH_CREATED: "bg-cyan-100 text-cyan-800",
  MATCH_UPDATED: "bg-indigo-100 text-indigo-800",
  MATCH_RESULT_ADDED: "bg-emerald-100 text-emerald-800",
  USER_ACTION: "bg-yellow-100 text-yellow-800",
}

const actionLabels: Record<string, string> = {
  TOURNAMENT_CREATED: "Torneo Creado",
  TOURNAMENT_UPDATED: "Torneo Actualizado",
  TOURNAMENT_DELETED: "Torneo Eliminado",
  TOURNAMENT_STATUS_CHANGED: "Estado Cambiado",
  TEAM_REGISTERED: "Equipo Registrado",
  TEAM_UNREGISTERED: "Equipo Des-registrado",
  MATCH_CREATED: "Partido Creado",
  MATCH_UPDATED: "Partido Actualizado",
  MATCH_RESULT_ADDED: "Resultado Agregado",
  USER_ACTION: "Acción de Usuario",
}

export function TournamentLogs({ tournamentId }: TournamentLogsProps) {
  const [logs, setLogs] = useState<TournamentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredLogs, setFilteredLogs] = useState<TournamentLog[]>([])
  const [filters, setFilters] = useState({
    action: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    fetchLogs()
  }, [tournamentId])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const url = tournamentId
        ? `/api/admin/tournaments/${tournamentId}/logs`
        : `/api/admin/tournaments/logs`

      const response = await fetch(url)
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
        log.tournament?.name?.toLowerCase().includes(searchLower)
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getChangedFields = (log: TournamentLog) => {
    if (log.action === "TOURNAMENT_UPDATED" && log.metadata?.changedFields) {
      return log.metadata.changedFields.join(", ")
    }
    return "-"
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
            Historial de Actividad
            {tournamentId && " del Torneo"}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuario</TableHead>
                  {!tournamentId && <TableHead>Torneo</TableHead>}
                  <TableHead>Campos Modificados</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tournamentId ? 6 : 7} className="text-center py-8">
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
                      {!tournamentId && (
                        <TableCell>
                          {log.tournament?.name || "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getChangedFields(log)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Estadísticas resumidas */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {new Set(filteredLogs.map(log => log.tournamentId)).size}
              </div>
              <div className="text-sm text-muted-foreground">Torneos Afectados</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}