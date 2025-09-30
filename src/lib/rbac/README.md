# Sistema RBAC (Role-Based Access Control)

Sistema completo de control de acceso basado en roles para la aplicación de gestión de torneos de pádel.

## 📋 Índice

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Uso Básico](#uso-básico)
- [API Reference](#api-reference)
- [Ejemplos](#ejemplos)
- [Mejores Prácticas](#mejores-prácticas)

## ✨ Características

- **Sistema de habilidades (Ability)** - Inspirado en CASL
- **Políticas por recurso** - Encapsulación de reglas de negocio
- **Caché de permisos** - Optimización de performance
- **Auditoría automática** - Logging de acciones críticas
- **Helpers para API routes** - Reduce código boilerplate
- **Middleware mejorado** - Separación de autenticación y autorización

## 🏗️ Arquitectura

```
src/lib/rbac/
├── types.ts           # Tipos y enums (Action, Resource)
├── ability.ts         # Motor de habilidades
├── policies/          # Políticas por recurso
│   ├── BasePolicy.ts
│   ├── UserPolicy.ts
│   └── TournamentPolicy.ts
├── helpers.ts         # Helpers para API routes
├── cache.ts           # Sistema de caché
├── audit.ts           # Sistema de auditoría
├── middleware.ts      # Middleware RBAC
└── index.ts           # Exportaciones
```

## 🚀 Uso Básico

### 1. En API Routes

#### Verificar Autenticación

```typescript
import { requireAuth, handleAuthError } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    // Tu lógica aquí

    return NextResponse.json({ data })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

#### Verificar Permisos

```typescript
import { authorize, Action, Resource, handleAuthError } from '@/lib/rbac'

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Verificar que el usuario puede eliminar torneos
    const session = await authorize(Action.DELETE, Resource.TOURNAMENT)

    const { id } = await params

    // Tu lógica de eliminación

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

#### Verificar Permisos Contextuales

```typescript
import { authorize, Action, Resource, handleAuthError } from '@/lib/rbac'

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Obtener el recurso
    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    // Verificar permisos con el recurso específico
    await authorize(Action.UPDATE, Resource.TOURNAMENT, tournament)

    // Tu lógica de actualización

    return NextResponse.json(tournament)
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 2. Con Wrappers (Recomendado)

```typescript
import { withAuth, withPermission, Action, Resource } from '@/lib/rbac'

// Solo autenticación
export const GET = withAuth(async (request, context, session) => {
  // Tu lógica aquí
  return NextResponse.json({ data })
})

// Con verificación de permisos
export const DELETE = withPermission(
  Action.DELETE,
  Resource.TOURNAMENT,
  async (request, context, session) => {
    const { id } = await context.params

    // Tu lógica aquí

    return NextResponse.json({ success: true })
  }
)

// Con verificación contextual
export const PUT = withPermission(
  Action.UPDATE,
  Resource.TOURNAMENT,
  async (request, context, session) => {
    const { id } = await context.params

    // Tu lógica aquí

    return NextResponse.json({ success: true })
  },
  {
    getSubject: async (request, context) => {
      const { id } = await context.params
      return await prisma.tournament.findUnique({ where: { id } })
    }
  }
)
```

### 3. Auditoría Automática

```typescript
import { AuditLogger, Action, Resource } from '@/lib/rbac'

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const oldData = await prisma.tournament.findUnique({ where: { id } })

    // Tu lógica de actualización
    const newData = await prisma.tournament.update({
      where: { id },
      data: updateData
    })

    // Registrar auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: id,
        description: `Torneo ${newData.name} actualizado`,
        oldData,
        newData,
      },
      request
    )

    return NextResponse.json(newData)
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 4. Usando Políticas

```typescript
import { getPolicies } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const policies = await getPolicies()

    // Verificar permisos de forma declarativa
    if (!policies.tournament.canViewList()) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const tournaments = await prisma.tournament.findMany()

    return NextResponse.json({ tournaments })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

## 📚 API Reference

### Actions (Acciones)

```typescript
enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Acceso total
  LIST = 'list',
  APPROVE = 'approve',
  REJECT = 'reject',
}
```

### Resources (Recursos)

```typescript
enum Resource {
  USER = 'User',
  TOURNAMENT = 'Tournament',
  CLUB = 'Club',
  COURT = 'Court',
  CATEGORY = 'Category',
  REGISTRATION = 'Registration',
  TEAM = 'Team',
  MATCH = 'Match',
  RANKING = 'Ranking',
  PAYMENT = 'Payment',
  NOTIFICATION = 'Notification',
  REPORT = 'Report',
  DASHBOARD = 'Dashboard',
}
```

### Helpers

```typescript
// Autenticación
requireAuth(): Promise<Session>
getCurrentSession(): Promise<Session | null>

// Autorización
authorize(action: Action, resource: Resource, subject?: any): Promise<Session>
can(action: Action, resource: Resource, subject?: any): Promise<boolean>

// Habilidades
getCurrentAbility(): Promise<Ability>
getCachedAbility(context: AuthorizationContext): Ability

// Políticas
getPolicies(): Promise<{ user: UserPolicy, tournament: TournamentPolicy }>

// Wrappers
withAuth(handler): Handler
withPermission(action, resource, handler, options?): Handler

// Auditoría
AuditLogger.log(session, options, request?): Promise<void>

// Manejo de errores
handleAuthError(error): NextResponse
```

## 💡 Ejemplos

### Ejemplo Completo: Endpoint de Torneos

```typescript
// src/app/api/tournaments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  authorize,
  handleAuthError,
  Action,
  Resource,
  AuditLogger,
  getPolicies
} from '@/lib/rbac'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Ver torneo
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAuth()

    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.READ, Resource.TOURNAMENT, tournament)

    return NextResponse.json(tournament)
  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT - Actualizar torneo
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const existingTournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!existingTournament) {
      return NextResponse.json(
        { error: 'Torneo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    await authorize(Action.UPDATE, Resource.TOURNAMENT, existingTournament)

    // Actualizar
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: body
    })

    // Auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.UPDATE,
        resource: Resource.TOURNAMENT,
        resourceId: id,
        description: `Torneo ${updatedTournament.name} actualizado`,
        oldData: existingTournament,
        newData: updatedTournament,
      },
      request
    )

    return NextResponse.json(updatedTournament)
  } catch (error) {
    return handleAuthError(error)
  }
}

