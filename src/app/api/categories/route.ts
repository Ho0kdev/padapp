import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { categoryFormSchema } from "@/lib/validations/category"
import { z } from "zod"

// Función auxiliar para construir ordenamiento dinámico
function buildOrderBy(orderBy?: string, order?: string): any {
  const validColumns = ['name', 'type', 'minAge', 'maxAge', 'createdAt', 'isActive']
  const validOrders: ('asc' | 'desc')[] = ['asc', 'desc']

  const column = orderBy && validColumns.includes(orderBy) ? orderBy : 'name'
  const direction = (order && validOrders.includes(order as 'asc' | 'desc')) ? order as 'asc' | 'desc' : 'asc'

  return { [column]: direction }
}

// GET /api/categories - Obtener lista de categorías
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forRegistration = searchParams.get("forRegistration") === "true"

    // Solo requerir autenticación si no es para registro
    if (!forRegistration) {
      await requireAuth()
    }

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || forRegistration ? "100" : "10")
    const type = searchParams.get("type")
    const isActive = searchParams.get("isActive")
    const search = searchParams.get("search")
    const orderBy = searchParams.get("orderBy") || undefined
    const order = searchParams.get("order") || undefined

    const skip = (page - 1) * limit

    const where: any = {}

    if (type) {
      where.type = type
    }

    if (isActive !== null && isActive !== "") {
      where.isActive = isActive === "true"
    } else if (forRegistration) {
      // Para registro, solo mostrar categorías activas
      where.isActive = true
    }

    if (search) {
      // Dividir la búsqueda en palabras para búsqueda inteligente
      const searchWords = search.trim().split(/\s+/)

      if (searchWords.length === 1) {
        // Una sola palabra: buscar en name O description
        where.OR = [
          { name: { contains: searchWords[0], mode: "insensitive" } },
          { description: { contains: searchWords[0], mode: "insensitive" } }
        ]
      } else {
        // Múltiples palabras: buscar que TODAS aparezcan
        where.OR = [
          // Opción 1: Todas las palabras en el nombre
          {
            AND: searchWords.map(word => ({
              name: { contains: word, mode: "insensitive" }
            }))
          },
          // Opción 2: Todas las palabras en la descripción
          {
            AND: searchWords.map(word => ({
              description: { contains: word, mode: "insensitive" }
            }))
          }
        ]
      }
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: buildOrderBy(orderBy, order),
        include: {
          _count: {
            select: {
              tournamentCategories: {
                where: {
                  tournament: {
                    status: {
                      in: [ "PUBLISHED",
                            "REGISTRATION_OPEN",
                            "REGISTRATION_CLOSED",
                            "IN_PROGRESS",]
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
    return handleAuthError(error)
  }
}

// POST /api/categories - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.CATEGORY)

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
        level: validatedData.level,
        minAge: validatedData.minAge,
        maxAge: validatedData.maxAge,
        genderRestriction: validatedData.genderRestriction as any,
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
                    in: ["PUBLISHED",
                         "REGISTRATION_OPEN",
                         "REGISTRATION_CLOSED",
                         "IN_PROGRESS"]
                  }
                }
              }
            }
          }
        }
      }
    })

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.CREATE,
      resource: Resource.CATEGORY,
      resourceId: category.id,
      description: `Categoría ${category.name} creada`,
      newData: category,
    }, request)

    return NextResponse.json(category, { status: 201 })

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