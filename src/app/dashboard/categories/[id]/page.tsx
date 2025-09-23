import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CategoryDetail } from "@/components/categories/category-detail"

interface CategoryDetailPageProps {
  params: Promise<{ id: string }>
}

async function getCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      tournamentCategories: {
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true,
              tournamentStart: true,
              tournamentEnd: true,
              organizerId: true,
              _count: {
                select: { teams: true }
              }
            }
          },
          teams: {
            include: {
              player1: {
                select: { firstName: true, lastName: true }
              },
              player2: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      },
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

  return category
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const category = await getCategory(id)

  if (!category) {
    notFound()
  }

  return (
    <DashboardLayout>
      <CategoryDetail category={category} currentUserId={session.user.id} />
    </DashboardLayout>
  )
}