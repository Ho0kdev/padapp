import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserForm } from '@/components/users/user-form'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Editar Usuario | PadApp'
}

async function getUser(id: string, sessionUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      player: {
        include: {
          primaryCategory: true,
          rankings: {
            include: {
              category: true
            },
            where: {
              seasonYear: new Date().getFullYear()
            }
          }
        }
      }
    }
  })

  if (!user) {
    return null
  }

  // Verificar permisos
  const sessionUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true }
  })

  // Solo admins pueden editar cualquier usuario, usuarios pueden editar su propio perfil
  if (sessionUser?.role !== 'ADMIN' && sessionUserId !== id) {
    return null
  }

  return user
}

export default async function EditUserPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const user = await getUser(id, session.user.id)

  if (!user) {
    notFound()
  }

  // Transformar datos para el formulario
  // Dividir el nombre completo en firstName y lastName si el jugador no tiene valores
  const nameParts = (user.name || '').split(' ')
  const userFirstName = user.player?.firstName || nameParts[0] || ''
  const userLastName = user.player?.lastName || nameParts.slice(1).join(' ') || ''

  const initialData = {
    email: user.email,
    firstName: userFirstName,
    lastName: userLastName,
    role: user.role,
    status: user.status,
    createPlayer: user.player ? user.player.isActive : false,
    phone: user.player?.phone || '',
    dateOfBirth: user.player?.dateOfBirth ?
      new Date(user.player.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '/') : '',
    gender: user.player?.gender,
    dominantHand: user.player?.dominantHand,
    emergencyContactName: user.player?.emergencyContactName || '',
    emergencyContactPhone: user.player?.emergencyContactPhone || '',
    bloodType: user.player?.bloodType || '',
    medicalNotes: user.player?.medicalNotes || '',
    rankingPoints: user.player?.rankingPoints || 0,
    categoryId: user.player?.primaryCategoryId || user.player?.rankings?.[0]?.category?.id,
    profileImageUrl: user.player?.profileImageUrl || ''
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Usuario</h1>
          <p className="text-muted-foreground">
            Actualiza la información del usuario "{user.name}"
          </p>
        </div>

        <UserForm
          initialData={initialData as any}
          userId={user.id}
        />
      </div>
    </DashboardLayout>
  )
}