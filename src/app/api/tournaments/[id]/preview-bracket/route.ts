import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BracketService } from "@/lib/services/bracket-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tournaments/[id]/preview-bracket?categoryId=xxx
 *
 * Obtiene una vista previa de la configuración del bracket sin generarlo
 * Para torneos GROUP_STAGE_ELIMINATION, muestra la configuración de grupos y clasificación
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id: tournamentId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get("categoryId")

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId es requerido" },
        { status: 400 }
      )
    }

    // Obtener torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    const isAdmin = session.user.role === "ADMIN"
    const isOrganizer = tournament.organizerId === session.user.id
    if (!isAdmin && !isOrganizer) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar este torneo" },
        { status: 403 }
      )
    }

    // Verificar que la categoría exista en este torneo
    const tournamentCategory = await prisma.tournamentCategory.findFirst({
      where: {
        tournamentId,
        categoryId
      },
      include: {
        category: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "La categoría no pertenece a este torneo" },
        { status: 400 }
      )
    }

    // Contar equipos confirmados
    const confirmedTeams = await prisma.team.count({
      where: {
        tournamentId,
        categoryId,
        status: "CONFIRMED"
      }
    })

    if (confirmedTeams < 2) {
      return NextResponse.json({
        error: "Se requieren al menos 2 equipos confirmados",
        teamsCount: confirmedTeams
      }, { status: 400 })
    }

    // Para GROUP_STAGE_ELIMINATION, calcular la configuración óptima
    if (tournament.type === "GROUP_STAGE_ELIMINATION") {
      const config = BracketService.calculateOptimalGroupConfiguration(confirmedTeams)

      return NextResponse.json({
        tournamentType: tournament.type,
        categoryName: tournamentCategory.category.name,
        teamsCount: confirmedTeams,
        configuration: {
          numGroups: config.numGroups,
          groupSizes: config.groupSizes,
          qualifiedPerGroup: config.qualifiedPerGroup,
          bestThirdPlace: config.bestThirdPlace,
          totalClassified: config.totalClassified,
          eliminationRounds: Math.ceil(Math.log2(config.totalClassified))
        }
      })
    }

    // Para otros formatos, retornar información básica
    return NextResponse.json({
      tournamentType: tournament.type,
      categoryName: tournamentCategory.category.name,
      teamsCount: confirmedTeams,
      configuration: null
    })

  } catch (error) {
    console.error("Error previewing bracket configuration:", error)
    return NextResponse.json(
      { error: "Error al obtener preview del bracket" },
      { status: 500 }
    )
  }
}
