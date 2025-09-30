import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus, Gender } from '@prisma/client'
import { requireAuth, handleAuthError } from '@/lib/rbac'

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
            { role: UserRole.ORGANIZER },
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
    // Verificar que el usuario puede crear usuarios
    const session = await authorize(Action.CREATE, Resource.USER)

    const body = await request.json()
    const {
      email,
      name,
      password,
      role = UserRole.PLAYER,
      status = UserStatus.ACTIVE,
      createPlayer = true,
      // Player info
      firstName,
      lastName,
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

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email y nombre son requeridos' },
        { status: 400 }
      )
    }

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
            firstName: firstName || name.split(' ')[0] || name,
            lastName: lastName || name.split(' ').slice(1).join(' ') || '',
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

    return NextResponse.json(user, { status: 201 })

  } catch (error) {
    return handleAuthError(error)
  }
}