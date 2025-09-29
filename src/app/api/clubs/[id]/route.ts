import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clubEditSchema } from "@/lib/validations/club"
import { ClubLogService } from "@/lib/services/club-log-service"
import { z } from "zod"

// GET /api/clubs/[id] - Obtener un club específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        courts: {
          where: {
            deleted: false
          },
          select: {
            id: true,
            name: true,
            surface: true,
            status: true
          }
        },
        tournaments: {
          where: {
            status: {
              in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
            }
          },
          select: {
            id: true,
            name: true,
            status: true,
            tournamentStart: true
          },
          orderBy: { tournamentStart: 'desc' },
          take: 10
        },
        _count: {
          select: {
            courts: {
              where: {
                deleted: false
              }
            },
            tournaments: {
              where: {
                status: {
                  in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
                }
              }
            },
            tournamentClubs: {
              where: {
                tournament: {
                  status: {
                    in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
                  },
                  mainClubId: {
                    not: id
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!club) {
      return NextResponse.json(
        { error: "Club no encontrado" },
        { status: 404 }
      )
    }

    // Obtener torneos donde participa como sede auxiliar (excluyendo donde es sede principal)
    const auxiliaryTournaments = await prisma.tournamentClub.findMany({
      where: {
        clubId: id,
        tournament: {
          status: {
            in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
          },
          mainClubId: {
            not: id  // Excluir torneos donde es sede principal
          }
        }
      },
      select: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            tournamentStart: true,
            mainClub: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        tournament: {
          tournamentStart: 'desc'
        }
      },
      take: 10
    })

    // Combinar la información
    const clubWithAuxiliaryTournaments = {
      ...club,
      auxiliaryTournaments: auxiliaryTournaments.map(at => ({
        ...at.tournament,
        mainClubName: at.tournament.mainClub?.name || 'Desconocido'
      }))
    }

    return NextResponse.json(clubWithAuxiliaryTournaments)

  } catch (error) {
    console.error("Error fetching club:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/clubs/[id] - Actualizar club
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden editar clubes" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Si solo está cambiando el status, usar un endpoint simple
    if (Object.keys(body).length === 1 && body.status) {
      const validStatus = ["ACTIVE", "INACTIVE", "MAINTENANCE"]
      if (!validStatus.includes(body.status)) {
        return NextResponse.json(
          { error: "Estado inválido" },
          { status: 400 }
        )
      }

      const existingClub = await prisma.club.findUnique({
        where: { id }
      })

      if (!existingClub) {
        return NextResponse.json(
          { error: "Club no encontrado" },
          { status: 404 }
        )
      }

      const club = await prisma.club.update({
        where: { id },
        data: { status: body.status },
        include: {
          _count: {
            select: {
              courts: {
                where: {
                  deleted: false
                }
              },
              tournaments: true
            }
          }
        }
      })


      await ClubLogService.logClubStatusChanged(
        { userId: session.user.id, clubId: club.id },
        club,
        existingClub.status,
        body.status
      )

      return NextResponse.json(club)
    }

    const validatedData = clubEditSchema.parse(body)

    // Verificar que el club existe
    const existingClub = await prisma.club.findUnique({
      where: { id }
    })

    if (!existingClub) {
      return NextResponse.json(
        { error: "Club no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que no exista otro club con el mismo nombre en la misma ciudad
    const duplicateClub = await prisma.club.findFirst({
      where: {
        name: validatedData.name,
        city: validatedData.city,
        status: "ACTIVE",
        id: { not: id }
      }
    })

    if (duplicateClub) {
      return NextResponse.json(
        { error: "Ya existe otro club con ese nombre en la misma ciudad" },
        { status: 400 }
      )
    }

    const club = await prisma.club.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        country: validatedData.country,
        postalCode: validatedData.postalCode,
        phone: validatedData.phone,
        email: validatedData.email,
        website: validatedData.website,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        logoUrl: validatedData.logoUrl,
      },
      include: {
        _count: {
          select: {
            courts: {
              where: {
                deleted: false
              }
            },
            tournaments: true
          }
        }
      }
    })

    // Log la actualización del club
    await ClubLogService.logClubUpdated(
      { userId: session.user.id, clubId: club.id },
      existingClub,
      club
    )

    return NextResponse.json(club)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating club:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/clubs/[id] - Eliminar club
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden eliminar clubes" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que el club existe
    const existingClub = await prisma.club.findUnique({
      where: { id }
    })

    if (!existingClub) {
      return NextResponse.json(
        { error: "Club no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que no tenga torneos activos
    const activeTournamentsAsHost = await prisma.tournament.count({
      where: {
        mainClubId: id,
        status: {
          in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
        }
      }
    })

    if (activeTournamentsAsHost > 0) {
      return NextResponse.json(
        { error: "No se puede desactivar un club que es sede de torneos activos" },
        { status: 400 }
      )
    }

    const activeTournamentsAsParticipant = await prisma.tournamentClub.count({
      where: {
        clubId: id,
        tournament: {
          status: {
            in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
          }
        }
      }
    })

    if (activeTournamentsAsParticipant > 0) {
      return NextResponse.json(
        { error: "No se puede desactivar un club que participa en torneos activos" },
        { status: 400 }
      )
    }

    // En lugar de eliminar, cambiar status a INACTIVE
    const club = await prisma.club.update({
      where: { id },
      data: { status: "INACTIVE" }
    })

    // Log la desactivación del club
    await ClubLogService.logClubStatusChanged(
      {
        userId: session.user.id,
        clubId: club.id,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      club,
      existingClub.status,
      "INACTIVE"
    )

    return NextResponse.json({
      message: "Club desactivado exitosamente",
      club
    })

  } catch (error) {
    console.error("Error deleting club:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}

// PATCH /api/clubs/[id] - Activar club inactivo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden activar clubes" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que el club existe y está inactivo
    const existingClub = await prisma.club.findUnique({
      where: { id }
    })

    if (!existingClub) {
      return NextResponse.json(
        { error: "Club no encontrado" },
        { status: 404 }
      )
    }

    if (existingClub.status === "ACTIVE") {
      return NextResponse.json(
        { error: "El club ya está activo" },
        { status: 400 }
      )
    }

    // Activar el club
    const club = await prisma.club.update({
      where: { id },
      data: { status: "ACTIVE" }
    })

    // Log la activación del club
    await ClubLogService.logClubStatusChanged(
      {
        userId: session.user.id,
        clubId: club.id,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      club,
      existingClub.status,
      "ACTIVE"
    )

    return NextResponse.json({
      message: "Club activado exitosamente",
      club
    })

  } catch (error) {
    console.error("Error activating club:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}