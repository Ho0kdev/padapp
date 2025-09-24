import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole, UserStatus, Gender } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        player: {
          include: {
            rankings: {
              include: {
                category: true
              },
              orderBy: {
                currentPoints: 'desc'
              }
            },
            team1Memberships: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    type: true,
                    tournamentStart: true,
                    tournamentEnd: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                player2: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            team2Memberships: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    type: true,
                    tournamentStart: true,
                    tournamentEnd: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                player1: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            tournamentStats: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        organizerTournaments: {
          select: {
            id: true,
            name: true,
            status: true,
            type: true,
            tournamentStart: true,
            tournamentEnd: true,
            _count: {
              select: {
                teams: true
              }
            }
          }
        },
        notifications: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check permissions - users can only view their own profile unless admin
    if (session.user.id !== user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      name,
      email,
      role,
      status,
      // Player info
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      dominantHand,
      profileImageUrl,
      emergencyContactName,
      emergencyContactPhone,
      medicalNotes,
      rankingPoints,
      categoryId
    } = body

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        player: {
          include: {
            team1Memberships: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                }
              }
            },
            team2Memberships: {
              include: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                }
              }
            }
          }
        },
        organizerTournaments: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    const canEdit = session.user.id === id || session.user.role === UserRole.ADMIN

    if (!canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Check if user is being deactivated and has active tournaments
    if (status === 'INACTIVE' && existingUser.status === 'ACTIVE') {
      const activeTournaments = []

      // Check player memberships
      if (existingUser.player) {
        existingUser.player.team1Memberships?.forEach(membership => {
          if (membership.tournament.status !== 'COMPLETED' && membership.tournament.status !== 'CANCELLED') {
            activeTournaments.push(membership.tournament.name)
          }
        })
        existingUser.player.team2Memberships?.forEach(membership => {
          if (membership.tournament.status !== 'COMPLETED' && membership.tournament.status !== 'CANCELLED') {
            activeTournaments.push(membership.tournament.name)
          }
        })
      }

      // Check organizer tournaments
      existingUser.organizerTournaments?.forEach(tournament => {
        if (tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED') {
          activeTournaments.push(tournament.name)
        }
      })

      if (activeTournaments.length > 0) {
        return NextResponse.json(
          {
            error: `No se puede desactivar este usuario porque está inscrito en ${activeTournaments.length} torneo(s) activo(s): ${activeTournaments.join(', ')}.`
          },
          { status: 400 }
        )
      }
    }

    // Only admins can change role and status
    const userUpdate: any = {}

    if (session.user.role === UserRole.ADMIN) {
      if (name !== undefined) userUpdate.name = name
      if (email !== undefined) userUpdate.email = email
      if (role !== undefined) userUpdate.role = role
      if (status !== undefined) userUpdate.status = status
    } else {
      // Regular users can only update their name
      if (name !== undefined) userUpdate.name = name
    }

    // Check if there's something to update
    if (Object.keys(userUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    // Build player update data
    const playerUpdate: any = {}
    if (firstName !== undefined) playerUpdate.firstName = firstName
    if (lastName !== undefined) playerUpdate.lastName = lastName
    if (phone !== undefined) playerUpdate.phone = phone
    if (dateOfBirth !== undefined) playerUpdate.dateOfBirth = new Date(dateOfBirth)
    if (gender !== undefined) playerUpdate.gender = gender
    if (dominantHand !== undefined) playerUpdate.dominantHand = dominantHand
    if (profileImageUrl !== undefined) playerUpdate.profileImageUrl = profileImageUrl
    if (emergencyContactName !== undefined) playerUpdate.emergencyContactName = emergencyContactName
    if (emergencyContactPhone !== undefined) playerUpdate.emergencyContactPhone = emergencyContactPhone
    if (medicalNotes !== undefined) playerUpdate.medicalNotes = medicalNotes
    if (session.user.role === UserRole.ADMIN && rankingPoints !== undefined) playerUpdate.rankingPoints = rankingPoints

    // Update user and player info
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userUpdate,
        ...(existingUser.player && Object.keys(playerUpdate).length > 0 && {
          player: {
            update: playerUpdate
          }
        })
      },
      include: {
        player: {
          include: {
            rankings: {
              include: {
                category: true
              }
            }
          }
        }
      }
    })

    // Handle primary category change if specified and player exists
    if (categoryId && user.player) {
      // Update the primary category
      await prisma.player.update({
        where: { id: user.player.id },
        data: { primaryCategoryId: categoryId }
      })

      // Also ensure player has a ranking in this category
      const currentYear = new Date().getFullYear()
      const existingRanking = await prisma.playerRanking.findUnique({
        where: {
          playerId_categoryId_seasonYear: {
            playerId: user.player.id,
            categoryId: categoryId,
            seasonYear: currentYear
          }
        }
      })

      if (!existingRanking) {
        // Create new ranking for the category
        await prisma.playerRanking.create({
          data: {
            playerId: user.player.id,
            categoryId: categoryId,
            currentPoints: user.player.rankingPoints || 0,
            seasonYear: currentYear
          }
        })
      }
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Error updating user:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: id,
      userUpdate,
      body
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        player: {
          include: {
            team1Memberships: true,
            team2Memberships: true
          }
        },
        organizerTournaments: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check if user has active tournaments as organizer
    const activeTournaments = user.organizerTournaments.filter(
      t => t.status !== 'CANCELLED' && t.status !== 'COMPLETED'
    )

    if (activeTournaments.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un usuario con torneos activos como organizador' },
        { status: 400 }
      )
    }

    // Check if player has active team memberships
    const activeTeams = [
      ...user.player?.team1Memberships || [],
      ...user.player?.team2Memberships || []
    ]

    if (activeTeams.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un usuario con equipos activos' },
        { status: 400 }
      )
    }

    // Soft delete - change status instead of actual deletion
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        email: `deleted_${Date.now()}_${user.email}`
      }
    })

    return NextResponse.json({ message: 'Usuario desactivado exitosamente' })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Activar usuario
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
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

    if (user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Solo los administradores pueden activar usuarios" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Activar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE
      },
      include: {
        player: {
          include: {
            rankings: {
              include: {
                category: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error("Error activating user:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}