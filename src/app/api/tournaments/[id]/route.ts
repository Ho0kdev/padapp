import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { z } from "zod"

const updateTournamentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  description: z.string().optional(),
  type: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN",
    "SWISS",
    "GROUP_STAGE_ELIMINATION",
    "AMERICANO",
    "AMERICANO_SOCIAL"
  ], {
    message: "El tipo de torneo es requerido"
  }),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CLUB_MEMBERS"]).default("PUBLIC"),
  registrationStart: z.string().transform((str) => new Date(str)),
  registrationEnd: z.string().transform((str) => new Date(str)),
  tournamentStart: z.string().transform((str) => new Date(str)),
  tournamentEnd: z.string().transform((str) => new Date(str)).optional(),
  maxParticipants: z.number().int().positive("Debe ser un número positivo").optional(),
  minParticipants: z.number().int().positive("Debe ser un número positivo").min(2, "Mínimo 2 participantes"),
  registrationFee: z.number().min(0, "La tarifa no puede ser negativa"),
  prizePool: z.number().min(0, "El premio no puede ser negativo"),
  setsToWin: z.number().int().positive("Debe ser un número positivo").min(1, "Mínimo 1 set"),
  gamesToWinSet: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo 4 games"),
  tiebreakAt: z.number().int().positive("Debe ser un número positivo").min(4, "Mínimo en 4 games"),
  goldenPoint: z.boolean(),
  americanoRounds: z.number().int().min(1, "Mínimo 1 ronda").max(10, "Máximo 10 rondas").optional(),
  mainClubId: z.string().min(1, "El club principal es requerido"),
  rules: z.string().optional(),
  prizesDescription: z.string().optional(),
  logoUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  categories: z.array(z.object({
    categoryId: z.string(),
    maxTeams: z.number().int().positive().optional(),
    registrationFee: z.number().min(0).optional(),
    prizePool: z.number().min(0).optional(),
  })).min(1, "Debe seleccionar al menos una categoría"),
  clubs: z.array(z.string()).optional(),
}).refine((data) => {
  return data.registrationEnd > data.registrationStart
}, {
  message: "La fecha de fin de inscripciones debe ser posterior al inicio",
  path: ["registrationEnd"]
}).refine((data) => {
  return data.tournamentStart > data.registrationEnd
}, {
  message: "La fecha de inicio del torneo debe ser posterior al fin de inscripciones",
  path: ["tournamentStart"]
}).refine((data) => {
  if (data.tournamentEnd) {
    return data.tournamentEnd >= data.tournamentStart
  }
  return true
}, {
  message: "La fecha de fin del torneo debe ser igual o posterior al inicio",
  path: ["tournamentEnd"]
}).refine((data) => {
  if (data.maxParticipants) {
    return data.maxParticipants >= data.minParticipants
  }
  return true
}, {
  message: "El máximo de participantes debe ser mayor o igual al mínimo",
  path: ["maxParticipants"]
})

