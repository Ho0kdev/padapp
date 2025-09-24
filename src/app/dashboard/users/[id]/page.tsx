import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserDetail } from '@/components/users/user-detail'

interface Props {
  params: {
    id: string
  }
}

export const metadata: Metadata = {
  title: 'Perfil de Usuario | PadApp'
}

async function getUser(id: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export default async function UserPage({ params }: Props) {
  const user = await getUser(params.id)

  if (!user) {
    notFound()
  }

  return (
    <DashboardLayout>
      <UserDetail user={user} />
    </DashboardLayout>
  )
}