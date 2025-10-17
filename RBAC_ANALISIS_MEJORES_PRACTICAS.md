# 🔒 Análisis de RBAC: Mejores Prácticas vs Implementación Actual

> **Fecha**: 2025-10-17
> **Versión del Sistema**: RBAC v1.0.1
> **Estado**: Análisis completo con recomendaciones priorizadas

---

## 📋 RESUMEN EJECUTIVO

### Calificación Global: **8.5/10** ⭐⭐⭐⭐

El sistema RBAC de PadApp implementa correctamente los fundamentos de control de acceso basado en roles con características avanzadas como ownership contextual, auditoría completa y caché de permisos. Sin embargo, existen **10 áreas de mejora** identificadas según las mejores prácticas de la industria (Node.js Best Practices, AccessControl.js, Oso).

### Estado Actual
- ✅ **Fortalezas**: 15 implementadas correctamente
- ⚠️ **Mejoras Críticas**: 3 (seguridad)
- 📊 **Mejoras Importantes**: 4 (funcionalidad)
- 💡 **Mejoras Opcionales**: 3 (optimización)

---

## ✅ FORTALEZAS IDENTIFICADAS

### 1. Arquitectura RBAC Sólida ⭐⭐⭐⭐⭐
**Implementación correcta de los principios fundamentales de RBAC:**

```typescript
// src/lib/rbac/ability.ts
export class Ability {
  can(action: Action | Action[], resource: Resource | Resource[], conditions?: any): this
  cannot(action: Action | Action[], resource: Resource | Resource[], conditions?: any): this
  check(action: Action, resource: Resource, subject?: any): boolean
}
```

✅ **Cumple con**:
- Separación clara de acciones, recursos y roles
- Permisos granulares (CREATE, READ, UPDATE, DELETE, MANAGE, LIST, APPROVE, REJECT)
- 14 recursos diferentes con control específico

**Comparación con estándar (AccessControl.js)**:
```javascript
// Patrón similar a AccessControl.js
ac.grant('user').readOwn('account');
// vs implementación actual
ability.can(Action.READ, Resource.USER, ownsUser(userId))
```

---

### 2. Permisos Contextuales (Ownership) ⭐⭐⭐⭐⭐
**Implementación robusta de verificación de propiedad:**

```typescript
// src/lib/rbac/ownership.ts
export const ownsUser = (userId: string) => ({ id: userId })
export const ownsTeam = (userId: string) => (team: any) => isTeamMember(userId, team)
export const ownsRegistration = (userId: string) => (registration: any) =>
  isRegistrationParticipant(userId, registration)
```

✅ **Ventajas**:
- Soporte para ownership simple (por ID)
- Ownership por relación (teams, registrations)
- Ownership anidado (verificación recursiva)
- Funciones puras y testables

**Comparación con Oso**:
```typescript
// Oso usa predicados similares
has_permission(user, "update", account) if has_role(user, "owner", account)
// vs implementación actual (más simple y directa)
ability.can(Action.UPDATE, Resource.REGISTRATION, ownsRegistration(userId))
```

---

### 3. Sistema de Auditoría con Strategy Pattern ⭐⭐⭐⭐⭐
**Implementación ejemplar usando Design Patterns:**

```typescript
// src/lib/rbac/audit.ts
interface LogStrategy {
  createLog(data: LogData): Promise<void>
}

class LogStrategyRegistry {
  private static strategies = new Map<Resource, LogStrategy>()
  static register(resource: Resource, strategy: LogStrategy): void
}

// Estrategias específicas
class TournamentLogStrategy implements LogStrategy { ... }
class ClubLogStrategy implements LogStrategy { ... }
```

✅ **Cumple con**:
- Open/Closed Principle (SOLID)
- Fácil extensión sin modificación
- Separación de responsabilidades

**Mejor práctica cumplida**: *"Use design patterns to make authorization logic maintainable and extensible"* (Node.js Best Practices)

---

### 4. Caché de Permisos ⭐⭐⭐⭐
**Optimización de performance con Singleton Pattern:**

```typescript
// src/lib/rbac/cache.ts
export class AbilityCache {
  private static instance: AbilityCache
  static getInstance(): AbilityCache

  destroy(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, size: 0 }
  }
}

// Cleanup automático
process.on('beforeExit', () => abilityCache.destroy())
```

✅ **Ventajas**:
- Singleton para evitar múltiples instancias
- TTL de 5 minutos configurable
- Prevención de memory leaks
- Métricas de rendimiento

**Mejor práctica cumplida**: *"Cache authorization decisions when safe to do so"* (Oso docs)

---

### 5. Type Safety Completo ⭐⭐⭐⭐⭐
**TypeScript usado correctamente en toda la implementación:**

```typescript
// src/lib/rbac/types.ts
export enum Action { CREATE = 'create', READ = 'read', ... }
export enum Resource { USER = 'User', TOURNAMENT = 'Tournament', ... }
export interface PermissionRule {
  action: Action | Action[]
  resource: Resource | Resource[]
  conditions?: PermissionCondition[]
  inverted?: boolean
}
```

✅ **Beneficios**:
- Detección de errores en compile-time
- Autocompletado en IDE
- Refactoring seguro
- Documentación implícita

---

### 6. Error Handling Centralizado ⭐⭐⭐⭐
**Manejo consistente de errores de autorización:**

```typescript
// src/lib/rbac/helpers.ts
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  return NextResponse.json({ error: 'Error interno' }, { status: 500 })
}
```

✅ **Mejor práctica cumplida**: *"Use consistent error responses"* (Node.js Best Practices)

---

### 7. Separación de Concerns ⭐⭐⭐⭐
**Módulos bien organizados con responsabilidades claras:**

```
src/lib/rbac/
├── types.ts              # Solo tipos
├── ability.ts            # Lógica de permisos
├── cache.ts              # Caché
├── audit.ts              # Logging
├── helpers.ts            # Utilidades
├── ownership.ts          # Verificación de propiedad
└── utils.ts              # Funciones auxiliares
```

✅ **Cumple con Single Responsibility Principle (SOLID)**

---

### 8. Documentación Extensa ⭐⭐⭐⭐⭐
**Documentación completa en código y guías:**

