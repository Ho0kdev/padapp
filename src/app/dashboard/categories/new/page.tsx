import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CategoryForm } from "@/components/categories/category-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

export default async function NewCategoryPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar que sea admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (user?.role !== "ADMIN") {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes crear categorías"
          message="Solo los administradores pueden crear nuevas categorías en la plataforma."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nueva Categoría</h1>
          <p className="text-muted-foreground">
            Crear una nueva categoría para organizar torneos
          </p>
        </div>

        <CategoryForm />
      </div>
    </DashboardLayout>
  )
}