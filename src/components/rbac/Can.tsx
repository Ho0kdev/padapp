// src/components/rbac/Can.tsx
'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@prisma/client'

/**
 * Componente para mostrar contenido condicionalmente según roles
 *
 * @example
 * <Can roles={['ADMIN']}>
 *   <button>Eliminar usuario</button>
 * </Can>
 *
 * @example
 * <Can roles={['ADMIN', 'ORGANIZER']} fallback={<p>No autorizado</p>}>
 *   <AdminPanel />
 * </Can>
 */
interface CanProps {
  roles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ roles, children, fallback = null }: CanProps) {
  const { hasRole, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!hasRole(roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Componente para mostrar contenido solo a ADMIN
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <Can roles={[UserRole.ADMIN]} fallback={fallback}>{children}</Can>
}

/**
 * Componente para mostrar contenido a ADMIN y ORGANIZER
 */
export function AdminOrOrganizer({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <Can roles={[UserRole.ADMIN, UserRole.ORGANIZER]} fallback={fallback}>{children}</Can>
}

/**
 * Componente para ocultar contenido a PLAYER
 */
export function NotPlayer({ children }: { children: ReactNode }) {
  const { isPlayer, loading } = useAuth()

  if (loading) {
    return null
  }

  if (isPlayer) {
    return null
  }

  return <>{children}</>
}