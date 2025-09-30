import { requireAuth } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BracketGenerator } from "@/components/brackets/bracket-generator"
import { BracketVisualization } from "@/components/brackets/bracket-visualization"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface BracketsPageProps {
  params: {
    id: string
  }
}

export default async function BracketsPage({ params }: BracketsPageProps) {
  // Verificar autenticación
  const session = await requireAuth()

  // Obtener torneo con categorías
  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/tournaments/${params.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">Gestión de Brackets</p>
        </div>
      </div>

      {tournament.categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Este torneo no tiene categorías configuradas.
          </p>
          <Link href={`/dashboard/tournaments/${params.id}/edit`}>
            <Button className="mt-4">Configurar Categorías</Button>
          </Link>
        </div>
      ) : tournament.categories.length === 1 ? (
        // Si solo hay una categoría, mostrar directamente
        <div className="grid gap-6 md:grid-cols-2">
          <BracketGenerator
            tournamentId={tournament.id}
            categories={tournament.categories}
          />
          <BracketVisualization
            tournamentId={tournament.id}
            categoryId={tournament.categories[0].categoryId}
          />
        </div>
      ) : (
        // Si hay múltiples categorías, usar tabs
        <Tabs defaultValue={tournament.categories[0].categoryId}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tournament.categories.length}, 1fr)` }}>
            {tournament.categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.categoryId}>
                {cat.category.name}
                {cat._count && ` (${cat._count.teams})`}
              </TabsTrigger>
            ))}
          </TabsList>

          {tournament.categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.categoryId} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <BracketGenerator
                  tournamentId={tournament.id}
                  categories={tournament.categories}
                />
                <BracketVisualization
                  tournamentId={tournament.id}
                  categoryId={cat.categoryId}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
