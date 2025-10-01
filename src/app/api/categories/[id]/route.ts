import { NextRequest, NextResponse } from "next/server"
import { requireAuth, authorize, handleAuthError, Action, Resource, AuditLogger } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { categoryEditSchema } from "@/lib/validations/category"
import { z } from "zod"

// GET /api/categories/[id] - Obtener categoría por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
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
    return handleAuthError(error)
  }
}

// PUT /api/categories/[id] - Actualizar categoría
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.CATEGORY)
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
        level: validatedData.level ?? null,
        minAge: validatedData.minAge ?? null,
        maxAge: validatedData.maxAge ?? null,
        genderRestriction: validatedData.genderRestriction as any ?? null,
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

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.CATEGORY,
      resourceId: category.id,
      description: `Categoría ${category.name} actualizada`,
      oldData: existingCategory,
      newData: category,
    }, request)

    return NextResponse.json(category)

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

// DELETE /api/categories/[id] - Eliminar/desactivar categoría
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.DELETE, Resource.CATEGORY)
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

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.DELETE,
      resource: Resource.CATEGORY,
      resourceId: category.id,
      description: `Categoría ${category.name} desactivada`,
      oldData: existingCategory,
      newData: category,
    }, request)

    return NextResponse.json({
      message: "Categoría desactivada exitosamente",
      category
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

// PATCH /api/categories/[id] - Activar categoría desactivada
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authorize(Action.UPDATE, Resource.CATEGORY)
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

    // Auditoría
    await AuditLogger.log(session, {
      action: Action.UPDATE,
      resource: Resource.CATEGORY,
      resourceId: category.id,
      description: `Categoría ${category.name} activada`,
      oldData: { isActive: existingCategory.isActive },
      newData: { isActive: true },
    }, request)

    return NextResponse.json({
      message: "Categoría activada exitosamente",
      category
    })

  } catch (error) {
    return handleAuthError(error)
  }
}