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
  // Intentar buscar primero como Registration
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
      },
      teamAsPlayer1: {
        select: {
          id: true,
          name: true,
          seed: true,
          status: true,
          registration2: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  dateOfBirth: true,
                  gender: true,
                  rankingPoints: true,
                  user: {
                    select: {
                      email: true
                    }
                  }
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
          status: true,
          registration1: {
            select: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  dateOfBirth: true,
                  gender: true,
                  rankingPoints: true,
                  user: {
                    select: {
                      email: true
                    }
                  }
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

  // Si no se encontró como Registration, buscar como Team
  const team = await prisma.team.findUnique({
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
      registration1: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              dateOfBirth: true,
              gender: true,
              rankingPoints: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          payment: true
        }
      },
      registration2: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              dateOfBirth: true,
              gender: true,
              rankingPoints: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          payment: true
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

  return team
}

export default async function RegistrationDetailPage({ params }: RegistrationDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    notFound()
  }

  const { id } = await params
  const data = await getRegistration(id)

  if (!data) {
    notFound()
  }

  // Normalizar datos para el componente RegistrationDetail
  let normalizedData: any
  const isAmericanoSocial = data.tournament.type === 'AMERICANO_SOCIAL'

  // Verificar si es un Team (tiene registration1 y registration2)
  if ('registration1' in data && 'registration2' in data) {
    // Es un Team - usar el registrationStatus de registration1 (ambos deberían ser iguales)
    normalizedData = {
      id: data.id,
      name: data.name,
      registrationStatus: data.registration1.registrationStatus,
      registeredAt: data.createdAt,
      seed: data.seed,
      notes: data.notes,
      tournament: data.tournament,
      category: data.category,
      player1: data.registration1.player,
      player2: data.registration2.player,
      payments: [
        ...(data.registration1.payment ? [data.registration1.payment] : []),
        ...(data.registration2.payment ? [data.registration2.payment] : [])
      ],
      tournamentCategory: data.tournamentCategory,
      isAmericanoSocial: false
    }
  } else {
    // Es una Registration
    const team = data.teamAsPlayer1[0] || data.teamAsPlayer2[0]

    if (isAmericanoSocial) {
      // Para Americano Social, solo hay un jugador
      normalizedData = {
        id: data.id,
        name: null,
        registrationStatus: data.registrationStatus,
        registeredAt: data.registeredAt,
        seed: null,
        notes: data.notes,
        tournament: data.tournament,
        category: data.category,
        player: data.player,
        player1: null,
        player2: null,
        payments: data.payment ? [data.payment] : [],
        tournamentCategory: data.tournamentCategory,
        isAmericanoSocial: true
      }
    } else {
      // Para torneos por equipos
      const isPlayer1 = !!data.teamAsPlayer1[0]
      const partner = isPlayer1
        ? team?.registration2?.player
        : team?.registration1?.player

      normalizedData = {
        id: team?.id || data.id,
        name: team?.name || null,
        registrationStatus: data.registrationStatus,
        registeredAt: data.registeredAt,
        seed: team?.seed || null,
        notes: data.notes,
        tournament: data.tournament,
        category: data.category,
        player1: data.player,
        player2: partner,
        payments: data.payment ? [data.payment] : [],
        tournamentCategory: data.tournamentCategory,
        isAmericanoSocial: false
      }
    }
  }

  return (
    <DashboardLayout>
      <RegistrationDetail registration={normalizedData} />
    </DashboardLayout>
  )
}