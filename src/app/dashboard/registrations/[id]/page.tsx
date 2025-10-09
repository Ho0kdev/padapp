import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RegistrationDetail } from "@/components/registrations/registration-detail"

interface RegistrationDetailPageProps {
  params: Promise<{ id: string }>
}

async function getRegistration(id: string) {
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          tournamentStart: true,
          tournamentEnd: true,
          registrationStart: true,
          registrationEnd: true
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          genderRestriction: true,
          minAge: true,
          maxAge: true,
          minRankingPoints: true,
          maxRankingPoints: true
        }
      },
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          rankingPoints: true,
          primaryCategory: {
            select: {
              id: true,
              name: true,
              level: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      },
      payment: {
        select: {
          id: true,
          amount: true,
          paymentStatus: true,
          paymentMethod: true,
          paidAt: true,
          createdAt: true
        }
      },
      tournamentCategory: {
        select: {
          registrationFee: true,
          maxTeams: true
        }
      }
    }
  })

  return registration
}

export default async function RegistrationDetailPage({ params }: RegistrationDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const registration = await getRegistration(id)

  if (!registration) {
    notFound()
  }

  return (
    <DashboardLayout>
      <RegistrationDetail registration={registration as any} />
    </DashboardLayout>
  )
}