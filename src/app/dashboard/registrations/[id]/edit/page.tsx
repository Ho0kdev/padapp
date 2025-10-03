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
  // Verificar permisos primero
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  const isAdminOrClubAdmin = user?.role === "ADMIN" || user?.role === "CLUB_ADMIN"
  if (!isAdminOrClubAdmin) {
    return null
  }

  // Intentar buscar como Registration primero
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
      teamAsPlayer1: {
        select: {
          id: true,
          name: true,
          seed: true,
          registration2: {
            select: {
              player: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          }
        }
      },
      teamAsPlayer2: {
        select: {
          id: true,
          name: true,
          seed: true,
          registration1: {
            select: {
              player: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          }
        }
      }
    }
  })

  if (registration) {
    return registration
  }

  // Si no se encontró, podría ser que el ID sea de un Team
  // En ese caso, buscar el team y extraer las registrations
  const team = await prisma.team.findUnique({
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
      registration1: {
        include: {
          player: true,
          teamAsPlayer1: {
            select: {
              id: true,
              name: true,
              seed: true,
              registration2: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true,
                    }
                  }
                }
              }
            }
          },
          teamAsPlayer2: {
            select: {
              id: true,
              name: true,
              seed: true,
              registration1: {
                select: {
                  player: {
                    select: {
                      firstName: true,
                      lastName: true,
                    }
                  }
                }
              }
            }
          }
        }
      },
      registration2: {
        include: {
          player: true
        }
      }
    }
  })

  if (!team) {
    return null
  }

  // Retornar la primera registration del team con la estructura esperada
  return {
    ...team.registration1,
    tournament: team.tournament,
    category: team.category,
    // Incluir el team en la estructura
    teamAsPlayer1: team.registration1.teamAsPlayer1,
    teamAsPlayer2: team.registration1.teamAsPlayer2,
  }
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

  // Obtener el team asociado
  const team = registration.teamAsPlayer1[0] || registration.teamAsPlayer2[0]

  // Transformar datos para el formulario
  const initialData = {
    registrationStatus: registration.registrationStatus,
    notes: registration.notes || undefined,
    teamName: team?.name || undefined,
    seed: team?.seed || undefined,
  }

  // Información para mostrar en la página
  const registrationInfo = {
    tournament: registration.tournament,
    category: registration.category,
    player: registration.player,
    team: team,
    isAmericanoSocial: registration.tournament.type === 'AMERICANO_SOCIAL',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Inscripción</h1>
          <p className="text-muted-foreground">
            {registrationInfo.tournament.name} - {registrationInfo.category.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Jugador: {registrationInfo.player.firstName} {registrationInfo.player.lastName}
            {!registrationInfo.isAmericanoSocial && team && (
              <>
                {' '}/{' '}
                {team.registration1
                  ? `${team.registration1.player.firstName} ${team.registration1.player.lastName}`
                  : `${team.registration2.player.firstName} ${team.registration2.player.lastName}`
                }
              </>
            )}
          </p>
        </div>

        <RegistrationEditForm
          initialData={initialData}
          registrationId={registration.id}
          teamId={team?.id}
          isAmericanoSocial={registrationInfo.isAmericanoSocial}
          tournamentStatus={registration.tournament.status}
        />
      </div>
    </DashboardLayout>
  )
}