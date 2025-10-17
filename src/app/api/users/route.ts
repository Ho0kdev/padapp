import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus, Gender } from '@prisma/client'
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from '@/lib/rbac'
import { checkRateLimit } from '@/lib/rbac/rate-limit'
import { UserLogService } from '@/lib/services/user-log-service'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const gender = searchParams.get('gender') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        {
          player: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ]
    }

    if (role && role !== 'all') {
      where.role = role as UserRole
    }

    if (status && status !== 'all') {
      where.status = status as UserStatus
    }

    if (gender && gender !== 'all') {
      where.player = {
        ...where.player,
        gender: gender as Gender
      }
    }

    // Get total count
    const total = await prisma.user.count({ where })

    // Get users with player info
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        player: {
          include: {
            primaryCategory: true,
            rankings: {
              include: {
                category: true
              },
              where: {
                seasonYear: new Date().getFullYear(),
                category: {
                  isActive: true
                }
              }
            },
            registrations: {
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
            status: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Get global stats (unfiltered)
    const [totalPlayers, totalActive, totalOrganizers] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.PLAYER } }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({
        where: {
          OR: [
            { role: UserRole.CLUB_ADMIN },
            { role: UserRole.ADMIN }
          ]
        }
      })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalUsers: await prisma.user.count(),
        totalPlayers,
        totalActive,
        totalOrganizers
      }
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para escritura
    await checkRateLimit(request, 'write')

    // Verificar que el usuario puede crear usuarios
    const session = await authorize(Action.CREATE, Resource.USER)

    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      password,
      role = UserRole.PLAYER,
      status = UserStatus.ACTIVE,
      createPlayer = true,
      // Player info
      phone,
      dateOfBirth,
      gender,
      dominantHand,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      medicalNotes,
      rankingPoints = 0,
      categoryId,
      profileImageUrl
    } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, nombre y apellido son requeridos' },
        { status: 400 }
      )
    }

    // Generar nombre completo
    const name = `${firstName} ${lastName}`

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      )
    }

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      const bcrypt = require('bcryptjs')
      hashedPassword = await bcrypt.hash(password, 12)
    }

    // Create user with player profile
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        status,
        player: createPlayer ? {
          create: {
            firstName,
            lastName,
            phone,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender,
            dominantHand,
            emergencyContactName,
            emergencyContactPhone,
            bloodType,
            medicalNotes,
            rankingPoints,
            primaryCategoryId: categoryId,
            profileImageUrl
          }
        } : undefined
      },
      include: {
        player: true
      }
    })

    // Create player ranking if category is specified
    if (createPlayer && categoryId && user.player) {
      await prisma.playerRanking.create({
        data: {
          playerId: user.player.id,
          categoryId,
          currentPoints: rankingPoints,
          seasonYear: new Date().getFullYear()
        }
      })
    }

    // Log user creation
    await UserLogService.logUserCreated(
      {
        userId: session.user.id,
        targetUserId: user.id
      },
      user
    )

    return NextResponse.json(user, { status: 201 })

  } catch (error) {
    return handleAuthError(error)
  }
}