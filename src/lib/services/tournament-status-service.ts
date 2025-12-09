import { prisma } from "@/lib/prisma"
import { RegistrationLogService } from "./registration-log-service"
import { TeamLogService } from "./team-log-service"

export class TournamentStatusService {
  /**
   * Actualiza automáticamente los estados de los torneos según las fechas
   */
  static async updateTournamentStatusesAutomatically() {
    const now = new Date()

    try {
      // 1. Cambiar PUBLISHED a REGISTRATION_OPEN cuando llegue la fecha de inicio de inscripciones
      await prisma.tournament.updateMany({
        where: {
          status: "PUBLISHED",
          registrationStart: {
            lte: now
          },
          registrationEnd: {
            gte: now
          }
        },
        data: {
          status: "REGISTRATION_OPEN",
          updatedAt: now
        }
      })

      // 2. Cambiar REGISTRATION_OPEN a REGISTRATION_CLOSED cuando pase la fecha de fin de inscripciones
      await prisma.tournament.updateMany({
        where: {
          status: "REGISTRATION_OPEN",
          registrationEnd: {
            lt: now
          }
        },
        data: {
          status: "REGISTRATION_CLOSED",
          updatedAt: now
        }
      })

      // 3. Cambiar REGISTRATION_CLOSED a IN_PROGRESS cuando llegue la fecha de inicio del torneo
      // Solo si hay equipos registrados
      const tournamentsToStart = await prisma.tournament.findMany({
        where: {
          status: "REGISTRATION_CLOSED",
          tournamentStart: {
            lte: now
          }
        },
        include: {
          _count: {
            select: {
              teams: true
            }
          }
        }
      })

      for (const tournament of tournamentsToStart) {
        if (tournament._count.teams > 0) {
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: {
              status: "IN_PROGRESS",
              updatedAt: now
            }
          })

          // Cancelar inscripciones y equipos no confirmados/pagados
          const cancellationResult = await this.cancelUnconfirmedRegistrations(tournament.id)
          if (cancellationResult.success) {
            console.log(`✅ Torneo ${tournament.id}: ${cancellationResult.cancelledRegistrations} inscripciones y ${cancellationResult.cancelledTeams} equipos cancelados`)
          }
        }
      }

      console.log(`✅ Tournament statuses updated automatically at ${now.toISOString()}`)

