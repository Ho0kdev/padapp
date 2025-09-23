import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { categoryFormSchema } from "@/lib/validations/category"
import { z } from "zod"

// GET /api/categories - Obtener lista de categorías
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const type = searchParams.get("type")
    const isActive = searchParams.get("isActive")
    const search = searchParams.get("search")

    const skip = (page - 1) * limit

    const where: any = {}

    if (type) {
      where.type = type
    }

    if (isActive !== null && isActive !== "") {
      where.isActive = isActive === "true"
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              tournamentCategories: {
                where: {
                  tournament: {
                    status: {
                      not: "CANCELLED"
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.category.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/categories - Crear nueva categoría
export async function POST(request: NextRequest) {
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
        { error: "Solo los administradores pueden crear categorías" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = categoryFormSchema.parse(body)

    // Verificar que no exista otra categoría con el mismo nombre
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive"
        }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        minAge: validatedData.minAge,
        maxAge: validatedData.maxAge,
        genderRestriction: validatedData.genderRestriction,
        minRankingPoints: validatedData.minRankingPoints,
        maxRankingPoints: validatedData.maxRankingPoints,
        isActive: validatedData.isActive,
      },
      include: {
        _count: {
          select: {
            tournamentCategories: {
              where: {
                tournament: {
                  status: {
                    not: "CANCELLED"
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(category, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}