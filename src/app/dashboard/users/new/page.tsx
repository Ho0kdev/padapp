import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserForm } from '@/components/users/user-form'
import { UnauthorizedPage } from '@/components/ui/unauthorized-page'

export const metadata: Metadata = {
  title: 'Nuevo Usuario | PDLShot',
  description: 'Crear nuevo usuario en el sistema'
}

export default async function NewUserPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Verificar que sea admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (user?.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <UnauthorizedPage
          title="No puedes crear usuarios"
          message="Solo los administradores pueden crear nuevos usuarios en el sistema."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nuevo Usuario</h1>
          <p className="text-muted-foreground">
            Crea un nuevo usuario en el sistema
          </p>
        </div>

        <UserForm currentUserRole={session.user.role} />
      </div>
    </DashboardLayout>
  )
}