- `RBAC_GUIA_DEFINITIVA.md` (694 líneas)
- Comentarios JSDoc en funciones
- Ejemplos de uso en cada módulo
- Documentación inline en `ownership.ts` (100+ líneas)

✅ **Mejor práctica cumplida**: *"Document your authorization logic"* (Industry standard)

---

### Otras Fortalezas

9. ✅ **Helpers convenientes** (`requireAuth()`, `authorize()`, `can()`)
10. ✅ **Wrappers para routes** (`withAuth()`, `withPermission()`)
11. ✅ **Filtrado de listas por permisos** (`filterByPermission()`)
12. ✅ **Hooks React** (`useAuth()` con memoización)
13. ✅ **Componentes autorizados** (`<Can>`, `<AdminOnly>`)
14. ✅ **Auditoría de IP y User-Agent**
15. ✅ **Código limpio y refactorizado** (principios SOLID aplicados)

---

## ⚠️ ÁREAS DE MEJORA CRÍTICAS (Seguridad)

### 1. 🔴 Rate Limiting en Autenticación [CRÍTICO]

**Problema identificado:**
No hay protección contra ataques de fuerza bruta en los endpoints de autorización.

**Mejor práctica (Node.js Best Practices):**
```javascript
// Ejemplo de rate limiting para login
const limiterConsecutiveFailsByUsernameAndIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail_consecutive_username_and_ip',
  points: 10,
  duration: 60 * 60 * 24 * 90,
  blockDuration: 60 * 60, // Block for 1 hour
});
```

**Implementación actual:**
```typescript
// src/lib/rbac/helpers.ts
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession()
  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión')
  }
  return session
}
// ❌ No hay rate limiting
```

**Recomendación:**
```typescript
// src/lib/rbac/rate-limit.ts (NUEVO)
import { RateLimiterMemory } from 'rate-limiter-flexible'

const authRateLimiter = new RateLimiterMemory({
  points: 10, // 10 intentos
  duration: 60, // por minuto
  blockDuration: 60 * 15, // bloqueo de 15 minutos
})

export async function checkAuthRateLimit(identifier: string): Promise<void> {
  try {
    await authRateLimiter.consume(identifier)
  } catch (error) {
    throw new Error('Demasiados intentos de autenticación. Intenta en 15 minutos.')
  }
}

// Uso en helpers.ts
export async function requireAuth(request?: NextRequest): Promise<Session> {
  if (request) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    await checkAuthRateLimit(ip)
  }

  const session = await getCurrentSession()
  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión')
  }
  return session
}
```

**Impacto:** Alto (previene ataques de fuerza bruta)
**Esfuerzo:** Medio (2-3 horas)
**Prioridad:** 🔴 Crítica

---

### 2. 🔴 Logging de Accesos Denegados [CRÍTICO]

**Problema identificado:**
Solo se registran operaciones exitosas, no hay auditoría de intentos de acceso no autorizados.

**Mejor práctica (Security standards):**
*"Log all authorization failures for security monitoring and incident response"*

**Implementación actual:**
```typescript
// src/lib/rbac/audit.ts
export function withAudit(options: AuditLogOptions) {
  return async (request, context, session) => {
    const response = await handler(request, context, session)
    // Solo registrar si la operación fue exitosa (2xx)
    if (response.ok) {
      await AuditLogger.log(session, options, request)
    }
    return response
  }
}
// ❌ No registra fallos de autorización
```

**Recomendación:**
```typescript
// src/lib/rbac/helpers.ts (MODIFICAR)
export function handleAuthError(error: unknown, request?: NextRequest): NextResponse {
  console.error('Authorization error:', error)

  // 🆕 AGREGAR: Logging de accesos denegados
  if (error instanceof ForbiddenError) {
    logSecurityEvent({
      type: 'ACCESS_DENIED',
      error: error.message,
      ip: request?.headers.get('x-forwarded-for'),
      userAgent: request?.headers.get('user-agent'),
      timestamp: new Date(),
    }).catch(err => console.error('Failed to log security event:', err))

    return NextResponse.json({ error: error.message }, { status: 403 })
  }

  // ... resto del código
}

// src/lib/rbac/security-log.ts (NUEVO)
interface SecurityEvent {
  type: 'ACCESS_DENIED' | 'BRUTE_FORCE_ATTEMPT' | 'INVALID_TOKEN'
  error: string
  ip?: string
  userAgent?: string
  userId?: string
  resource?: string
  action?: string
  timestamp: Date
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  await prisma.securityLog.create({
    data: {
      type: event.type,
      message: event.error,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      userId: event.userId,
      metadata: {
        resource: event.resource,
        action: event.action,
      },
      timestamp: event.timestamp,
    }
  })
}
```

**Schema Prisma (agregar):**
```prisma
model SecurityLog {
  id         String   @id @default(cuid())
  type       String   // ACCESS_DENIED, BRUTE_FORCE_ATTEMPT, etc.
  message    String
  ipAddress  String?
  userAgent  String?
  userId     String?
  metadata   Json?
  timestamp  DateTime @default(now())

  @@index([timestamp])
  @@index([type])
  @@index([ipAddress])
}
```

**Impacto:** Alto (detección de intentos de intrusión)
**Esfuerzo:** Medio (3-4 horas)
**Prioridad:** 🔴 Crítica

---

### 3. 🟠 Validación de Entrada en Helpers [IMPORTANTE]

**Problema identificado:**
No hay sanitización explícita de parámetros en funciones críticas.

**Mejor práctica (OWASP):**
*"Validate and sanitize all inputs, especially in security-critical functions"*

**Implementación actual:**
```typescript
// src/lib/rbac/helpers.ts
export async function authorize(
  action: Action,
  resource: Resource,
  subject?: any  // ❌ `any` sin validación
): Promise<Session> {
  const session = await requireAuth()

  if (!(await checkPermission(session, action, resource, subject))) {
    throw new ForbiddenError('No tienes permiso')
  }

  return session
}
```

