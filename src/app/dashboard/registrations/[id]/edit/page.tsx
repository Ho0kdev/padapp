import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationEditForm } from "@/components/registrations/registration-edit-form"

interface EditRegistrationPageProps {
  params: Promise<{ id: string }>
}

async function getRegistration(id: string, userId: string) {
  const registration = await prisma.team.findUnique({
    where: { id }
  })

  if (!registration) {
    return null
  }

  // Verificar permisos - Solo ADMIN puede editar
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role !== "ADMIN") {
    return null
  }

  return registration
}

export default async function EditRegistrationPage({ params }: EditRegistrationPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const registration = await getRegistration(id, session.user.id)

  if (!registration) {
    notFound()
  }

  // Transformar datos para el formulario
  const initialData = {
    name: registration.name || undefined,
    notes: registration.notes || undefined,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Inscripción</h1>
          <p className="text-muted-foreground">
            Modifica la información de la inscripción
          </p>
        </div>

        <RegistrationEditForm
          initialData={initialData}
          registrationId={registration.id}
        />
      </div>
    </DashboardLayout>
  )
}