import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createTeamSchema, getTeamsSchema } from "@/lib/validations/team"
import { TeamLogService } from "@/lib/services/team-log-service"

// ============================================================================
// GET ENDPOINT
// ============================================================================

/**
 * GET /api/teams
 *
 * Lista todos los equipos con paginación y filtros.
 * Aplica permisos RBAC:
 * - ADMIN y CLUB_ADMIN: Ven todos los equipos
 * - Otros usuarios: Solo ven sus propios equipos
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = getTeamsSchema.parse(params)
    const { page, limit, status, search, tournamentId, categoryId, playerId } = validatedParams

    const offset = (page - 1) * limit

    // Construir filtros base
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (tournamentId && tournamentId !== 'all') {
      where.tournamentId = tournamentId
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    // Filtrar por jugador específico
    if (playerId) {
      where.OR = [
        {
          registration1: {
            playerId: playerId
          }
        },
        {
          registration2: {
            playerId: playerId
          }
        }
      ]
    }

    // Búsqueda por nombre de equipo o nombre de jugadores
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          registration1: {
            player: {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive'
                  }
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          }
        },
        {
          registration2: {
            player: {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive'
                  }
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          }
        }
      ]
    }

    // Aplicar filtrado basado en permisos RBAC
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CLUB_ADMIN') {
      const userPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
      })

      if (userPlayer) {
        // Solo mostrar equipos donde el usuario es jugador
        where.OR = [
          {
            registration1: {
              playerId: userPlayer.id
            }
          },
          {
            registration2: {
              playerId: userPlayer.id
            }
          }
        ]
      } else {
        // Si no es jugador, no puede ver ningún equipo
        return NextResponse.json({
          teams: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        })
      }
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
            }
          },
          registration1: {
            select: {
              id: true,
              registrationStatus: true,
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          registration2: {
            select: {
              id: true,
              registrationStatus: true,
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.team.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      teams,
      total,
      page,
      limit,
      totalPages
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return handleAuthError(error)
  }
}

// ============================================================================
// POST ENDPOINT
// ============================================================================

// POST /api/teams - Crear equipo desde registrations existentes

/**
 * POST /api/teams
 *
 * Crea un equipo vinculando 2 inscripciones individuales existentes.
 * Este es el nuevo flujo donde los jugadores se inscriben primero individualmente
 * y luego forman equipos.
 *
 * Validaciones:
 * - Ambas registrations deben existir
 * - Ambas deben ser del mismo torneo y categoría
 * - Ambos jugadores deben estar CONFIRMED o PAID
 * - Ninguno puede estar ya en otro equipo en la misma categoría
 * - El torneo no debe ser AMERICANO_SOCIAL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.REGISTRATION)
    const body = await request.json()
    const validatedData = createTeamSchema.parse(body)

    // 1. Verificar que el torneo existe y NO es AMERICANO_SOCIAL
    const tournament = await prisma.tournament.findUnique({
      where: { id: validatedData.tournamentId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    if (tournament.type === 'AMERICANO_SOCIAL') {
      return NextResponse.json(
        { error: "Los torneos Americano Social no requieren equipos. Cada jugador juega individualmente." },
        { status: 400 }
      )
    }

    if (tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: "No se pueden crear equipos en torneos completados" },
        { status: 400 }
      )
    }

    // 2. Obtener ambas registrations
    const [registration1, registration2] = await Promise.all([
      prisma.registration.findUnique({
        where: { id: validatedData.registration1Id },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userId: true,
            }
          },
          tournament: {
            select: {
              id: true,
              type: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }),
      prisma.registration.findUnique({
        where: { id: validatedData.registration2Id },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userId: true,
            }
          },
          tournament: {
            select: {
              id: true,
              type: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })
    ])

    if (!registration1 || !registration2) {
      return NextResponse.json(
        { error: "Una o ambas inscripciones no existen" },
        { status: 404 }
      )
    }

    // 3. Validar que ambas inscripciones sean del mismo torneo y categoría
    if (registration1.tournamentId !== validatedData.tournamentId ||
        registration2.tournamentId !== validatedData.tournamentId) {
      return NextResponse.json(
        { error: "Ambas inscripciones deben ser del mismo torneo" },
        { status: 400 }
      )
    }

    if (registration1.categoryId !== validatedData.categoryId ||
        registration2.categoryId !== validatedData.categoryId) {
      return NextResponse.json(
        { error: "Ambas inscripciones deben ser de la misma categoría" },
        { status: 400 }
      )
    }

    // 4. Validar que ambos jugadores estén CONFIRMED o PAID
    const validStatuses = ['CONFIRMED', 'PAID']
    if (!validStatuses.includes(registration1.registrationStatus)) {
      return NextResponse.json(
        { error: `${registration1.player.firstName} ${registration1.player.lastName} debe estar confirmado o haber pagado para formar un equipo` },
        { status: 400 }
      )
    }

    if (!validStatuses.includes(registration2.registrationStatus)) {
      return NextResponse.json(
        { error: `${registration2.player.firstName} ${registration2.player.lastName} debe estar confirmado o haber pagado para formar un equipo` },
        { status: 400 }
      )
    }

    // 5. Verificar que ninguno esté ya en otro equipo en esta categoría
    const existingTeams = await prisma.team.findMany({
      where: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        OR: [
          { registration1Id: validatedData.registration1Id },
          { registration1Id: validatedData.registration2Id },
          { registration2Id: validatedData.registration1Id },
          { registration2Id: validatedData.registration2Id },
        ]
      },
      include: {
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
    })

    if (existingTeams.length > 0) {
      const team = existingTeams[0]
      return NextResponse.json(
        {
          error: `Ya existe un equipo con uno o ambos jugadores en esta categoría: "${team.name || `${team.registration1.player.firstName} ${team.registration1.player.lastName} / ${team.registration2.player.firstName} ${team.registration2.player.lastName}`}"`
        },
        { status: 400 }
      )
    }

    // 6. Crear el equipo
    const team = await prisma.team.create({
      data: {
        tournamentId: validatedData.tournamentId,
        categoryId: validatedData.categoryId,
        registration1Id: validatedData.registration1Id,
        registration2Id: validatedData.registration2Id,
        name: validatedData.name,
        notes: validatedData.notes,
        status: 'CONFIRMED', // El equipo está confirmado porque ambos jugadores ya pagaron/confirmaron
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
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
              }
            }
          }
        }
      }
    })

    // 7. Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.REGISTRATION,
      resourceId: team.id,
      description: `Equipo creado: ${team.name || `${registration1.player.firstName} ${registration1.player.lastName} / ${registration2.player.firstName} ${registration2.player.lastName}`} - ${tournament.name}`,
      newData: team,
    }, request)

    // Log team creation
    await TeamLogService.logTeamCreated(
      {
        userId: session.user.id,
        teamId: team.id
      },
      team
    )

    return NextResponse.json(team, { status: 201 })

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
