import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CategoryForm } from "@/components/categories/category-form"

interface EditCategoryPageProps {
  params: Promise<{ id: string }>
}

async function getCategory(id: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: { id }
  })

  if (!category) {
    return null
  }

  // Verificar permisos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role !== "ADMIN") {
    return null
  }

  return category
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const category = await getCategory(id, session.user.id)

  if (!category) {
    notFound()
  }

  // Transformar datos para el formulario
  const initialData = {
    name: category.name,
    description: category.description || undefined,
    type: category.type,
    level: category.level ?? undefined,
    minAge: category.minAge ?? undefined,
    maxAge: category.maxAge ?? undefined,
    genderRestriction: category.genderRestriction || undefined,
    minRankingPoints: category.minRankingPoints ?? undefined,
    maxRankingPoints: category.maxRankingPoints ?? undefined,
    isActive: category.isActive,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Categoría</h1>
          <p className="text-muted-foreground">
            Modifica la configuración de la categoría "{category.name}"
          </p>
        </div>

        <CategoryForm
          initialData={initialData}
          categoryId={category.id}
        />
      </div>
    </DashboardLayout>
  )
}