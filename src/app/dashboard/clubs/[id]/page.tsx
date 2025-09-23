import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClubDetail } from "@/components/clubs/club-detail"

async function getClub(id: string) {
  try {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        courts: true,
        tournaments: true,
        _count: {
          select: {
            courts: true,
            tournaments: true,
            tournamentClubs: true
          }
        }
      }
    })

    return club
  } catch (error) {
    console.error('Error fetching club:', error)
    return null
  }
}

interface ClubDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const club = await getClub(id)

  if (!club) {
    notFound()
  }

  return (
    <DashboardLayout>
      <ClubDetail club={club} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}