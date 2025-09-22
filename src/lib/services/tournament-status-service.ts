import { prisma } from "@/lib/prisma"

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
          tournament.registrationStart <= now &&
          tournament.registrationEnd >= now) {
        suggestedStatus = "REGISTRATION_OPEN"
      } else if (tournament.status === "REGISTRATION_OPEN" &&
                 tournament.registrationEnd < now) {
        suggestedStatus = "REGISTRATION_CLOSED"
      } else if (tournament.status === "REGISTRATION_CLOSED" &&
                 tournament.tournamentStart <= now &&
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