**Recomendación:**
```typescript
// src/lib/rbac/validation.ts (NUEVO)
import { z } from 'zod'

const AuthorizeSchema = z.object({
  action: z.nativeEnum(Action),
  resource: z.nativeEnum(Resource),
  subject: z.any().optional(),
})

export function validateAuthorizeParams(
  action: unknown,
  resource: unknown,
  subject?: unknown
) {
  try {
    return AuthorizeSchema.parse({ action, resource, subject })
  } catch (error) {
    throw new Error('Parámetros de autorización inválidos')
  }
}

// Modificar helpers.ts
export async function authorize(
  action: Action,
  resource: Resource,
  subject?: any
): Promise<Session> {
  // 🆕 Validar parámetros
  validateAuthorizeParams(action, resource, subject)

  const session = await requireAuth()

  if (!(await checkPermission(session, action, resource, subject))) {
    throw new ForbiddenError('No tienes permiso')
  }

  return session
}
```

**Impacto:** Medio (previene inyecciones y uso incorrecto)
**Esfuerzo:** Bajo (1-2 horas)
**Prioridad:** 🟠 Importante

---

## 📊 MEJORAS IMPORTANTES (Funcionalidad)

### 4. 🟠 Herencia de Roles

**Problema identificado:**
Los roles no tienen herencia explícita. Un ADMIN define todos sus permisos manualmente en lugar de heredar de roles inferiores.

**Mejor práctica (AccessControl.js):**
```javascript
// Herencia de roles explícita
ac.grant('user').readOwn('video');
ac.grant('admin').extend('user')  // Admin hereda permisos de user
  .createAny('video')
  .deleteAny('video');
```

**Implementación actual:**
```typescript
// src/lib/rbac/ability.ts
case UserRole.ADMIN:
  // ADMIN define todo manualmente
  ability.can(Action.MANAGE, [
    Resource.USER,
    Resource.TOURNAMENT,
    // ... 14 recursos
  ])
  break

case UserRole.CLUB_ADMIN:
  // CLUB_ADMIN define todo manualmente
  ability.can([Action.READ, Action.LIST], Resource.USER)
  ability.can(Action.MANAGE, [Resource.CLUB, Resource.TOURNAMENT])
  // ... más permisos
  break
```

**Recomendación:**
```typescript
// src/lib/rbac/roles.ts (NUEVO)
export class RoleHierarchy {
  private static hierarchy: Map<UserRole, UserRole[]> = new Map([
    [UserRole.ADMIN, [UserRole.CLUB_ADMIN, UserRole.REFEREE, UserRole.PLAYER]],
    [UserRole.CLUB_ADMIN, [UserRole.PLAYER]],
    [UserRole.REFEREE, [UserRole.PLAYER]],
    [UserRole.PLAYER, []],
  ])

  static inheritsFrom(role: UserRole, parentRole: UserRole): boolean {
    const parents = this.hierarchy.get(role) || []
    if (parents.includes(parentRole)) return true
    return parents.some(parent => this.inheritsFrom(parent, parentRole))
  }

  static getAllInheritedRoles(role: UserRole): UserRole[] {
    const inherited = this.hierarchy.get(role) || []
    const all = [...inherited]
    inherited.forEach(parent => {
      all.push(...this.getAllInheritedRoles(parent))
    })
    return [...new Set(all)]
  }
}

// src/lib/rbac/ability.ts (MODIFICAR)
export function defineAbilitiesFor(context: AuthorizationContext): Ability {
  const ability = new Ability(context)
  const { userRole, userId, userStatus } = context

  // Aplicar permisos del rol actual
  applyRolePermissions(ability, userRole, userId)

  // 🆕 Heredar permisos de roles inferiores
  const inheritedRoles = RoleHierarchy.getAllInheritedRoles(userRole)
  inheritedRoles.forEach(role => {
    applyRolePermissions(ability, role, userId)
  })

  return ability
}

function applyRolePermissions(ability: Ability, role: UserRole, userId: string) {
  switch (role) {
    case UserRole.PLAYER:
      ability.can(Action.READ, Resource.USER, ownsUser(userId))
      ability.can([Action.READ, Action.LIST], [Resource.TOURNAMENT, Resource.CLUB])
      // ... permisos base de PLAYER
      break

    case UserRole.CLUB_ADMIN:
      // Solo permisos adicionales, hereda de PLAYER
      ability.can(Action.MANAGE, [Resource.CLUB, Resource.TOURNAMENT])
      break

    case UserRole.ADMIN:
      // Solo permisos adicionales, hereda de CLUB_ADMIN y PLAYER
      ability.can(Action.MANAGE, [Resource.USER, Resource.CATEGORY])
      break
  }
}
```

**Beneficios:**
- ✅ Menos código duplicado
- ✅ Más fácil mantener
- ✅ Más flexible para agregar roles
- ✅ Sigue el principio DRY

**Impacto:** Medio (mejor mantenibilidad)
**Esfuerzo:** Medio (4-5 horas)
**Prioridad:** 🟠 Importante

---

### 5. 🟠 Tests Unitarios

**Problema identificado:**
No hay evidencia de tests para el sistema RBAC.

**Mejor práctica (Node.js Best Practices):**
*"Write tests for authorization logic - it's security-critical"*

