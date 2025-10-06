import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus, Gender } from '@prisma/client'
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from '@/lib/rbac'
import { invalidateUserCache } from '@/lib/rbac/cache'
import { rateLimit, RateLimitPresets } from '@/lib/rbac/rate-limit'
import { UserLogService } from '@/lib/services/user-log-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await requireAuth()

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
              where: {
                category: {
                  isActive: true
                }
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

    // Verificar permisos usando el nuevo sistema RBAC
    await authorize(Action.READ, Resource.USER, user)

    // Auditar acceso a perfil de otro usuario (solo si no es el mismo)
    if (session.user.id !== id) {
      await AuditLogger.log(
        session,
        {
          action: Action.READ,
          resource: Resource.USER,
          resourceId: id,
          description: `Usuario ${session.user.email} consultó perfil de ${user.email}`,
        },
        request
      )
    }

    return NextResponse.json(user)

  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Rate limiting moderado: 20 intentos por minuto
    const rateLimitResponse = await rateLimit(request, RateLimitPresets.MODERATE)
    if (rateLimitResponse) return rateLimitResponse

    const session = await requireAuth()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      role,
      status,
      createPlayer,
      // Player info
      phone,
      dateOfBirth,
      gender,
      dominantHand,
      profileImageUrl,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      medicalNotes,
      rankingPoints,
      categoryId
    } = body

    // Generar nombre completo si se proporcionan firstName y lastName
    const name = (firstName && lastName) ? `${firstName} ${lastName}` : undefined

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        player: {
          include: {
            registrations: {
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

    // Verificar permisos usando el nuevo sistema RBAC
    await authorize(Action.UPDATE, Resource.USER, existingUser)

    // Check if user is being deactivated and has active tournaments
    if (status === 'INACTIVE' && existingUser.status === 'ACTIVE') {
      const activeTournaments = []

      // Check player registrations
      if (existingUser.player) {
        existingUser.player.registrations?.forEach(registration => {
          if (registration.tournament.status !== 'COMPLETED' && registration.tournament.status !== 'CANCELLED') {
            activeTournaments.push(registration.tournament.name)
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
    let roleOrStatusChanged = false

    if (session.user.role === UserRole.ADMIN) {
      if (name !== undefined) userUpdate.name = name
      if (email !== undefined) userUpdate.email = email
      if (role !== undefined) {
        userUpdate.role = role
        roleOrStatusChanged = existingUser.role !== role
      }
      if (status !== undefined) {
        userUpdate.status = status
        roleOrStatusChanged = roleOrStatusChanged || existingUser.status !== status
      }
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

    // Handle player activation/deactivation
    if (createPlayer !== undefined && existingUser.player) {
      // Solo permitir activar jugador si el usuario está activo
      if (createPlayer && status === UserStatus.INACTIVE) {
        return NextResponse.json(
          { error: 'No se puede activar un jugador mientras el usuario esté inactivo' },
          { status: 400 }
        )
      }
      // Si el usuario actual está inactivo, no permitir activar jugador
      if (createPlayer && existingUser.status === UserStatus.INACTIVE && status !== UserStatus.ACTIVE) {
        return NextResponse.json(
          { error: 'No se puede activar un jugador mientras el usuario esté inactivo. Active primero el usuario.' },
          { status: 400 }
        )
      }
      playerUpdate.isActive = createPlayer
    }

    // Si el usuario se está desactivando, desactivar también al jugador
    if (status === UserStatus.INACTIVE && existingUser.player && existingUser.player.isActive) {
      playerUpdate.isActive = false
    }

    if (firstName !== undefined) playerUpdate.firstName = firstName
    if (lastName !== undefined) playerUpdate.lastName = lastName
    if (phone !== undefined) playerUpdate.phone = phone
    if (dateOfBirth !== undefined) playerUpdate.dateOfBirth = new Date(dateOfBirth)
    if (gender !== undefined) playerUpdate.gender = gender
    if (dominantHand !== undefined) playerUpdate.dominantHand = dominantHand
    if (profileImageUrl !== undefined) playerUpdate.profileImageUrl = profileImageUrl
    if (emergencyContactName !== undefined) playerUpdate.emergencyContactName = emergencyContactName
    if (emergencyContactPhone !== undefined) playerUpdate.emergencyContactPhone = emergencyContactPhone
    if (bloodType !== undefined) playerUpdate.bloodType = bloodType
    if (medicalNotes !== undefined) playerUpdate.medicalNotes = medicalNotes
    if (session.user.role === UserRole.ADMIN && rankingPoints !== undefined) {
      playerUpdate.rankingPoints = rankingPoints
    }

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

      // Also ensure player has a ranking in this category and update points
      const currentYear = new Date().getFullYear()
      const pointsToUse = rankingPoints !== undefined ? rankingPoints : user.player.rankingPoints || 0

      const existingRanking = await prisma.playerRanking.findUnique({
        where: {
          playerId_categoryId_seasonYear: {
            playerId: user.player.id,
            categoryId: categoryId,
            seasonYear: currentYear
          }
        }
      })

      if (existingRanking) {
        // Update existing ranking with new points
        await prisma.playerRanking.update({
          where: { id: existingRanking.id },
          data: {
            currentPoints: pointsToUse,
            lastUpdated: new Date()
          }
        })
      } else {
        // Create new ranking for the category
        await prisma.playerRanking.create({
          data: {
            playerId: user.player.id,
            categoryId: categoryId,
            currentPoints: pointsToUse,
            seasonYear: currentYear
          }
        })
      }
    }

    // Invalidar caché si cambió role o status
    if (roleOrStatusChanged) {
      invalidateUserCache(id)
    }

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.USER,
        resourceId: id,
        description: `Usuario ${user.email} actualizado`,
        oldData: existingUser,
        newData: user,
      },
      request
    )

    // Log user update
    await UserLogService.logUserUpdated(
      {
        userId: session.user.id,
        targetUserId: id
      },
      existingUser,
      user
    )

    // Log specific changes
    if (role !== undefined && existingUser.role !== role) {
      await UserLogService.logUserRoleChanged(
        { userId: session.user.id, targetUserId: id },
        user,
        existingUser.role,
        role
      )
    }

    if (status !== undefined && existingUser.status !== status) {
      await UserLogService.logUserStatusChanged(
        { userId: session.user.id, targetUserId: id },
        user,
        existingUser.status,
        status
      )
    }

    return NextResponse.json(user)

  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Rate limiting estricto para DELETE: 5 intentos por minuto
    const rateLimitResponse = await rateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // Verificar que sea ADMIN
    const session = await authorize(Action.DELETE, Resource.USER)

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
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        email: `deleted_${Date.now()}_${user.email}`
      }
    })

    // Invalidar caché porque cambió el status
    invalidateUserCache(id)

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.DELETE,
        resource: Resource.USER,
        resourceId: id,
        description: `Usuario ${user.email} desactivado`,
        oldData: user,
        newData: updatedUser,
      },
      request
    )

    // Log user deletion
    await UserLogService.logUserDeleted(
      {
        userId: session.user.id,
        targetUserId: id
      },
      user
    )

    return NextResponse.json({ message: 'Usuario desactivado exitosamente' })

  } catch (error) {
    return handleAuthError(error)
  }
}

// PATCH /api/users/[id] - Activar usuario
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar que sea ADMIN
    const session = await authorize(Action.UPDATE, Resource.USER)

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

    // Invalidar caché porque cambió el status
    invalidateUserCache(id)

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.USER,
        resourceId: id,
        description: `Usuario ${existingUser.email} activado`,
        oldData: existingUser,
        newData: updatedUser,
      },
      request
    )

    // Log status change
    await UserLogService.logUserStatusChanged(
      {
        userId: session.user.id,
        targetUserId: id
      },
      updatedUser,
      existingUser.status,
      UserStatus.ACTIVE
    )

    return NextResponse.json(updatedUser)

  } catch (error) {
    return handleAuthError(error)
  }
}