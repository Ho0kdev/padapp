import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AmericanoSocialService } from "@/lib/services/americano-social-service"
import { authorize, handleAuthError, AuditLogger, Action, Resource } from "@/lib/rbac"
import { generatePoolsSchema } from "@/lib/validations/americano-social"
import { z } from "zod"

// POST /api/tournaments/[id]/americano-social/generate - Generar pools
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await authorize(Action.UPDATE, Resource.TOURNAMENT, id)

    const body = await request.json()
    const validatedData = generatePoolsSchema.parse(body)

    // Verificar que el torneo exista y sea tipo AMERICANO_SOCIAL
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        categories: {
          where: { categoryId: validatedData.categoryId },
          include: {
            category: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    if (tournament.type !== "AMERICANO_SOCIAL") {
      return NextResponse.json(
        { error: "Este torneo no es de tipo Americano Social" },
        { status: 400 }
      )
    }

    const tournamentCategory = tournament.categories[0]
    if (!tournamentCategory) {
      return NextResponse.json(
        { error: "La categoría no pertenece a este torneo" },
        { status: 400 }
      )
    }

    // Verificar si hay pools ya creados
    const existingPools = await prisma.americanoPool.findMany({
      where: {
        tournamentId: id,
        categoryId: validatedData.categoryId
      },
      include: {
        matches: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    if (existingPools.length > 0) {
      // Si no se está forzando la regeneración, devolver error
      if (!validatedData.force) {
        return NextResponse.json(
          { error: "Ya existen pools para esta categoría. Elimínalos primero." },
          { status: 400 }
        )
      }

      // Si se está forzando, eliminar pools existentes
      console.log(`🔄 Regenerando pools: eliminando ${existingPools.length} pools existentes...`)

      // Eliminar en orden: matches primero, luego players, luego pools, luego rankings
      for (const pool of existingPools) {
        // Eliminar matches del pool
        await prisma.americanoPoolMatch.deleteMany({
          where: { poolId: pool.id }
        })

        // Eliminar jugadores del pool
        await prisma.americanoPoolPlayer.deleteMany({
          where: { poolId: pool.id }
        })

        // Eliminar el pool
        await prisma.americanoPool.delete({
          where: { id: pool.id }
        })
      }

      // Eliminar rankings globales de esta categoría
      await prisma.americanoGlobalRanking.deleteMany({
        where: {
          tournamentId: id,
          categoryId: validatedData.categoryId
        }
      })

      console.log(`✅ Pools y rankings anteriores eliminados`)
    }

    // Obtener jugadores confirmados
    const registrations = await prisma.registration.findMany({
      where: {
        tournamentId: id,
        categoryId: validatedData.categoryId,
        registrationStatus: "CONFIRMED"
      },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    const players = registrations.map(r => r.player)

    // Validar número de jugadores
    if (players.length % 4 !== 0) {
      return NextResponse.json(
        {
          error: `Americano Social requiere múltiplo de 4 jugadores. Hay ${players.length} jugadores confirmados.`
        },
        { status: 400 }
      )
    }

    if (players.length < 4) {
      return NextResponse.json(
        { error: "Se requieren al menos 4 jugadores confirmados" },
        { status: 400 }
      )
    }

    // Generar pools
    await AmericanoSocialService.generateAmericanoSocialPools(
      id,
      validatedData.categoryId,
      players as any // Type assertion - service only uses player.id
    )

    const numPools = players.length / 4

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.TOURNAMENT,
      resourceId: id,
      description: `${numPools} pools generados para categoría ${tournamentCategory.category.name} en torneo ${tournament.name}`,
      newData: {
        numPools,
        numPlayers: players.length,
        categoryId: validatedData.categoryId
      }
    }, request)

    return NextResponse.json({
      success: true,
      message: `${numPools} pools generados exitosamente`,
      numPools,
      numPlayers: players.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}