      return {
        success: true,
        updatedAt: now
      }

    } catch (error) {
      console.error("❌ Error updating tournament statuses automatically:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Obtiene torneos que necesitan cambio de estado automático
   */
  static async getTournamentsNeedingStatusUpdate() {
    const now = new Date()

    const tournaments = await prisma.tournament.findMany({
      where: {
        OR: [
          // PUBLISHED que debería ser REGISTRATION_OPEN
          {
            status: "PUBLISHED",
            registrationStart: { lte: now },
            registrationEnd: { gte: now }
          },
          // REGISTRATION_OPEN que debería ser REGISTRATION_CLOSED
          {
            status: "REGISTRATION_OPEN",
            registrationEnd: { lt: now }
          },
          // REGISTRATION_CLOSED que debería ser IN_PROGRESS
          {
            status: "REGISTRATION_CLOSED",
            tournamentStart: { lte: now }
          }
        ]
      },
      include: {
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    return tournaments.map(tournament => {
      let suggestedStatus = tournament.status

      if (tournament.status === "PUBLISHED" &&
          tournament.registrationStart && tournament.registrationStart <= now &&
          tournament.registrationEnd && tournament.registrationEnd >= now) {
        suggestedStatus = "REGISTRATION_OPEN"
      } else if (tournament.status === "REGISTRATION_OPEN" &&
                 tournament.registrationEnd && tournament.registrationEnd < now) {
        suggestedStatus = "REGISTRATION_CLOSED"
      } else if (tournament.status === "REGISTRATION_CLOSED" &&
                 tournament.tournamentStart && tournament.tournamentStart <= now &&
                 tournament._count.teams > 0) {
        suggestedStatus = "IN_PROGRESS"
      }

      return {
        id: tournament.id,
        name: tournament.name,
        currentStatus: tournament.status,
        suggestedStatus,
        reason: this.getStatusChangeReason(tournament.status, suggestedStatus, tournament, now)
      }
    })
  }

  private static getStatusChangeReason(
    currentStatus: string,
    suggestedStatus: string,
    tournament: any,
    now: Date
  ): string {
    if (currentStatus === suggestedStatus) return ""

    switch (suggestedStatus) {
      case "REGISTRATION_OPEN":
        return "Fecha de inicio de inscripciones alcanzada"
      case "REGISTRATION_CLOSED":
        return "Fecha de fin de inscripciones alcanzada"
      case "IN_PROGRESS":
        return "Fecha de inicio del torneo alcanzada"
      default:
        return "Cambio automático sugerido"
    }
  }

  /**
   * Cancela inscripciones y equipos no confirmados/pagados cuando un torneo pasa a IN_PROGRESS
   * También cancela inscripciones sin pagos parciales
   */
  static async cancelUnconfirmedRegistrations(tournamentId: string, userId?: string) {
    try {
      // 1. Obtener todas las inscripciones del torneo que NO estén confirmadas o pagadas
      const registrationsToCancel = await prisma.registration.findMany({
        where: {
          tournamentId,
          registrationStatus: {
            notIn: ['CONFIRMED', 'PAID', 'CANCELLED']
          }
        },
        include: {
          payments: {
            select: {
              paymentStatus: true,
              amount: true
            }
          },
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          category: {
            select: {
              name: true
            }
          }
        }
      })

      const cancelledRegistrations: string[] = []
      const cancelledTeams: string[] = []

      // 2. Cancelar cada inscripción que:
      //    - NO esté en CONFIRMED o PAID
      //    - NO tenga pagos parciales (al menos un pago con status PAID)
      for (const registration of registrationsToCancel) {
        const hasPartialPayment = registration.payments.some(p => p.paymentStatus === 'PAID')

        // Si tiene pago parcial, no cancelar
        if (hasPartialPayment) {
          console.log(`⏭️  Inscripción ${registration.id} tiene pago parcial, no se cancela`)
          continue
        }

        const oldRegistration = { ...registration }

        // Cancelar la inscripción
        await prisma.registration.update({
          where: { id: registration.id },
          data: { registrationStatus: 'CANCELLED' }
        })

        cancelledRegistrations.push(registration.id)

        // Registrar en el log
        await RegistrationLogService.logRegistrationStatusChanged(
          {
            userId: userId || 'SYSTEM',
            registrationId: registration.id
          },
          { ...oldRegistration, registrationStatus: 'CANCELLED' },
          oldRegistration.registrationStatus,
          'CANCELLED'
        )

        console.log(`❌ Inscripción ${registration.id} cancelada (${registration.player.firstName} ${registration.player.lastName} - ${registration.category.name})`)
      }

      // 3. Buscar equipos que tengan al menos una inscripción cancelada
      const teamsToCancel = await prisma.team.findMany({
        where: {
          tournamentId,
          status: {
            not: 'CANCELLED'
          },
          OR: [
            {
              registration1Id: {
                in: cancelledRegistrations
              }
            },
            {
              registration2Id: {
                in: cancelledRegistrations
              }
            }
          ]
        },
        include: {
          registration1: {
            include: {
              player: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          registration2: {
            include: {
              player: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })

      // 4. Cancelar los equipos
      for (const team of teamsToCancel) {
        const oldTeam = { ...team }

        await prisma.team.update({
          where: { id: team.id },
          data: { status: 'CANCELLED' }
        })

        cancelledTeams.push(team.id)

        // Registrar en el log
        await TeamLogService.logTeamStatusChanged(
          {
            userId: userId || 'SYSTEM',
            teamId: team.id
          },
          { ...oldTeam, status: 'CANCELLED' },
          oldTeam.status,
          'CANCELLED'
        )

        console.log(`❌ Equipo ${team.id} cancelado (${team.name})`)
      }

      return {
        success: true,
        cancelledRegistrations: cancelledRegistrations.length,
        cancelledTeams: cancelledTeams.length,
        registrationIds: cancelledRegistrations,
        teamIds: cancelledTeams
      }

    } catch (error) {
      console.error("❌ Error cancelando inscripciones no confirmadas:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        cancelledRegistrations: 0,
        cancelledTeams: 0
      }
    }
  }

  /**
   * Verifica si un torneo específico necesita cambio de estado
   */
  static async checkTournamentStatus(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            teams: true
          }
        }
      }
    })

    if (!tournament) return null

    const now = new Date()
    const needsUpdate = await this.getTournamentsNeedingStatusUpdate()

    return needsUpdate.find(t => t.id === tournamentId) || null
  }
}