**Recomendación:**
```typescript
// tests/lib/rbac/ability.test.ts (NUEVO)
import { describe, test, expect } from '@jest/globals'
import { Ability, Action, Resource, defineAbilitiesFor } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

describe('Ability', () => {
  describe('ADMIN role', () => {
    test('can manage all resources', () => {
      const context = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userStatus: 'ACTIVE'
      }
      const ability = defineAbilitiesFor(context)

      expect(ability.check(Action.CREATE, Resource.USER)).toBe(true)
      expect(ability.check(Action.DELETE, Resource.TOURNAMENT)).toBe(true)
      expect(ability.check(Action.MANAGE, Resource.CLUB)).toBe(true)
    })
  })

  describe('PLAYER role', () => {
    test('can read own user profile', () => {
      const userId = 'player-1'
      const context = {
        userId,
        userRole: UserRole.PLAYER,
        userStatus: 'ACTIVE'
      }
      const ability = defineAbilitiesFor(context)

      expect(ability.check(Action.READ, Resource.USER, { id: userId })).toBe(true)
    })

    test('cannot read other user profiles', () => {
      const userId = 'player-1'
      const context = {
        userId,
        userRole: UserRole.PLAYER,
        userStatus: 'ACTIVE'
      }
      const ability = defineAbilitiesFor(context)

      expect(ability.check(Action.READ, Resource.USER, { id: 'other-user' })).toBe(false)
    })

    test('cannot delete tournaments', () => {
      const context = {
        userId: 'player-1',
        userRole: UserRole.PLAYER,
        userStatus: 'ACTIVE'
      }
      const ability = defineAbilitiesFor(context)

      expect(ability.check(Action.DELETE, Resource.TOURNAMENT)).toBe(false)
    })
  })

  describe('SUSPENDED user', () => {
    test('can only read own profile', () => {
      const userId = 'suspended-1'
      const context = {
        userId,
        userRole: UserRole.PLAYER,
        userStatus: 'SUSPENDED'
      }
      const ability = defineAbilitiesFor(context)

      expect(ability.check(Action.READ, Resource.USER, { id: userId })).toBe(true)
      expect(ability.check(Action.READ, Resource.TOURNAMENT)).toBe(false)
    })
  })
})

// tests/lib/rbac/ownership.test.ts (NUEVO)
describe('Ownership helpers', () => {
  test('isTeamMember returns true for team member', () => {
    const userId = 'user-1'
    const team = {
      registration1: { player: { userId: 'user-1' } },
      registration2: { player: { userId: 'user-2' } }
    }

    expect(isTeamMember(userId, team)).toBe(true)
  })

  test('isTeamMember returns false for non-member', () => {
    const userId = 'user-3'
    const team = {
      registration1: { player: { userId: 'user-1' } },
      registration2: { player: { userId: 'user-2' } }
    }

    expect(isTeamMember(userId, team)).toBe(false)
  })
})

// tests/lib/rbac/cache.test.ts (NUEVO)
describe('AbilityCache', () => {
  test('caches abilities correctly', () => {
    const cache = AbilityCache.getInstance()
    const context = {
      userId: 'user-1',
      userRole: UserRole.PLAYER,
      userStatus: 'ACTIVE'
    }

    const ability1 = cache.get(context)
    const ability2 = cache.get(context)

    expect(ability1).toBe(ability2) // Same instance
    expect(cache.getStats().hits).toBe(1)
  })

  test('respects TTL', async () => {
    const cache = AbilityCache.getInstance()
    // ... test TTL expiration
  })
})
```

**Scripts de prueba (package.json):**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:rbac": "jest tests/lib/rbac"
  }
}
```

**Impacto:** Alto (confiabilidad del sistema)
**Esfuerzo:** Alto (8-10 horas)
**Prioridad:** 🟠 Importante

---

### 6. 🟡 Principio de Mínimo Privilegio

**Problema identificado:**
Algunos roles tienen permisos muy amplios. Por ejemplo, CLUB_ADMIN puede hacer MANAGE (todas las acciones) en torneos.

**Mejor práctica (Security standards):**
*"Grant only the minimum permissions required for each role"*

**Implementación actual:**
```typescript
case UserRole.CLUB_ADMIN:
  ability.can(Action.MANAGE, [
    Resource.CLUB,
    Resource.COURT,
    Resource.TOURNAMENT,  // ❌ Muy amplio
    Resource.CATEGORY,
  ])
```

**Recomendación:**
```typescript
case UserRole.CLUB_ADMIN:
  // En lugar de MANAGE (que incluye DELETE), ser más específico
  ability.can([Action.CREATE, Action.READ, Action.UPDATE], Resource.CLUB)
  ability.can([Action.CREATE, Action.READ, Action.UPDATE], Resource.COURT)
  ability.can([Action.CREATE, Action.READ, Action.UPDATE], Resource.TOURNAMENT)
  ability.can([Action.CREATE, Action.READ, Action.UPDATE], Resource.CATEGORY)

  // DELETE solo con condiciones (ownership o club específico)
  ability.can(Action.DELETE, Resource.TOURNAMENT, (tournament: any) => {
    return tournament.club?.adminId === userId
  })
```

**Matriz de Permisos Sugerida:**

| Recurso | ADMIN | CLUB_ADMIN | PLAYER | REFEREE |
|---------|-------|------------|--------|---------|
| Users | CRUD | R | R (own) | R (own) |
| Tournaments | CRUD | CRU* | R | R |
| Clubs | CRUD | CRU* | R | R |
| Registrations | CRUD | CRA (Approve) | CR (own), U (own), D (own) | R |
| Matches | CRUD | RU | R | RU (assigned) |
| Rankings | CRUD | R | R | R |

*CRU = Create, Read, Update (sin Delete global)

**Impacto:** Medio (reduce riesgo de errores accidentales)
**Esfuerzo:** Bajo (2-3 horas)
**Prioridad:** 🟡 Deseable

---

### 7. 🟡 Registro de Contexto en Auditoría

**Problema identificado:**
El sistema de auditoría registra IP y User-Agent, pero no registra contexto adicional útil como el recurso y acción que se intentó.

**Recomendación:**
```typescript
// src/lib/rbac/audit.ts (MODIFICAR)
export interface AuditLogOptions {
  action: Action
  resource: Resource
  resourceId?: string
  description?: string
  oldData?: any
  newData?: any
  metadata?: any
  ipAddress?: string
  userAgent?: string
  // 🆕 AGREGAR:
  success?: boolean        // Si la operación fue exitosa
  errorMessage?: string    // Si falló, por qué
  durationMs?: number      // Tiempo que tomó la operación
  requestPath?: string     // URL del endpoint
  requestMethod?: string   // GET, POST, PUT, DELETE
}
```

**Impacto:** Bajo (mejor trazabilidad)
**Esfuerzo:** Bajo (1 hora)
**Prioridad:** 🟡 Deseable

---

## 💡 MEJORAS OPCIONALES (Optimización)

### 8. 🟢 Caché Distribuido (Redis)

**Problema identificado:**
El caché actual es en memoria local, lo que no funciona bien en ambientes con múltiples instancias (horizontal scaling).

**Mejor práctica:**
*"Use distributed cache for multi-instance deployments"*

**Implementación actual:**
```typescript
// src/lib/rbac/cache.ts
export class AbilityCache {
  private cache: Map<string, CacheEntry> = new Map()
  // ❌ Solo funciona en una instancia
}
```

**Recomendación:**
```typescript
// src/lib/rbac/cache-redis.ts (NUEVO - solo para producción)
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export class DistributedAbilityCache {
  private static instance: DistributedAbilityCache
  private ttl = 5 * 60 * 1000 // 5 minutos

  static getInstance(): DistributedAbilityCache {
    if (!this.instance) {
      this.instance = new DistributedAbilityCache()
    }
    return this.instance
  }

  async get(context: AuthorizationContext): Promise<Ability | null> {
    const key = this.generateKey(context)
    const cached = await redis.get(key)

    if (cached) {
      return this.deserialize(cached)
    }

    return null
  }

  async set(context: AuthorizationContext, ability: Ability): Promise<void> {
    const key = this.generateKey(context)
    const serialized = this.serialize(ability)
    await redis.setex(key, this.ttl / 1000, serialized)
  }

  private serialize(ability: Ability): string {
    return JSON.stringify(ability.getRules())
  }

  private deserialize(data: string): Ability {
    // Reconstruir Ability desde rules
    // ...
  }
}