// DELETE - Eliminar torneo
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await authorize(Action.DELETE, Resource.TOURNAMENT)
    const { id } = await params

    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneo no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar
    await prisma.tournament.delete({ where: { id } })

    // Auditoría
    await AuditLogger.log(
      session,
      {
        action: Action.DELETE,
        resource: Resource.TOURNAMENT,
        resourceId: id,
        description: `Torneo ${tournament.name} eliminado`,
        oldData: tournament,
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

## 🎯 Mejores Prácticas

### 1. Usar Wrappers cuando sea posible

✅ **Bueno:**
```typescript
export const GET = withAuth(async (request, context, session) => {
  // Lógica
})
```

❌ **Evitar:**
```typescript
export async function GET(request: NextRequest) {
  const session = await requireAuth()
  try {
    // Lógica
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 2. Siempre registrar auditoría en operaciones de escritura

✅ **Bueno:**
```typescript
await prisma.tournament.update({ where: { id }, data })
await AuditLogger.log(session, { action, resource, ... }, request)
```

❌ **Evitar:**
```typescript
await prisma.tournament.update({ where: { id }, data })
// Sin auditoría
```

### 3. Verificar permisos antes de cargar recursos sensibles

✅ **Bueno:**
```typescript
const policies = await getPolicies()
if (!policies.user.canViewList()) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
const users = await prisma.user.findMany()
```

❌ **Evitar:**
```typescript
const users = await prisma.user.findMany()
// Verificar después
```

### 4. Usar `handleAuthError` en todos los catch

✅ **Bueno:**
```typescript
try {
  // Lógica
} catch (error) {
  return handleAuthError(error)
}
```

❌ **Evitar:**
```typescript
try {
  // Lógica
} catch (error) {
  console.error(error)
  return NextResponse.json({ error: 'Error' }, { status: 500 })
}
```

### 5. Invalidar caché cuando cambien permisos

```typescript
import { invalidateUserCache } from '@/lib/rbac/cache'

// Después de cambiar el rol de un usuario
await prisma.user.update({
  where: { id },
  data: { role: newRole }
})

// Invalidar caché
invalidateUserCache(id)
```

## 🔒 Matriz de Permisos

| Recurso | ADMIN | CLUB_ADMIN | PLAYER | REFEREE |
|---------|-------|------------|--------|---------|
| User | MANAGE | READ own | READ own | READ own |
| Tournament | MANAGE | MANAGE | READ | READ |
| Club | MANAGE | MANAGE | READ | READ |
| Court | MANAGE | MANAGE | READ | READ |
| Category | MANAGE | MANAGE | READ | READ |
| Registration | MANAGE | APPROVE | CREATE own | READ |
| Team | MANAGE | UPDATE | READ own | READ |
| Match | MANAGE | UPDATE | READ | UPDATE assigned |
| Ranking | MANAGE | READ | READ | READ |
| Payment | MANAGE | UPDATE | - | - |
| Dashboard | READ | READ | - | READ |

## 🐛 Debugging

Para ver información de depuración del sistema RBAC:

```typescript
import { abilityCache } from '@/lib/rbac/cache'

// Ver estadísticas del caché
console.log(abilityCache.getStats())

// Ver reglas de un usuario
const ability = await getCurrentAbility()
console.log(ability.getRules())
```

## 📝 Notas

- El caché de permisos tiene un TTL de 5 minutos
- La auditoría es asíncrona y no bloquea la respuesta
- Los errores de autorización devuelven status 403
- Los errores de autenticación devuelven status 401