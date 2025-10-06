import { requireAuth } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BracketSection } from "@/components/brackets/bracket-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy } from "lucide-react"
import Link from "next/link"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface BracketsPageProps {
  params: Promise<{ id: string }>
}

export default async function BracketsPage({ params }: BracketsPageProps) {
  // Verificar autenticación
  const session = await requireAuth()
  const { id } = await params

  // Obtener torneo con categorías
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: {
            select: {
              name: true,
              type: true
            }
          },
          _count: {
            select: {
              teams: true
            }
          }
        }
      },
      organizer: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  if (!tournament) {
    redirect("/dashboard/tournaments")
  }

  // Verificar que el usuario tenga permisos (ADMIN o es el organizador)
  const isAdmin = session.user.role === "ADMIN"
  const isOrganizer = tournament.organizerId === session.user.id
  const canManage = isAdmin || isOrganizer

  if (!canManage) {
    redirect("/dashboard/tournaments")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/tournaments/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Gestión de Brackets y Cuadros de Partidos
            </p>
          </div>
        </div>

        {/* Content */}
        {tournament.categories.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/50">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Este torneo no tiene categorías configuradas.
            </p>
            <Link href={`/dashboard/tournaments/${id}/edit`}>
              <Button>Configurar Categorías</Button>
            </Link>
          </div>
        ) : tournament.categories.length === 1 ? (
          // Si solo hay una categoría, mostrar directamente (sin tabs)
          <BracketSection
            tournament={tournament}
            category={tournament.categories[0]}
          />
        ) : (
          // Si hay múltiples categorías, usar tabs
          <Tabs defaultValue={tournament.categories[0].categoryId} className="space-y-4">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(tournament.categories.length, 4)}, 1fr)` }}>
              {tournament.categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.categoryId}>
                  {cat.category.name}
                  {cat._count && ` (${cat._count.teams})`}
                </TabsTrigger>
              ))}
            </TabsList>

            {tournament.categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.categoryId} className="space-y-6 mt-4">
                <BracketSection
                  tournament={tournament}
                  category={cat}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}