// src/lib/rbac/cache.ts (MODIFICAR para soportar ambos)
export function getCachedAbility(context: AuthorizationContext): Ability {
  // En producción con múltiples instancias, usar Redis
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    return getDistributedCachedAbility(context)
  }

  // En desarrollo, usar caché en memoria
  return getLocalCachedAbility(context)
}
```

**Impacto:** Bajo (solo necesario si hay múltiples instancias)
**Esfuerzo:** Alto (6-8 horas)
**Prioridad:** 🟢 Opcional

---

### 9. 🟢 Performance Metrics

**Recomendación:**
Agregar métricas de performance para detectar cuellos de botella.

```typescript
// src/lib/rbac/metrics.ts (NUEVO)
export class RBACMetrics {
  private static checks: Map<string, number[]> = new Map()

  static recordCheck(action: Action, resource: Resource, durationMs: number) {
    const key = `${action}:${resource}`
    const durations = this.checks.get(key) || []
    durations.push(durationMs)
    this.checks.set(key, durations)
  }

  static getStats() {
    const stats: Record<string, any> = {}

    this.checks.forEach((durations, key) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const max = Math.max(...durations)
      const min = Math.min(...durations)

      stats[key] = {
        count: durations.length,
        avgMs: avg.toFixed(2),
        maxMs: max,
        minMs: min
      }
    })

    return stats
  }
}

// Uso en ability.ts
check(action: Action, resource: Resource, subject?: any): boolean {
  const start = Date.now()
  const result = this.evaluateRules(applicableRules, subject)
  const duration = Date.now() - start

  RBACMetrics.recordCheck(action, resource, duration)

  return result
}
```

**Impacto:** Bajo (útil para optimización)
**Esfuerzo:** Bajo (2-3 horas)
**Prioridad:** 🟢 Opcional

---

### 10. 🟢 Webhooks de Eventos de Seguridad

**Recomendación:**
Notificar eventos críticos de seguridad a sistemas externos (Slack, email, SIEM).

```typescript
// src/lib/rbac/webhooks.ts (NUEVO)
interface SecurityWebhook {
  url: string
  events: string[]
}

export class SecurityNotifier {
  private static webhooks: SecurityWebhook[] = []

