import { Badge } from "@/components/ui/badge"
import {
  getRegistrationStatusLabel,
  getRegistrationStatusStyle
} from "@/lib/utils/status-styles"

interface Registration {
  id: string
  registrationStatus: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'WAITLIST'
}

interface RegistrationStatusBreakdownProps {
  registrations: Registration[]
  maxParticipants?: number | null
}

export function RegistrationStatusBreakdown({
  registrations,
  maxParticipants
}: RegistrationStatusBreakdownProps) {
  // Contar inscripciones por estado
  const statusCounts = {
    PENDING: registrations.filter(r => r.registrationStatus === 'PENDING').length,
    CONFIRMED: registrations.filter(r => r.registrationStatus === 'CONFIRMED').length,
    PAID: registrations.filter(r => r.registrationStatus === 'PAID').length,
    CANCELLED: registrations.filter(r => r.registrationStatus === 'CANCELLED').length,
    WAITLIST: registrations.filter(r => r.registrationStatus === 'WAITLIST').length,
  }

  // Total de jugadores que van a participar (solo CONFIRMED + PAID)
  const activeParticipants = statusCounts.CONFIRMED + statusCounts.PAID
  const totalRegistrations = registrations.length

  return (
    <div className="space-y-2">
      {/* Total de jugadores activos */}
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">
          {activeParticipants}
          {maxParticipants && ` / ${maxParticipants}`}
        </p>
      </div>

      {/* Mostrar total de inscripciones si hay estados no activos */}
      {totalRegistrations > activeParticipants && (
        <p className="text-xs text-muted-foreground">
          {totalRegistrations} inscripciones totales
        </p>
      )}

      {/* Desglose por estado */}
      <div className="space-y-1.5 text-sm">
        {statusCounts.PAID > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pagados</span>
            <Badge className={getRegistrationStatusStyle('PAID')}>
              {statusCounts.PAID}
            </Badge>
          </div>
        )}

        {statusCounts.CONFIRMED > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Confirmados</span>
            <Badge className={getRegistrationStatusStyle('CONFIRMED')}>
              {statusCounts.CONFIRMED}
            </Badge>
          </div>
        )}

        {statusCounts.PENDING > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pendientes</span>
            <Badge className={getRegistrationStatusStyle('PENDING')}>
              {statusCounts.PENDING}
            </Badge>
          </div>
        )}

        {statusCounts.WAITLIST > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Lista de espera</span>
            <Badge className={getRegistrationStatusStyle('WAITLIST')}>
              {statusCounts.WAITLIST}
            </Badge>
          </div>
        )}

        {statusCounts.CANCELLED > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cancelados</span>
            <Badge className={getRegistrationStatusStyle('CANCELLED')}>
              {statusCounts.CANCELLED}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
