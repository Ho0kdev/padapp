import { NextRequest, NextResponse } from "next/server"
import { authorize, handleAuthError, Action, Resource } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/tournaments/[id]/assign-seeds
 *
 * Calcula y asigna seeds automáticamente a todos los equipos del torneo
 * basándose en la suma de ranking points de ambos jugadores.
 *
 * Criterios:
 * - Seed = Suma de ranking points de ambos jugadores
 * - Mayor suma = Seed más bajo (mejor)
 * - Empates: Se desempatan por fecha de creación del equipo (primero inscrito = mejor seed)
 * - Jugadores sin ranking (0 points): Van al final
 *
 * Permisos: Solo ADMIN y ORGANIZER
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Solo ADMIN y ORGANIZER pueden asignar seeds
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
    const { id: tournamentId } = await params

    // Obtener parámetros opcionales del body
    const body = await request.json().catch(() => ({}))
    const { categoryId } = body // Opcional: si se proporciona, solo asigna a esa categoría

    // Verificar que el torneo existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        type: true
      }
    })

    if (!tournament) {
      return NextResponse.json({
        error: "Torneo no encontrado"
      }, { status: 404 })
    }

    // Validar que el torneo no esté completado
    if (tournament.status === 'COMPLETED') {
      return NextResponse.json({
        error: "No se pueden asignar seeds a torneos completados"
      }, { status: 400 })
    }

    // Validar que no sea AMERICANO_SOCIAL (no usa seeds tradicionales)
    if (tournament.type === 'AMERICANO_SOCIAL') {
      return NextResponse.json({
        error: "Los torneos Americano Social no requieren asignación de seeds"
      }, { status: 400 })
    }

    console.log(`🎯 Asignando seeds automáticamente para torneo: ${tournament.name}`)

    // Construir filtro para equipos
    const teamFilter: any = {
      tournamentId,
      status: 'CONFIRMED' // Solo equipos confirmados
    }

    if (categoryId) {
      teamFilter.categoryId = categoryId
    }

    // Obtener todos los equipos confirmados con información de jugadores
    const teams = await prisma.team.findMany({
      where: teamFilter,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        registration1: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                rankingPoints: true
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
                rankingPoints: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Para desempate
      }
    })

    if (teams.length === 0) {
      return NextResponse.json({
        error: "No hay equipos confirmados para asignar seeds"
      }, { status: 400 })
    }

    console.log(`📊 Procesando ${teams.length} equipos`)

    // Agrupar por categoría si no se especificó una categoría específica
    const teamsByCategory = teams.reduce((acc, team) => {
      const catId = team.categoryId
      if (!acc[catId]) {
        acc[catId] = []
      }
      acc[catId].push(team)
      return acc
    }, {} as Record<string, typeof teams>)

    const allAssignments: any[] = []
    let totalTeamsProcessed = 0

    // Procesar cada categoría por separado
    for (const [catId, categoryTeams] of Object.entries(teamsByCategory)) {
      const categoryName = categoryTeams[0].category.name

      console.log(`\n📂 Procesando categoría: ${categoryName} (${categoryTeams.length} equipos)`)

      // Calcular puntos totales para cada equipo
      const teamsWithPoints = categoryTeams.map(team => {
        const player1Points = team.registration1.player.rankingPoints || 0
        const player2Points = team.registration2.player.rankingPoints || 0
        const totalPoints = player1Points + player2Points

        return {
          id: team.id,
          name: team.name,
          categoryId: team.categoryId,
          categoryName: team.category.name,
          player1: {
            name: `${team.registration1.player.firstName} ${team.registration1.player.lastName}`,
            points: player1Points
          },
          player2: {
            name: `${team.registration2.player.firstName} ${team.registration2.player.lastName}`,
            points: player2Points
          },
          totalPoints,
          createdAt: team.createdAt
        }
      })

      // Ordenar por puntos totales (descendente) y por fecha de creación (ascendente) en caso de empate
      teamsWithPoints.sort((a, b) => {
        // Primero: equipos CON ranking points
        const aHasPoints = a.totalPoints > 0
        const bHasPoints = b.totalPoints > 0

        // Si uno tiene points y el otro no, el que tiene points va primero
        if (aHasPoints && !bHasPoints) return -1
        if (!aHasPoints && bHasPoints) return 1

        // Si ambos tienen points (o ambos no tienen), ordenar por total de points
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints // Descendente (más points = mejor)
        }

        // Empate en points: ordenar por fecha de creación (primero inscrito = mejor)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

      // Asignar seeds (1, 2, 3, ...)
      const categoryAssignments: any[] = []

      for (let i = 0; i < teamsWithPoints.length; i++) {
        const team = teamsWithPoints[i]
        const seed = i + 1

        // Actualizar seed en base de datos
        await prisma.team.update({
          where: { id: team.id },
          data: { seed }
        })

        const assignment = {
          teamId: team.id,
          teamName: team.name || `${team.player1.name} / ${team.player2.name}`,
          categoryId: team.categoryId,
          categoryName: team.categoryName,
          seed,
          totalPoints: team.totalPoints,
          player1: team.player1,
          player2: team.player2,
          hasRanking: team.totalPoints > 0
        }

        categoryAssignments.push(assignment)
        allAssignments.push(assignment)

        console.log(
          `   Seed ${seed}: ${assignment.teamName} - ` +
          `${team.totalPoints} pts (${team.player1.points} + ${team.player2.points})` +
          (team.totalPoints === 0 ? ' [Sin ranking]' : '')
        )
      }

      totalTeamsProcessed += categoryTeams.length
    }

    console.log(`\n✅ Seeds asignados exitosamente: ${totalTeamsProcessed} equipos procesados`)

    return NextResponse.json({
      success: true,
      message: "Seeds asignados automáticamente",
      data: {
        tournamentId,
        tournamentName: tournament.name,
        teamsProcessed: totalTeamsProcessed,
        categoriesProcessed: Object.keys(teamsByCategory).length,
        assignments: allAssignments
      }
    })

  } catch (error) {
    console.error("Error asignando seeds:", error)
    return handleAuthError(error)
  }
}