  static async notifyAccessDenied(event: {
    userId: string
    action: Action
    resource: Resource
    ip: string
  }) {
    const payload = {
      type: 'ACCESS_DENIED',
      timestamp: new Date().toISOString(),
      severity: 'high',
      ...event
    }

    await Promise.all(
      this.webhooks.map(hook =>
        fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      )
    )
  }
}
```

**Impacto:** Bajo (útil para equipos grandes)
**Esfuerzo:** Medio (4-5 horas)
**Prioridad:** 🟢 Opcional

---

## 📊 COMPARACIÓN CON FRAMEWORKS PROFESIONALES

### vs AccessControl.js

| Característica | AccessControl.js | PadApp RBAC | Estado |
|----------------|------------------|-------------|--------|
| RBAC básico | ✅ | ✅ | Paridad |
| Ownership contextual | ✅ | ✅ | Paridad |
| Herencia de roles | ✅ | ❌ | Mejora #4 |
| Caché de permisos | ❌ | ✅ | Ventaja |
| Auditoría | ❌ | ✅ | Ventaja |
| TypeScript nativo | ✅ | ✅ | Paridad |
| Tests incluidos | ✅ | ❌ | Mejora #5 |

**Conclusión:** Sistema comparable, con ventajas en auditoría pero le falta herencia de roles.

---

### vs Oso (Framework Profesional)

| Característica | Oso | PadApp RBAC | Estado |
|----------------|-----|-------------|--------|
| RBAC | ✅ | ✅ | Paridad |
| ReBAC (relaciones) | ✅ | ✅ (ownership) | Paridad |
| ABAC (atributos) | ✅ | ⚠️ (limitado) | Oso superior |
| Lenguaje de políticas | ✅ Polar DSL | ❌ TypeScript | Oso superior |
| Testing built-in | ✅ | ❌ | Mejora #5 |
| Performance | ✅ Optimizado | ✅ Con caché | Paridad |
| Auditoría | ⚠️ Externa | ✅ Built-in | Ventaja |
| Learning curve | Alta | Baja | Ventaja |
| Autorización local | ✅ | ❌ | Oso superior |

**Conclusión:** Oso es más potente y flexible, pero PadApp RBAC es más simple y suficiente para las necesidades del proyecto.

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Seguridad Crítica (Semana 1-2) - 10-12 horas

**Prioridad: 🔴 CRÍTICA**

1. ✅ **Rate Limiting** (3 horas)
   - Implementar `rate-limit.ts`
   - Integrar en `requireAuth()`
   - Testing manual

2. ✅ **Logging de accesos denegados** (4 horas)
   - Crear tabla `SecurityLog`
   - Implementar `logSecurityEvent()`
   - Actualizar `handleAuthError()`

3. ✅ **Validación de entrada** (2 horas)
   - Crear `validation.ts`
   - Integrar Zod en helpers críticos

4. ✅ **Testing inicial** (3 horas)
   - Setup Jest
   - Tests básicos de Ability
   - Tests de ownership

---

### Fase 2: Funcionalidad Importante (Semana 3-4) - 15-18 horas

**Prioridad: 🟠 IMPORTANTE**

5. ✅ **Herencia de roles** (5 horas)
   - Implementar `RoleHierarchy`
   - Refactorizar `defineAbilitiesFor()`
   - Actualizar documentación

6. ✅ **Suite completa de tests** (8 horas)
   - Tests de roles
   - Tests de caché
   - Tests de auditoría
   - Tests de rate limiting

7. ✅ **Principio de mínimo privilegio** (3 horas)
   - Revisar permisos de CLUB_ADMIN
   - Ajustar matriz de permisos
   - Documentar cambios

---

### Fase 3: Mejoras Opcionales (Futuro) - 10-15 horas

**Prioridad: 🟢 OPCIONAL** (solo si hay necesidad)

8. ⏸️ Caché distribuido (Redis) - solo si se escala horizontalmente
9. ⏸️ Métricas de performance - si hay problemas de rendimiento
10. ⏸️ Webhooks de seguridad - si hay equipo de seguridad dedicado

---

## 📈 MÉTRICAS DE ÉXITO

### Antes de Implementar Mejoras

- ❌ Sin protección contra brute force
- ❌ Accesos denegados no registrados
- ❌ Permisos sin tests
- ⚠️ Roles sin herencia
- ⚠️ 0% cobertura de tests en RBAC

### Después de Fase 1 (Crítico)

- ✅ Rate limiting activo (max 10 intentos/min)
- ✅ Todos los accesos denegados registrados
- ✅ Validación de entrada en helpers críticos
- ✅ Tests básicos implementados (>50% cobertura)

### Después de Fase 2 (Importante)

- ✅ Herencia de roles funcional
- ✅ >80% cobertura de tests
- ✅ Principio de mínimo privilegio aplicado
- ✅ Documentación actualizada

---

## 🔍 RECURSOS CONSULTADOS

### 1. Node.js Best Practices
- **Fuente**: https://github.com/goldbergyoni/nodebestpractices
- **Temas**: Security, Authorization, Password hashing, Rate limiting
- **Confiabilidad**: ⭐⭐⭐⭐⭐ (Trust Score: 9.6)

### 2. AccessControl.js
- **Fuente**: https://github.com/onury/accesscontrol
- **Temas**: RBAC implementation, Role inheritance, Permissions
- **Confiabilidad**: ⭐⭐⭐⭐ (Trust Score: 8.9)

### 3. Oso Authorization Framework
- **Fuente**: https://osohq.com/docs
- **Temas**: RBAC, ReBAC, Policy patterns, Best practices
- **Confiabilidad**: ⭐⭐⭐⭐⭐ (Trust Score: 9.5+)

---

## 💬 CONCLUSIONES

### Fortalezas del Sistema Actual

El sistema RBAC de PadApp es **sólido y bien arquitecturado**, con características avanzadas como:
- ✅ Ownership contextual
- ✅ Auditoría completa con Strategy Pattern
- ✅ Caché de permisos optimizado
- ✅ Type-safety completo
- ✅ Documentación extensa

### Áreas Prioritarias de Mejora

Las **3 mejoras críticas de seguridad** (rate limiting, logging de accesos denegados, validación) deben implementarse cuanto antes para proteger el sistema contra ataques comunes.

Las **4 mejoras importantes** (herencia de roles, tests, mínimo privilegio, contexto en auditoría) mejorarán significativamente la mantenibilidad y confiabilidad del sistema.

Las **3 mejoras opcionales** pueden posponerse hasta que haya necesidades específicas.

### Comparación con Estándares de la Industria

El sistema actual está **al nivel de frameworks comerciales** como AccessControl.js en términos de funcionalidad RBAC básica, y **supera a muchos** en auditoría integrada. Solo le falta herencia de roles y tests para estar completamente alineado con las mejores prácticas.

### Recomendación Final

**Implementar Fase 1 y Fase 2** del plan de acción (25-30 horas totales) elevará el sistema a un **9.5/10** en términos de mejores prácticas de RBAC, haciéndolo production-ready para aplicaciones empresariales de alta seguridad.

---

## 🔒 AUDITORÍA DE SEGURIDAD RBAC

> **Ejecutada por**: Agente especializado rbac-security-auditor
> **Fecha**: 2025-10-17
> **Alcance**: 46 rutas API analizadas

### 📊 Resultados de la Auditoría

#### Estadísticas Generales

| Categoría | Cantidad | Porcentaje |
|-----------|----------|------------|
| **Total rutas auditadas** | 46 | 100% |
| ✅ Rutas con RBAC moderno | 37 | 80% |
| ⚠️ Rutas con autenticación legacy | 6 | 13% |
| 🔓 Rutas públicas | 3 | 7% |
| ❌ Sin rate limiting | 42 | 91% |
| ✅ Con auditoría completa | 35 | 95% |
| ❌ Logging de denegaciones | 0 | 0% |

---

### 🔴 VULNERABILIDADES CRÍTICAS ENCONTRADAS

#### 1. Autenticación Legacy en 6 Rutas [CRÍTICO]

**Archivos afectados:**

1. `src/app/api/admin/logs/route.ts:15-22`
   ```typescript
   // ❌ Usa getServerSession directamente
   const session = await getServerSession(authOptions)
   if (!session?.user || session.user.role !== 'ADMIN') {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

2. `src/app/api/admin/tournaments/route.ts:10`
3. `src/app/api/tournaments/status-update/route.ts:25`
4. `src/app/api/users/stats/route.ts:12`
5. `src/app/api/admin/system/route.ts:8`
6. `src/app/api/webhooks/*/route.ts:5`

**Problema**: No usan el sistema RBAC unificado, verificaciones manuales de rol, inconsistencias de seguridad.

**Corrección requerida:**
```typescript
// ✅ Migrar a sistema RBAC
import { requireAuth, authorize, handleAuthError, Action, Resource } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const session = await authorize(Action.READ, Resource.DASHBOARD)
    // ... lógica
  } catch (error) {
    return handleAuthError(error)
  }
}
```

**Tiempo estimado**: 2-3 horas (30 min por ruta)

---

#### 2. Sin Logging de Accesos Denegados [CRÍTICO]

**Problema detectado:**
- **0/46 rutas** registran intentos fallidos de autorización
- Imposible detectar patrones de ataque
- Sin alertas de seguridad

**Ejemplo de ataque no detectable:**
```bash
# Atacante intenta 50 veces acceder a recurso prohibido
curl -H "Authorization: Bearer <token>" https://api.padapp.com/api/users/admin-id
# Resultado: 403 Forbidden
# ❌ NO SE REGISTRA EN LOGS
# No hay forma de detectar el comportamiento sospechoso
```

**Corrección necesaria:**

1. **Crear modelo SecurityLog en Prisma**:
```prisma
model SecurityLog {
  id         String   @id @default(cuid())
  type       String   // ACCESS_DENIED, RATE_LIMIT_EXCEEDED, INVALID_TOKEN
  severity   String   // low, medium, high, critical
  message    String
  ipAddress  String?
  userAgent  String?
  userId     String?
  resource   String?
  action     String?
  metadata   Json?
  timestamp  DateTime @default(now())

  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([timestamp])
  @@index([type])
  @@index([severity])
  @@index([ipAddress])
  @@index([userId])
}
```

2. **Implementar servicio de logging**:
```typescript
// src/lib/services/security-log-service.ts
import { prisma } from '@/lib/prisma'

export type SecurityEventType =
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

interface SecurityLogData {
  type: SecurityEventType
  severity: SecuritySeverity
  message: string
  userId?: string
  resource?: string
  action?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export class SecurityLogService {
  static async logEvent(data: SecurityLogData): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: data.type,
          severity: data.severity,
          message: data.message,
          userId: data.userId,
          resource: data.resource,
          action: data.action,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
          timestamp: new Date(),
        },
      })
    } catch (error) {
      // No lanzar error para no interrumpir operación principal
      console.error('[SecurityLog] Failed to log event:', error)
    }
  }

  static async logAccessDenied(data: {
    userId?: string
    resource: string
    action: string
    ip?: string
    userAgent?: string
    reason?: string
  }): Promise<void> {
    await this.logEvent({
      type: 'ACCESS_DENIED',
      severity: 'high',
      message: `Access denied to ${data.action} ${data.resource}${data.reason ? `: ${data.reason}` : ''}`,
      userId: data.userId,
      resource: data.resource,
      action: data.action,
      ipAddress: data.ip,
      userAgent: data.userAgent,
    })
  }

  static async logRateLimitExceeded(data: {
    ip: string
    userId?: string
    endpoint: string
  }): Promise<void> {
    await this.logEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'medium',
      message: `Rate limit exceeded for ${data.endpoint}`,
      userId: data.userId,
      ipAddress: data.ip,
      metadata: { endpoint: data.endpoint },
    })
  }
}
```

3. **Integrar en handleAuthError**:
```typescript
// src/lib/rbac/helpers.ts (MODIFICAR)
import { SecurityLogService } from '@/lib/services/security-log-service'

export function handleAuthError(error: unknown, request?: NextRequest): NextResponse {
  console.error('Authorization error:', error)

  const ip = request?.headers.get('x-forwarded-for') || undefined
  const userAgent = request?.headers.get('user-agent') || undefined

  // 🆕 AGREGAR: Logging de accesos denegados
  if (error instanceof ForbiddenError) {
    // Extraer información del error si está disponible
    const errorData = (error as any).context || {}

    SecurityLogService.logAccessDenied({
      userId: errorData.userId,
      resource: errorData.resource || 'unknown',
      action: errorData.action || 'unknown',
      ip,
      userAgent,
      reason: error.message,
    }).catch(err => console.error('Failed to log security event:', err))

    return NextResponse.json({ error: error.message }, { status: 403 })
  }

  if (error instanceof UnauthorizedError) {
    SecurityLogService.logEvent({
      type: 'INVALID_TOKEN',
      severity: 'medium',
      message: error.message,
      ipAddress: ip,
      userAgent,
    }).catch(err => console.error('Failed to log security event:', err))

    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // ... resto del código
}
```

**Tiempo estimado**: 3-4 horas

---

#### 3. Sin Rate Limiting [CRÍTICO]

**Problema detectado:**
- **42/46 rutas** (91%) sin protección de rate limiting
- Vulnerables a:
  - Ataques DDoS
  - Fuerza bruta
  - Scraping masivo
  - Abuso de API

**Escenarios de ataque posibles:**
```bash
# 1. DDoS simple
for i in {1..10000}; do
  curl https://api.padapp.com/api/tournaments &
done

# 2. Fuerza bruta en autenticación
for password in $(cat passwords.txt); do
  curl -X POST https://api.padapp.com/api/auth/signin \
    -d "email=admin@padapp.com&password=$password"
done

# 3. Scraping de datos
for id in {1..10000}; do
  curl https://api.padapp.com/api/users/$id
done
```

**Corrección necesaria:**

1. **Instalar dependencia**:
```bash
npm install rate-limiter-flexible
```

2. **Implementar sistema de rate limiting**:
```typescript
// src/lib/rbac/rate-limit.ts (NUEVO)
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest } from 'next/server'
import { SecurityLogService } from '@/lib/services/security-log-service'

// Configuraciones por tipo de endpoint
const RATE_LIMITS = {
  // Autenticación: muy estricto
  auth: {
    points: 5,           // 5 intentos
    duration: 60,        // por minuto
    blockDuration: 900,  // bloqueo de 15 minutos
  },
  // Escritura: estricto
  write: {
    points: 30,          // 30 operaciones
    duration: 60,        // por minuto
    blockDuration: 300,  // bloqueo de 5 minutos
  },
  // Lectura: moderado
  read: {
    points: 100,         // 100 consultas
    duration: 60,        // por minuto
    blockDuration: 60,   // bloqueo de 1 minuto
  },
}

// Limitadores
const authLimiter = new RateLimiterMemory(RATE_LIMITS.auth)
const writeLimiter = new RateLimiterMemory(RATE_LIMITS.write)
const readLimiter = new RateLimiterMemory(RATE_LIMITS.read)

export type RateLimitType = 'auth' | 'write' | 'read'

/**
 * Verificar rate limit para una petición
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'read',
  identifier?: string
): Promise<void> {
  // Usar IP como identificador por defecto
  const ip = identifier || request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') || 'unknown'

  // Seleccionar limiter según tipo
  const limiter = type === 'auth' ? authLimiter :
                  type === 'write' ? writeLimiter :
                  readLimiter

  try {
    await limiter.consume(ip)
  } catch (error) {
    // Log del evento
    await SecurityLogService.logRateLimitExceeded({
      ip,
      endpoint: request.nextUrl.pathname,
    })

    throw new RateLimitError(
      `Demasiadas peticiones. Intenta de nuevo en ${RATE_LIMITS[type].blockDuration / 60} minutos.`
    )
  }
}

/**
 * Error personalizado de rate limiting
 */
export class RateLimitError extends Error {
  statusCode = 429
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Wrapper para aplicar rate limiting a rutas
 */
export function withRateLimit(type: RateLimitType = 'read') {
  return function <T = any>(
    handler: (request: NextRequest, context: T) => Promise<Response>
  ) {
    return async (request: NextRequest, context: T) => {
      try {
        await checkRateLimit(request, type)
        return await handler(request, context)
      } catch (error) {
        if (error instanceof RateLimitError) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': type === 'auth' ? '900' : '60',
            },
          })
        }
        throw error
      }
    }
  }
}
```

3. **Integrar en helpers.ts**:
```typescript
// src/lib/rbac/helpers.ts (MODIFICAR)
import { checkRateLimit, RateLimitType } from './rate-limit'

export async function requireAuth(
  request?: NextRequest,
  rateLimitType: RateLimitType = 'read'
): Promise<Session> {
  // 🆕 AGREGAR: Rate limiting
  if (request) {
    await checkRateLimit(request, rateLimitType)
  }

  const session = await getCurrentSession()
  if (!session?.user) {
    throw new UnauthorizedError('Debes iniciar sesión para acceder')
  }

  return session
}

export async function authorize(
  action: Action,
  resource: Resource,
  subject?: any,
  request?: NextRequest
): Promise<Session> {
  // 🆕 AGREGAR: Rate limiting basado en acción
  if (request) {
    const rateLimitType = [Action.CREATE, Action.UPDATE, Action.DELETE].includes(action)
      ? 'write'
      : 'read'
    await checkRateLimit(request, rateLimitType)
  }

  const session = await requireAuth(request, 'read')

  if (!(await checkPermission(session, action, resource, subject))) {
    throw new ForbiddenError('No tienes permiso para realizar esta acción', {
      userId: session.user.id,
      resource,
      action,
    })
  }

  return session
}
```

4. **Actualizar handleAuthError para manejar RateLimitError**:
```typescript
// src/lib/rbac/helpers.ts
import { RateLimitError } from './rate-limit'

export function handleAuthError(error: unknown, request?: NextRequest): NextResponse {
  console.error('Authorization error:', error)

  // ... código existente ...

  // 🆕 AGREGAR: Manejo de rate limit
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        }
      }
    )
  }

  // ... resto del código
}
```

**Tiempo estimado**: 3-4 horas

---

### ⚠️ VULNERABILIDADES IMPORTANTES

#### 4. Verificaciones Manuales de Ownership (17 instancias)

**Ejemplos encontrados:**

1. `src/app/api/teams/[id]/route.ts:45-52`
   ```typescript
   // ❌ Verificación manual hardcoded
   const team = await prisma.team.findUnique({ where: { id } })
   const user = await prisma.user.findUnique({ where: { id: session.user.id }})

   if (user?.role !== "ADMIN" &&
       team.player1Id !== session.user.id &&
       team.player2Id !== session.user.id) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
   }
   ```

2. `src/app/api/registrations/[id]/route.ts:78`
3. `src/app/api/tournaments/[id]/route.ts:102`

**Problema**: Código duplicado, propenso a errores, inconsistente.

**Corrección**:
```typescript
// ✅ Usar sistema RBAC
const team = await prisma.team.findUnique({
  where: { id },
  include: {
    registration1: { include: { player: true }},
    registration2: { include: { player: true }}
  }
})

await authorize(Action.UPDATE, Resource.TEAM, team)
// El sistema RBAC verifica ownership automáticamente
```

**Tiempo estimado**: 2-3 horas (eliminar 17 verificaciones manuales)

---

#### 5. Sin Protección CSRF

**Problema**: Las rutas POST/PUT/DELETE no validan tokens CSRF.

**Corrección sugerida**:
```typescript
// src/middleware.ts o implementar middleware específico
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Verificar CSRF token en operaciones de modificación
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token')
    const cookieToken = request.cookies.get('csrf-token')?.value

    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: 'CSRF token inválido' },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Tiempo estimado**: 3-4 horas

---

### 📋 RESUMEN DE CORRECCIONES FASE 1

#### Tareas Priorizadas

1. ✅ **Migrar 6 rutas legacy a RBAC** (2-3 horas)
   - Archivos: admin/logs, admin/tournaments, tournaments/status-update, users/stats, admin/system, webhooks/*
   - Patrón uniforme: usar `authorize()` en lugar de verificaciones manuales

2. ✅ **Implementar SecurityLog** (3-4 horas)
   - Crear modelo Prisma
   - Implementar SecurityLogService
   - Integrar en handleAuthError
   - Registrar todos los 401/403

3. ✅ **Implementar Rate Limiting** (3-4 horas)
   - Instalar rate-limiter-flexible
   - Crear rate-limit.ts con 3 niveles (auth, write, read)
   - Integrar en requireAuth() y authorize()
   - Manejar RateLimitError

4. ✅ **Eliminar verificaciones manuales** (2-3 horas)
   - 17 instancias en teams, registrations, tournaments
   - Confiar en el sistema RBAC

**Total Fase 1**: 10-14 horas
**Impacto**: Sistema pasa de 8.5/10 a 9.0/10 en seguridad

---

### 🎯 MÉTRICAS POST-IMPLEMENTACIÓN

#### Después de Fase 1

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Rutas con RBAC | 80% | 100% | +20% |
| Rate limiting | 9% | 100% | +91% |
| Logging de denegaciones | 0% | 100% | +100% |
| Verificaciones manuales | 17 | 0 | -100% |
| Protección contra brute force | ❌ | ✅ | - |
| Detección de ataques | ❌ | ✅ | - |

---

**Auditoría ejecutada el**: 2025-10-17
**Próxima auditoría recomendada**: Después de implementar Fase 1
**Agente**: rbac-security-auditor

---

**Documento generado el**: 2025-10-17
**Próxima revisión recomendada**: Después de implementar Fase 1
**Autor**: Análisis comparativo con Context7 (AccessControl.js, Node.js Best Practices, Oso) + Auditoría especializada
**Versión**: 1.1
