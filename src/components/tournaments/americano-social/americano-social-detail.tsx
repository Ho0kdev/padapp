"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Loader2,
  Trophy,
  Users,
  Play,
  Edit,
  Calendar,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Copy,
  Settings,
  Download,
  Trash2,
  AlertTriangle,
  Printer
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TournamentStatusManager } from "../tournament-status-manager"
import { tournamentStatusOptions, tournamentTypeOptions } from "@/lib/validations/tournament"
import { GlobalRankingTable } from "./global-ranking-table"
import { PoolCard } from "./pool-card"
import { CategorySelector } from "./category-selector"
import { AmericanoMatchCard } from "./americano-match-card"
import { AmericanoMatchResultDialog } from "./americano-match-result-dialog"
import { AmericanoPoolsSetup } from "./americano-pools-setup"
import { RegistrationStatusBreakdown } from "../registration-status-breakdown"
import {
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  getGenderRestrictionStyle,
  getGenderRestrictionLabel,
  getCategoryLevelStyle,
  formatCategoryLevel
} from "@/lib/utils/status-styles"

interface AmericanoSocialDetailProps {
  tournament: any
  categoryId: string
  currentUserId: string
}

export function AmericanoSocialDetail({
  tournament,
  categoryId,
  currentUserId
}: AmericanoSocialDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdminOrClubAdmin } = useAuth()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [existingPoolsInfo, setExistingPoolsInfo] = useState<{
    totalPools: number
    totalMatches: number
    completedMatches: number
    numberOfRounds: number
    poolsPerRound: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pools, setPools] = useState<any[]>([])
  const [ranking, setRanking] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [poolsSetupOpen, setPoolsSetupOpen] = useState(false)
  const [categoriesSummary, setCategoriesSummary] = useState<any[]>([])

  const isOwner = tournament.organizerId === currentUserId
  const canManage = isOwner || isAdminOrClubAdmin
  const statusConfig = tournamentStatusOptions.find(s => s.value === tournament.status)
  const typeLabel = tournamentTypeOptions.find(t => t.value === tournament.type)?.label

  useEffect(() => {
    loadData()
    loadRegistrations()
    loadCategoriesSummary()
  }, [categoryId])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tournaments/${tournament.id}/americano-social/pools?categoryId=${categoryId}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error cargando datos")
      }

      const data = await response.json()
      setPools(data.pools || [])
      setRanking(data.ranking || [])
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrations = async () => {
    try {
      // Para Americano Social, cargar todas las inscripciones del torneo
      // No filtrar por categoryId porque puede que no exista o esté mal configurado
      const response = await fetch(
        `/api/registrations?tournamentId=${tournament.id}&limit=1000`
      )

      if (!response.ok) {
        throw new Error("Error cargando inscripciones")
      }

      const data = await response.json()

      // Filtrar todas las inscripciones activas (excluir solo CANCELLED)
      const activeRegistrations = (data.registrations || []).filter(
        (reg: any) => reg.registrationStatus !== 'CANCELLED'
      )
      setRegistrations(activeRegistrations)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadCategoriesSummary = async () => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/americano-social/categories-summary`
      )

      if (!response.ok) {
        throw new Error("Error cargando resumen de categorías")
      }

      const data = await response.json()
      setCategoriesSummary(data.categories || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const generatePools = async (selectedCategoryId: string, numberOfRounds: number, force = false) => {
    try {
      setGenerating(true)

      const response = await fetch(
        `/api/tournaments/${tournament.id}/americano-social/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: selectedCategoryId, numberOfRounds, force })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error generando pools")
      }

      toast({
        title: "✅ ¡Pools generados!",
        description: data.message,
        variant: "success",
      })

      setRegenerateDialogOpen(false)
      setExistingPoolsInfo(null)
      await loadData()
      await loadCategoriesSummary()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error generando pools",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmRegenerate = () => {
    setRegenerateDialogOpen(false)
    // Usar la categoría actual y las rondas configuradas en el torneo
    const rounds = tournament.americanoRounds || 1
    generatePools(categoryId, rounds, true)
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar torneo")
      }

      toast({
        title: "✅ Éxito",
        description: "Torneo eliminado correctamente",
        variant: "success",
      })

      router.push("/dashboard/tournaments")
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar torneo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "✅ Enlace copiado",
        description: "El enlace del torneo ha sido copiado al portapapeles",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const handlePrintAllPools = async () => {
    try {
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf')

      // Crear PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let isFirstPage = true

      pools.forEach((pool) => {
        // Agregar nueva página (excepto la primera)
        if (!isFirstPage) {
          doc.addPage()
        }
        isFirstPage = false

        // Header - Torneo
        doc.setFontSize(14)
        doc.setFont('helvetica', 'normal')
        doc.text(tournament.name, 20, 20)

        // Header - Pool
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text(pool.name, 20, 30)

        doc.setFontSize(16)
        doc.setFont('helvetica', 'normal')
        doc.text(`Ronda ${pool.roundNumber}`, 20, 40)

        // Cancha (si existe)
        if (pool.court) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'normal')
          doc.text(`Cancha: ${pool.court.name}`, 20, 48)
        }

        // Línea separadora
        doc.setLineWidth(0.5)
        doc.line(20, pool.court ? 52 : 45, 190, pool.court ? 52 : 45)

        // Jugadores
        let yPos = pool.court ? 60 : 55
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Jugadores', 20, yPos)
        yPos += 3
        doc.setLineWidth(1)
        doc.line(20, yPos, 100, yPos)
        yPos += 8

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        pool.players.forEach((p: any) => {
          doc.text(`${p.player.firstName} ${p.player.lastName}`, 20, yPos)
          yPos += 7
        })

        // Partidos
        yPos += 5
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Partidos', 20, yPos)
        yPos += 3
        doc.setLineWidth(1)
        doc.line(20, yPos, 100, yPos)
        yPos += 10

        pool.matches.forEach((match: any, idx: number) => {
          // Título del partido
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(`Partido ${idx + 1}`, 20, yPos)

          // Fecha/hora programada (si existe)
          if (match.scheduledFor) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            const scheduledDate = typeof match.scheduledFor === 'string'
              ? new Date(match.scheduledFor)
              : match.scheduledFor
            const dateText = format(scheduledDate, "dd/MM/yyyy HH:mm", { locale: es })
            doc.text(dateText, 70, yPos)
          }

          yPos += 7

          // Equipo 1
          doc.setFont('helvetica', 'normal')
          const team1Text = `${match.player1.firstName} ${match.player1.lastName} / ${match.player2.firstName} ${match.player2.lastName}`
          doc.text(team1Text, 25, yPos)

          // Recuadro para resultado equipo 1
          doc.setLineWidth(0.5)
          doc.rect(160, yPos - 5, 25, 10)

          yPos += 8

          // Equipo 2
          const team2Text = `${match.player3.firstName} ${match.player3.lastName} / ${match.player4.firstName} ${match.player4.lastName}`
          doc.text(team2Text, 25, yPos)

          // Recuadro para resultado equipo 2
          doc.rect(160, yPos - 5, 25, 10)

          yPos += 12

          // Línea divisoria entre partidos
          if (idx < pool.matches.length - 1) {
            doc.setLineWidth(0.2)
            doc.line(20, yPos, 190, yPos)
            yPos += 5
          }
        })
      })

      // Descargar el PDF
      doc.save(`planillas-${tournament.name.replace(/\s+/g, '-')}.pdf`)

      toast({
        title: "✅ PDF generado",
        description: "Las planillas se han descargado correctamente",
        variant: "success",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "❌ Error",
        description: "Error al generar el PDF de las planillas",
        variant: "destructive",
      })
    }
  }

  const hasPools = pools.length > 0

  // Preparar datos para planilla imprimible
  const currentCategory = tournament.categories.find((c: any) => c.categoryId === categoryId)
  const scoresheetTournamentData = {
    name: tournament.name,
    tournamentStart: tournament.tournamentStart,
    setsToWin: tournament.setsToWin,
    gamesToWinSet: tournament.gamesToWinSet,
    tiebreakAt: tournament.tiebreakAt,
    goldenPoint: tournament.goldenPoint
  }
  const scoresheetCategoryData = currentCategory ? {
    name: currentCategory.category.name
  } : null

  // Agrupar pools por ronda
  const poolsByRound = useMemo(() => {
    const grouped = new Map<number, typeof pools>()
    pools.forEach(pool => {
      const roundNumber = pool.roundNumber || 1
      if (!grouped.has(roundNumber)) {
        grouped.set(roundNumber, [])
      }
      grouped.get(roundNumber)!.push(pool)
    })
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])
  }, [pools])

  const numberOfRounds = poolsByRound.length

  // Calcular si hay rondas anteriores con partidos incompletos
  const hasIncompletePreviousRounds = useMemo(() => {
    const incompleteMapp = new Map<number, boolean>()

    poolsByRound.forEach(([roundNum, roundPools]) => {
      // Verificar si la ronda actual tiene partidos incompletos
      const hasIncomplete = roundPools.some(pool =>
        pool.matches?.some((match: any) => match.status !== 'COMPLETED')
      )
      incompleteMapp.set(roundNum, hasIncomplete)
    })

    // Para cada ronda, verificar si ALGUNA ronda anterior tiene partidos incompletos
    const result = new Map<number, boolean>()
    poolsByRound.forEach(([roundNum]) => {
      let hasPreviousIncomplete = false
      for (let i = 1; i < roundNum; i++) {
        if (incompleteMapp.get(i)) {
          hasPreviousIncomplete = true
          break
        }
      }
      result.set(roundNum, hasPreviousIncomplete)
    })

    return result
  }, [poolsByRound])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">{tournament.name}</h1>
              <TournamentStatusManager
                tournamentId={tournament.id}
                currentStatus={tournament.status}
                isOwner={isOwner}
              />
            </div>
            {tournament.description && (
              <p className="text-sm md:text-base text-muted-foreground line-clamp-2">{tournament.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 md:h-4 md:w-4" />
                <span className="line-clamp-1">{typeLabel}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                {registrations.length} jugadores
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {canManage && (
              <Button variant="default" onClick={() => setPoolsSetupOpen(true)} disabled={generating}>
                <Play className="mr-2 h-4 w-4" />
                {hasPools ? "Regenerar Pools" : "Generar Pools"}
              </Button>
            )}

            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar enlace
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={hasPools}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManage && (
                  <DropdownMenuItem onClick={() => setPoolsSetupOpen(true)} disabled={generating}>
                    <Play className="mr-2 h-4 w-4" />
                    {hasPools ? "Regenerar Pools" : "Generar Pools"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Configuración
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={hasPools}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-start">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground mt-1" />
              <div className="ml-2 md:ml-3 flex-1 min-w-0">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Jugadores</p>
                <RegistrationStatusBreakdown
                  registrations={registrations}
                  maxParticipants={tournament.maxParticipants}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <div className="ml-2 md:ml-3">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Partidos</p>
                <p className="text-lg md:text-2xl font-bold">{pools.length * 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <div className="ml-2 md:ml-3">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Premio</p>
                <p className="text-lg md:text-2xl font-bold">${tournament.prizePool}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center">
              <Trophy className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <div className="ml-2 md:ml-3">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Categorías</p>
                <p className="text-lg md:text-2xl font-bold">{tournament.categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:w-full">
            <TabsTrigger value="info" className="text-xs md:text-sm whitespace-nowrap">Información</TabsTrigger>
            <TabsTrigger value="players" className="text-xs md:text-sm whitespace-nowrap">Jugadores</TabsTrigger>
            <TabsTrigger value="pools" className="text-xs md:text-sm whitespace-nowrap">Pools</TabsTrigger>
            <TabsTrigger value="matches" className="text-xs md:text-sm whitespace-nowrap">Partidos</TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs md:text-sm whitespace-nowrap">Ranking</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Info */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organizador</p>
                  <p>{tournament.organizer?.name || tournament.organizer?.email}</p>
                </div>

                {tournament.mainClub && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Club Principal</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{tournament.mainClub.name}, {tournament.mainClub.city}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fechas Importantes</p>
                  <div className="space-y-1 text-sm">
                    {tournament.registrationStart && (
                      <div>Inscripciones: {format(new Date(tournament.registrationStart), "dd/MM/yyyy", { locale: es })} - {format(new Date(tournament.registrationEnd), "dd/MM/yyyy", { locale: es })}</div>
                    )}
                    <div>Torneo: {format(new Date(tournament.tournamentStart), "dd/MM/yyyy", { locale: es })}{tournament.tournamentEnd && ` - ${format(new Date(tournament.tournamentEnd), "dd/MM/yyyy", { locale: es })}`}</div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Participación</p>
                  <div className="space-y-1 text-sm">
                    <div>Mínimo: {tournament.minParticipants} jugadores</div>
                    {tournament.maxParticipants && <div>Máximo: {tournament.maxParticipants} jugadores</div>}
                    <div>Tarifa: ${tournament.registrationFee}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reglas del Juego */}
            <Card>
              <CardHeader>
                <CardTitle>Reglas del Juego</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Sets a ganar</p>
                    <p>{tournament.setsToWin}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Games por set</p>
                    <p>{tournament.gamesToWinSet}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Tiebreak en</p>
                    <p>{tournament.tiebreakAt}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Punto de oro</p>
                    <p>{tournament.goldenPoint ? "Sí" : "No"}</p>
                  </div>
                </div>

                {tournament.rules && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Reglas Especiales</p>
                    <p className="text-sm whitespace-pre-wrap">{tournament.rules}</p>
                  </div>
                )}

                {tournament.prizesDescription && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Premios</p>
                    <p className="text-sm whitespace-pre-wrap">{tournament.prizesDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categorías */}
          <Card>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.categories.map((tournamentCategory: any) => (
                  <div key={tournamentCategory.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tournamentCategory.category.name}</h4>
                      <Badge variant="outline">
                        {registrations.filter((r: any) =>
                          r.categoryId === tournamentCategory.categoryId &&
                          (r.registrationStatus === 'CONFIRMED' || r.registrationStatus === 'PAID')
                        ).length} jugadores
                      </Badge>
                    </div>
                    {tournamentCategory.category.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {tournamentCategory.category.description}
                      </p>
                    )}
                    {tournamentCategory.maxTeams && (
                      <p className="text-sm">Máximo: {tournamentCategory.maxTeams} jugadores</p>
                    )}
                    {tournamentCategory.registrationFee && (
                      <p className="text-sm">Tarifa: ${tournamentCategory.registrationFee}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clubes */}
          {tournament.clubs && tournament.clubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clubes Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tournament.clubs.map((tournamentClub: any) => (
                    <div key={tournamentClub.club.id} className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{tournamentClub.club.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Players */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Jugadores Inscritos</CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay jugadores inscritos aún
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {registrations.map((registration: any) => (
                    <div key={registration.id} className="border rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {registration.player.firstName} {registration.player.lastName}
                        </p>
                        <Badge className={`text-xs ${getRegistrationStatusStyle(registration.registrationStatus)}`}>
                          {getRegistrationStatusLabel(registration.registrationStatus)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {registration.player.rankingPoints} pts
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {registration.player.primaryCategory && (
                            <Badge className={`text-xs ${getCategoryLevelStyle(registration.player.primaryCategory.level)}`}>
                              {formatCategoryLevel(registration.player.primaryCategory.name, registration.player.primaryCategory.level)}
                            </Badge>
                          )}
                          {registration.player.gender && (
                            <Badge className={`text-xs ${getGenderRestrictionStyle(registration.player.gender)}`}>
                              {getGenderRestrictionLabel(registration.player.gender)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pools */}
        <TabsContent value="pools" className="space-y-4">
          {/* Estado por categoría */}
          {tournament.categories.length > 1 && categoriesSummary.length > 0 ? (
            <>
              {/* Card: Estado por Categoría */}
              <Card>
                <CardHeader>
                  <CardTitle>Estado por Categoría</CardTitle>
                  <CardDescription>
                    Resumen del estado de pools para cada categoría del torneo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoriesSummary.map((catSummary: any) => (
                      <div
                        key={catSummary.categoryId}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{catSummary.categoryName}</h4>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {catSummary.confirmedPlayers} jugadores
                          </Badge>
                        </div>

                        {!catSummary.hasPools ? (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Pools no generados
                            </p>
                            {canManage && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  router.push(`/dashboard/tournaments/${tournament.id}/americano-social?categoryId=${catSummary.categoryId}`)
                                  setPoolsSetupOpen(true)
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Generar
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Rondas:</span>
                              <span className="ml-2 font-semibold">{catSummary.poolsStats.numberOfRounds}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pools:</span>
                              <span className="ml-2 font-semibold">{catSummary.poolsStats.totalPools}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Partidos:</span>
                              <span className="ml-2 font-semibold">{catSummary.poolsStats.totalMatches}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Completados:</span>
                              <span className="ml-2 font-semibold text-green-600">
                                {catSummary.poolsStats.completedMatches}/{catSummary.poolsStats.totalMatches}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Card: Detalle de Pools (solo si hay pools generados en alguna categoría) */}
              {categoriesSummary.some((cat: any) => cat.hasPools) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalle de Pools</CardTitle>
                    <CardDescription>
                      Selecciona una categoría para ver el detalle de sus pools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={categoryId} onValueChange={(value) => router.push(`/dashboard/tournaments/${tournament.id}/americano-social?categoryId=${value}`)}>
                      <TabsList className="mb-4">
                        {categoriesSummary
                          .filter((cat: any) => cat.hasPools)
                          .map((cat: any) => (
                            <TabsTrigger key={cat.categoryId} value={cat.categoryId}>
                              {cat.categoryName}
                            </TabsTrigger>
                          ))}
                      </TabsList>

                      {categoriesSummary
                        .filter((cat: any) => cat.hasPools)
                        .map((cat: any) => (
                          <TabsContent key={cat.categoryId} value={cat.categoryId}>
                            {cat.categoryId === categoryId && hasPools && (
                              numberOfRounds > 1 ? (
                                // Múltiples rondas: mostrar con subtabs
                                <Tabs defaultValue="round-1">
                                  <TabsList>
                                    {poolsByRound.map(([roundNum]) => (
                                      <TabsTrigger key={roundNum} value={`round-${roundNum}`}>
                                        Ronda {roundNum}
                                      </TabsTrigger>
                                    ))}
                                  </TabsList>

                                  {poolsByRound.map(([roundNum, roundPools]) => (
                                    <TabsContent key={roundNum} value={`round-${roundNum}`} className="space-y-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <div>
                                          <h3 className="text-lg font-semibold">Ronda {roundNum}</h3>
                                          <p className="text-sm text-muted-foreground">
                                            {roundPools.length} pool{roundPools.length > 1 ? 's' : ''} • {roundPools.length * 3} partidos
                                          </p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={handlePrintAllPools}
                                        >
                                          <Printer className="mr-2 h-4 w-4" />
                                          Imprimir todas las planillas
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {roundPools.map((pool) => (
                                          <PoolCard
                                            key={pool.id}
                                            pool={pool}
                                            tournament={scoresheetTournamentData}
                                            category={scoresheetCategoryData}
                                            onMatchUpdate={loadData}
                                            hasPreviousRoundsIncomplete={hasIncompletePreviousRounds.get(roundNum) || false}
                                          />
                                        ))}
                                      </div>
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              ) : (
                                // Una sola ronda: mostrar directamente
                                <div>
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h3 className="text-lg font-semibold">Pools</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {pools.length} pool{pools.length > 1 ? 's' : ''} • {pools.length * 3} partidos
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handlePrintAllPools}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Imprimir todas las planillas
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {pools.map((pool) => (
                                      <PoolCard
                                        key={pool.id}
                                        pool={pool}
                                        tournament={scoresheetTournamentData}
                                        category={scoresheetCategoryData}
                                        onMatchUpdate={loadData}
                                        hasPreviousRoundsIncomplete={false}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </TabsContent>
                        ))}
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            // Torneo con una sola categoría: mantener UI original
            !hasPools ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pools</CardTitle>
                  <CardDescription>
                    {canManage
                      ? "Los jugadores confirmados se dividirán automáticamente en pools de 4. Cada pool jugará 3 partidos donde todos rotan parejas."
                      : "Los pools aún no han sido generados. Espera a que el organizador genere los pools."
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {canManage ? (
                    <Button
                      onClick={() => setPoolsSetupOpen(true)}
                      disabled={generating}
                      size="lg"
                      className="w-full md:w-auto"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Generar Pools
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Solo administradores y organizadores pueden generar pools.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : numberOfRounds > 1 ? (
              // Múltiples rondas: mostrar con tabs
              <Tabs defaultValue="round-1">
                <TabsList>
                  {poolsByRound.map(([roundNum]) => (
                    <TabsTrigger key={roundNum} value={`round-${roundNum}`}>
                      Ronda {roundNum}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {poolsByRound.map(([roundNum, roundPools]) => (
                  <TabsContent key={roundNum} value={`round-${roundNum}`} className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Ronda {roundNum}</h3>
                        <p className="text-sm text-muted-foreground">
                          {roundPools.length} pool{roundPools.length > 1 ? 's' : ''} • {roundPools.length * 3} partidos
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintAllPools}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir todas las planillas
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {roundPools.map((pool) => (
                        <PoolCard
                          key={pool.id}
                          pool={pool}
                          tournament={scoresheetTournamentData}
                          category={scoresheetCategoryData}
                          onMatchUpdate={loadData}
                          hasPreviousRoundsIncomplete={hasIncompletePreviousRounds.get(roundNum) || false}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              // Una sola ronda: mostrar directamente
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Pools</h3>
                    <p className="text-sm text-muted-foreground">
                      {pools.length} pool{pools.length > 1 ? 's' : ''} • {pools.length * 3} partidos
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintAllPools}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir todas las planillas
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pools.map((pool) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      tournament={scoresheetTournamentData}
                      category={scoresheetCategoryData}
                      onMatchUpdate={loadData}
                      hasPreviousRoundsIncomplete={false}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </TabsContent>

        {/* Tab: Matches */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasPools ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay partidos programados aún. Genera los pools primero.
                </p>
              ) : numberOfRounds > 1 ? (
                // Múltiples rondas: agrupar por ronda
                <div className="space-y-8">
                  {poolsByRound.map(([roundNum, roundPools]) => (
                    <div key={roundNum}>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Ronda {roundNum}</h3>
                        <p className="text-sm text-muted-foreground">
                          {roundPools.length * 3} partidos en {roundPools.length} pool{roundPools.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="space-y-6">
                        {roundPools.map((pool) => (
                          <div key={pool.id}>
                            <h4 className="font-medium mb-3">{pool.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {pool.matches.map((match: any, index: number) => (
                                <AmericanoMatchCard
                                  key={match.id}
                                  match={match}
                                  canManage={canManage}
                                  onLoadResult={() => setSelectedMatch(match)}
                                  poolCourt={pool.court}
                                  showPoolInfo={false}
                                  hasPreviousRoundsIncomplete={hasIncompletePreviousRounds.get(roundNum) || false}
                                  matchNumber={index + 1}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Una sola ronda: mostrar sin agrupar
                <div className="space-y-6">
                  {pools.map((pool) => (
                    <div key={pool.id}>
                      <h4 className="font-medium mb-3">{pool.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pool.matches.map((match: any, index: number) => (
                          <AmericanoMatchCard
                            key={match.id}
                            match={match}
                            canManage={canManage}
                            onLoadResult={() => setSelectedMatch(match)}
                            poolCourt={pool.court}
                            showPoolInfo={false}
                            hasPreviousRoundsIncomplete={false}
                            matchNumber={index + 1}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ranking */}
        <TabsContent value="ranking" className="space-y-4">
          {hasPools && ranking.length > 0 ? (
            <GlobalRankingTable ranking={ranking} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay ranking disponible. Genera los pools primero.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El torneo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Pools Confirmation Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              ¿Regenerar pools?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-base">
                  Ya existen pools generados. Si continúas, se eliminarán{" "}
                  <strong>todas las rondas, pools y partidos existentes</strong> y se crearán nuevos
                  según la configuración actual del torneo ({tournament.americanoRounds || 1} {(tournament.americanoRounds || 1) === 1 ? 'ronda' : 'rondas'}).
                </div>

                {existingPoolsInfo && (
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      Datos que se eliminarán:
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Número de rondas:</span>
                        <Badge variant="secondary">{existingPoolsInfo.numberOfRounds}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Pools por ronda:</span>
                        <Badge variant="secondary">{existingPoolsInfo.poolsPerRound}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Total de pools:</span>
                        <Badge variant="secondary">{existingPoolsInfo.totalPools}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-800 dark:text-orange-200">Total de partidos:</span>
                        <Badge variant="secondary">{existingPoolsInfo.totalMatches}</Badge>
                      </div>
                      {existingPoolsInfo.completedMatches > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-800 dark:text-orange-200">Partidos completados:</span>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {existingPoolsInfo.completedMatches}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Esta acción <strong>no se puede deshacer</strong>. Se perderán todos los
                  resultados cargados hasta el momento.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Sí, eliminar y regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Match Result Dialog */}
      {selectedMatch && (
        <AmericanoMatchResultDialog
          match={selectedMatch}
          tournament={{
            setsToWin: tournament.setsToWin,
            gamesToWinSet: tournament.gamesToWinSet,
            tiebreakAt: tournament.tiebreakAt,
            goldenPoint: tournament.goldenPoint
          }}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onSuccess={() => {
            setSelectedMatch(null)
            loadData()
          }}
        />
      )}

      {/* Pools Setup Dialog */}
      <AmericanoPoolsSetup
        open={poolsSetupOpen}
        onOpenChange={setPoolsSetupOpen}
        tournamentId={tournament.id}
        categoryId={categoryId}
        categories={tournament.categories}
        onGenerate={generatePools}
      />
    </div>
  )
}
