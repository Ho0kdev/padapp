import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { categoryEditSchema } from "@/lib/validations/category"
import { CategoryLogService } from "@/lib/services/category-log-service"
import { z } from "zod"

// GET /api/categories/[id] - Obtener categoría por ID
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

    const category = await prisma.category.findUnique({
      where: { id },
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

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(category)

  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Actualizar categoría
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
        { error: "Solo los administradores pueden editar categorías" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = categoryEditSchema.parse(body)

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no exista otra categoría con el mismo nombre
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive"
        },
        id: { not: id }
      }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { error: "Ya existe otra categoría con ese nombre" },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        minAge: validatedData.minAge ?? null,
        maxAge: validatedData.maxAge ?? null,
        genderRestriction: validatedData.genderRestriction ?? null,
        minRankingPoints: validatedData.minRankingPoints ?? null,
        maxRankingPoints: validatedData.maxRankingPoints ?? null,
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

    // Log la actualización
    await CategoryLogService.logCategoryUpdated(
      { userId: session.user.id, categoryId: category.id },
      existingCategory,
      category
    )

    return NextResponse.json(category)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Eliminar/desactivar categoría
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
        { error: "Solo los administradores pueden eliminar categorías" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no tenga torneos activos (excluir borradores, completados y cancelados)
    const activeTournaments = await prisma.tournamentCategory.count({
      where: {
        categoryId: id,
        tournament: {
          status: {
            in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"]
          }
        }
      }
    })

    if (activeTournaments > 0) {
      return NextResponse.json(
        { error: "No se puede desactivar una categoría con torneos activos (publicados, con inscripciones o en progreso)" },
        { status: 400 }
      )
    }

    // En lugar de eliminar, desactivar la categoría
    const category = await prisma.category.update({
      where: { id },
      data: { isActive: false },
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

    // Log la desactivación
    await CategoryLogService.logCategoryStatusChanged(
      { userId: session.user.id, categoryId: category.id },
      { ...existingCategory, isActive: true },
      true,
      false
    )

    return NextResponse.json({
      message: "Categoría desactivada exitosamente",
      category
    })

  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}

// PATCH /api/categories/[id] - Activar categoría desactivada
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
        { error: "Solo los administradores pueden activar categorías" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que la categoría existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    if (existingCategory.isActive) {
      return NextResponse.json(
        { error: "La categoría ya está activa" },
        { status: 400 }
      )
    }

    // Activar la categoría
    const category = await prisma.category.update({
      where: { id },
      data: { isActive: true },
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

    // Log la activación
    await CategoryLogService.logCategoryStatusChanged(
      { userId: session.user.id, categoryId: category.id },
      existingCategory,
      false,
      true
    )

    return NextResponse.json({
      message: "Categoría activada exitosamente",
      category
    })

  } catch (error) {
    console.error("Error activating category:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}