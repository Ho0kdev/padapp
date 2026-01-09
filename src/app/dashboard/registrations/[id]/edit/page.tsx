import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationEditForm } from "@/components/registrations/registration-edit-form"
import { UnauthorizedPage } from "@/components/ui/unauthorized-page"

interface EditRegistrationPageProps {
  params: Promise<{ id: string }>
}

async function getRegistration(id: string, userId: string) {
  // Buscar la Registration individual primero
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
        }
      },
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      },
    }
  })

  if (!registration) {
    return { registration: null, canEdit: false, reason: 'not_found' }
  }

  // Verificar permisos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const canEdit = user?.role === "ADMIN" || user?.role === "ORGANIZER"

  return {
    registration: canEdit ? registration : null,
    canEdit,
    reason: canEdit ? null : 'insufficient_permissions'
  }
}

export default async function EditRegistrationPage({ params }: EditRegistrationPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const { registration, canEdit, reason } = await getRegistration(id, session.user.id)

  if (!registration && reason === 'not_found') {
    notFound()
  }

  if (!canEdit) {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes editar esta inscripción"
          message="Solo los administradores y organizadores pueden modificar inscripciones."
        />
      </DashboardLayout>
    )
  }

  // TypeScript guard - nunca debería llegar aquí si canEdit es true
  if (!registration) {
    notFound()
  }

  // Datos iniciales solo de la inscripción individual
  const initialData = {
    registrationStatus: registration.registrationStatus,
    notes: registration.notes || undefined,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Inscripción</h1>
          <p className="text-muted-foreground">
            {registration.tournament.name} - {registration.category.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Jugador: {registration.player.firstName} {registration.player.lastName}
          </p>
        </div>

        <RegistrationEditForm
          initialData={initialData}
          registrationId={registration.id}
          tournamentStatus={registration.tournament.status}
        />
      </div>
    </DashboardLayout>
  )
}