// GET /api/tournaments/[id] - Obtener torneo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true }
        },
        mainClub: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            courts: {
              select: {
                id: true,
                name: true,
                deleted: true,
                status: true
              }
            }
          }
        },
        categories: {
          include: {
            category: true,
            teams: {
              include: {
                registration1: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                },
                registration2: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            }
          }
        },
        clubs: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                courts: {
                  select: {
                    id: true,
                    name: true,
                    deleted: true,
                    status: true
                  }
                }
              }
            }
          }
        },
        teams: {
          include: {
            registration1: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            registration2: {
              select: {
                player: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            category: {
              select: { name: true }
            }
          }
        },
        matches: {
          include: {
            team1: {
              include: {
                registration1: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                },
                registration2: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            },
            team2: {
              include: {
                registration1: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                },
                registration2: {
                  select: {
                    player: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            },
            court: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            teams: true,
            matches: true
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

    return NextResponse.json(tournament)

  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT /api/tournaments/[id] - Actualizar torneo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()

    // Verificar que el torneo existe y obtener datos para logging
    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        clubs: {
          include: {
            club: true
          }
        }
      }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos (solo el organizador, club_admin o admin puede editar)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isOwner = existingTournament.organizerId === session.user.id
    const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

    if (!isOwner && !isAdminOrClubAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para editar este torneo" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateTournamentSchema.parse(body)
    const { categories, clubs, ...tournamentData } = validatedData

    // Verificar que no se pueda editar un torneo que ya está completado
    if (existingTournament.status === "COMPLETED") {
      return NextResponse.json(
        { error: "No se puede editar un torneo que ya está completado" },
        { status: 400 }
      )
    }

    // Si el torneo ya está en progreso, solo permitir cambios de estado o campos menores
    if (existingTournament.status === "IN_PROGRESS" && validatedData.status !== "IN_PROGRESS") {
      // Lista de campos que se pueden modificar cuando el torneo está en progreso
      const allowedFieldsWhileInProgress = ['status', 'description']
      const changedFields = Object.keys(tournamentData).filter(
        key => tournamentData[key as keyof typeof tournamentData] !== (existingTournament as any)[key]
      )

      const hasUnallowedChanges = changedFields.some(field => !allowedFieldsWhileInProgress.includes(field))

      if (hasUnallowedChanges) {
        return NextResponse.json(
          { error: "No se pueden modificar los detalles de un torneo que ya está en progreso. Solo se puede cambiar el estado o la descripción." },
          { status: 400 }
        )
      }
    }

    // Verificar que el club principal esté activo
    const mainClub = await prisma.club.findUnique({
      where: { id: validatedData.mainClubId },
      select: { status: true, name: true }
    })

    if (!mainClub) {
      return NextResponse.json(
        { error: "El club principal seleccionado no existe" },
        { status: 400 }
      )
    }

    if (mainClub.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `El club principal "${mainClub.name}" no está activo` },
        { status: 400 }
      )
    }

    // Verificar que todos los clubes participantes estén activos
    if (clubs && clubs.length > 0) {
      const inactiveClubs = await prisma.club.findMany({
        where: {
          id: { in: clubs },
          status: { not: "ACTIVE" }
        },
        select: { id: true, name: true, status: true }
      })

      if (inactiveClubs.length > 0) {
        const inactiveClubNames = inactiveClubs.map(club => club.name).join(", ")
        return NextResponse.json(
          { error: `Los siguientes clubes no están activos: ${inactiveClubNames}` },
          { status: 400 }
        )
      }
    }

    // Preparar los datos de actualización
    const updateData: any = { ...tournamentData }

    // Manejar categorías si se proporcionan
    if (categories && categories.length > 0) {
      // Comparar con las categorías actuales
      const currentCategories = existingTournament.categories.map((tc: any) => ({
        categoryId: tc.categoryId,
        maxTeams: tc.maxTeams || undefined,
        registrationFee: tc.registrationFee || undefined,
        prizePool: tc.prizePool || undefined,
      }))

      // Normalizar las categorías nuevas para comparación
      const newCategories = categories.map((cat: any) => ({
        categoryId: cat.categoryId,
        maxTeams: cat.maxTeams || undefined,
        registrationFee: cat.registrationFee || undefined,
        prizePool: cat.prizePool || undefined,
      }))

      // Verificar si las categorías realmente cambiaron
      const categoriesChanged = JSON.stringify(currentCategories.sort((a: any, b: any) => a.categoryId.localeCompare(b.categoryId))) !==
                                JSON.stringify(newCategories.sort((a: any, b: any) => a.categoryId.localeCompare(b.categoryId)))

      if (categoriesChanged) {
        // Detectar qué categorías se están eliminando
        const currentCategoryIds = currentCategories.map((c: any) => c.categoryId)
        const newCategoryIds = newCategories.map((c: any) => c.categoryId)
        const categoriesToDelete = currentCategoryIds.filter((id: string) => !newCategoryIds.includes(id))

        // Si se están eliminando categorías, verificar que no tengan equipos ni inscripciones
        if (categoriesToDelete.length > 0) {
          // Verificar equipos en las categorías a eliminar
          const teamsInDeletedCategories = await prisma.team.findMany({
            where: {
              tournamentId: id,
              categoryId: { in: categoriesToDelete }
            },
            include: {
              category: { select: { name: true } }
            }
          })

          if (teamsInDeletedCategories.length > 0) {
            const categoryNames = [...new Set(teamsInDeletedCategories.map(t => t.category.name))].join(', ')
            return NextResponse.json(
              { error: `No se pueden eliminar las categorías con equipos formados: ${categoryNames}. Elimina los equipos de estas categorías primero.` },
              { status: 400 }
            )
          }

          // Verificar inscripciones en las categorías a eliminar
          const registrationsInDeletedCategories = await prisma.registration.findMany({
            where: {
              tournamentId: id,
              categoryId: { in: categoriesToDelete }
            },
            include: {
              category: { select: { name: true } }
            }
          })

          if (registrationsInDeletedCategories.length > 0) {
            const categoryNames = [...new Set(registrationsInDeletedCategories.map(r => r.category.name))].join(', ')
            return NextResponse.json(
              { error: `No se pueden eliminar las categorías con inscripciones: ${categoryNames}. Elimina las inscripciones de estas categorías primero.` },
              { status: 400 }
            )
          }
        }

        // Si pasó todas las validaciones, actualizar categorías de forma granular

        // 1. Identificar qué categorías son nuevas y cuáles ya existen
        const categoriesToCreate = newCategoryIds.filter((id: string) => !currentCategoryIds.includes(id))

        // Construir el objeto de actualización
        updateData.categories = {}

        // 2. Eliminar solo las categorías que se están quitando (ya validamos que están vacías)
        if (categoriesToDelete.length > 0) {
          updateData.categories.deleteMany = {
            tournamentId: id,
            categoryId: { in: categoriesToDelete }
          }
        }

        // 3. Crear solo las categorías nuevas
        if (categoriesToCreate.length > 0) {
          updateData.categories.create = categories
            .filter((cat: any) => categoriesToCreate.includes(cat.categoryId))
            .map((cat: any) => ({
              categoryId: cat.categoryId,
              maxTeams: cat.maxTeams,
              registrationFee: cat.registrationFee,
              prizePool: cat.prizePool,
            }))
        }

        // 4. Actualizar las existentes que cambiaron valores
        const categoriesToUpdate = newCategories.filter((newCat: any) => {
          const currentCat = currentCategories.find((c: any) => c.categoryId === newCat.categoryId)
          if (!currentCat) return false // Es nueva, no update
          // Comparar si cambió algún valor
          return currentCat.maxTeams !== newCat.maxTeams ||
                 currentCat.registrationFee !== newCat.registrationFee ||
                 currentCat.prizePool !== newCat.prizePool
        })

        if (categoriesToUpdate.length > 0) {
          updateData.categories.update = categoriesToUpdate.map((cat: any) => ({
            where: {
              tournamentId_categoryId: {
                tournamentId: id,
                categoryId: cat.categoryId
              }
            },
            data: {
              maxTeams: cat.maxTeams,
              registrationFee: cat.registrationFee,
              prizePool: cat.prizePool,
            }
          }))
        }
      }
      // Si no cambiaron, no hacer nada (no incluir updateData.categories)
    }

    // Manejar clubes si se proporcionan
    if (clubs && clubs.length > 0) {
      // Comparar con los clubes actuales
      const currentClubs = existingTournament.clubs.map((tc: any) => tc.clubId).sort()
      const newClubs = [...clubs].sort()

      // Verificar si los clubes realmente cambiaron
      const clubsChanged = JSON.stringify(currentClubs) !== JSON.stringify(newClubs)

      if (clubsChanged) {
        updateData.clubs = {
          deleteMany: {},
          create: clubs.map((clubId: string) => ({
            clubId
          }))
        }
      }
      // Si no cambiaron, no hacer nada
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: updateData,
      include: {
        organizer: {
          select: { name: true, email: true }
        },
        mainClub: {
          select: { name: true }
        },
        categories: {
          include: {
            category: true
          }
        },
        clubs: {
          include: {
            club: true
          }
        }
      }
    })

    // Si el estado cambió a IN_PROGRESS, cancelar inscripciones y equipos no confirmados
    if (existingTournament.status !== 'IN_PROGRESS' && tournament.status === 'IN_PROGRESS') {
      const { TournamentStatusService } = await import('@/lib/services/tournament-status-service')
      const cancellationResult = await TournamentStatusService.cancelUnconfirmedRegistrations(
        tournament.id,
        session.user.id
      )

      if (cancellationResult.success && cancellationResult.cancelledRegistrations > 0) {
        console.log(`✅ Torneo ${tournament.id} pasó a IN_PROGRESS: ${cancellationResult.cancelledRegistrations} inscripciones y ${cancellationResult.cancelledTeams} equipos cancelados automáticamente`)
      }
    }

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: tournament.id,
        description: `Torneo ${tournament.name} actualizado`,
        oldData: existingTournament,
        newData: tournament,
      },
      request
    )

    return NextResponse.json(tournament)

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

// DELETE /api/tournaments/[id] - Eliminar torneo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.DELETE, Resource.TOURNAMENT)

    const { id } = await params
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true } }
      }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos contextuales
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isOwner = existingTournament.organizerId === session.user.id
    const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"

    if (!isOwner && !isAdminOrClubAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este torneo" },
        { status: 403 }
      )
    }

    // Verificar que no se pueda eliminar un torneo con equipos inscritos
    if (existingTournament._count.teams > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un torneo que tiene equipos inscritos" },
        { status: 400 }
      )
    }

    // Registrar en el log antes de eliminar
    await prisma.tournament.delete({
      where: { id }
    })

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.DELETE,
        resource: Resource.TOURNAMENT,
        resourceId: id,
        description: `Torneo ${existingTournament.name} eliminado`,
        oldData: existingTournament,
      },
      request
    )

    return NextResponse.json({ message: "Torneo eliminado exitosamente" })

  } catch (error) {
    return handleAuthError(error)
  }
}