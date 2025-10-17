# 📝 Sistema de Logs y Auditoría - PadApp

*Última actualización: Octubre 17, 2025*

## 🎯 Resumen

Sistema completo de logging y auditoría que registra automáticamente todas las acciones realizadas en el sistema, proporcionando trazabilidad total y cumplimiento de auditoría.

---

## 📊 Cobertura del Sistema

### Módulos con Logging Completo (9 servicios)

1. **Usuarios** - `UserLog` + `UserLogService`
2. **Inscripciones** - `RegistrationLog` + `RegistrationLogService`
3. **Equipos** - `TeamLog` + `TeamLogService`
4. **Torneos** - `TournamentLog` + `TournamentLogService`
5. **Clubes** - `ClubLog` + `ClubLogService`
6. **Canchas** - `CourtLog` + `CourtLogService`
7. **Categorías** - `CategoryLog` + `CategoryLogService`
8. **Rankings** - `RankingLog` + `RankingsLogService`
9. **Partidos** - `MatchLog` + `MatchLogService` ✅

---

## 🗄️ Estructura de Base de Datos

### Modelo de Log (Común a todos)

Cada tabla de log contiene:

```typescript
{
  id: string              // ID único del log
  action: LogAction       // Tipo de acción (enum)
  description: string     // Descripción legible
  userId: string          // Usuario que realizó la acción
  ipAddress?: string      // IP del cliente
  userAgent?: string      // User agent del navegador
  oldData?: Json          // Datos anteriores (sanitizados)
  newData?: Json          // Datos nuevos (sanitizados)
  metadata?: Json         // Metadata adicional (cambios, contexto)
  createdAt: DateTime     // Timestamp de la acción

  // Relaciones específicas según módulo
  targetUserId?: string   // Para UserLog
  registrationId?: string // Para RegistrationLog
  teamId?: string         // Para TeamLog
  tournamentId?: string   // Para TournamentLog
  // ... etc
}
```

### Enum LogAction

```typescript
enum LogAction {
  // Usuarios
  USER_CREATED
  USER_UPDATED
  USER_DELETED
  USER_STATUS_CHANGED
  USER_ROLE_CHANGED

  // Inscripciones
  REGISTRATION_CREATED
  REGISTRATION_UPDATED
  REGISTRATION_DELETED
  REGISTRATION_STATUS_CHANGED
  REGISTRATION_PAYMENT_UPDATED

  // Equipos
  TEAM_CREATED
  TEAM_UPDATED
  TEAM_DELETED
  TEAM_STATUS_CHANGED
  TEAM_CONFIRMED

  // Torneos
  TOURNAMENT_CREATED
  TOURNAMENT_UPDATED
  TOURNAMENT_DELETED
  TOURNAMENT_STATUS_CHANGED
  BRACKET_GENERATED
  BRACKET_REGENERATED

  // Clubes
  CLUB_CREATED
  CLUB_UPDATED
  CLUB_DELETED
  CLUB_STATUS_CHANGED

  // Canchas
  COURT_CREATED
  COURT_UPDATED
  COURT_DELETED
  COURT_STATUS_CHANGED

  // Categorías
  CATEGORY_CREATED
  CATEGORY_UPDATED
  CATEGORY_DELETED
  CATEGORY_STATUS_CHANGED

  // Rankings
  RANKING_CREATED
  RANKING_UPDATED
  RANKING_DELETED
  POINTS_UPDATED
  POINTS_CALCULATED
  SEASON_UPDATED
  MANUAL_ADJUSTMENT

  // Partidos
  MATCH_CREATED
  MATCH_UPDATED
  MATCH_RESULT_ADDED
  MATCH_WINNER_PROGRESSED
  MATCH_DELETED
  MATCH_STATUS_CHANGED

  // General
  USER_ACTION
}
```

---

## 🔧 Servicios de Logging

### 1. UserLogService

**Ubicación**: `src/lib/services/user-log-service.ts`

**Utilizado en**:
- `src/app/api/users/route.ts` (POST)
- `src/app/api/users/[id]/route.ts` (PUT, DELETE, PATCH)

**Métodos**:
```typescript
// Logs específicos
UserLogService.logUserCreated(context, userData)
UserLogService.logUserUpdated(context, oldData, newData)
UserLogService.logUserDeleted(context, userData)
UserLogService.logUserStatusChanged(context, userData, oldStatus, newStatus)
UserLogService.logUserRoleChanged(context, userData, oldRole, newRole)

// Consultas
UserLogService.getUserLogs(targetUserId, limit)
UserLogService.getRecentLogs(limit)
UserLogService.getLogStats(days)
```

**Características**:
- Sanitiza contraseñas automáticamente
- Detecta cambios en campos importantes (name, email, role, status)
- Captura metadata de transición de estados

### 2. RegistrationLogService

**Ubicación**: `src/lib/services/registration-log-service.ts`

**Utilizado en**:
- `src/app/api/registrations/route.ts` (POST)
- `src/app/api/registrations/[id]/route.ts` (PUT, DELETE)
- `src/app/api/registrations/[id]/status/route.ts` (PATCH)

**Métodos**:
```typescript
// Logs específicos
RegistrationLogService.logRegistrationCreated(context, registrationData)
RegistrationLogService.logRegistrationUpdated(context, oldData, newData)
RegistrationLogService.logRegistrationDeleted(context, registrationData)
RegistrationLogService.logRegistrationStatusChanged(context, data, oldStatus, newStatus)
RegistrationLogService.logRegistrationPaymentUpdated(context, data, paymentData)

// Consultas
RegistrationLogService.getRegistrationLogs(registrationId, limit)
RegistrationLogService.getRecentLogs(limit)
RegistrationLogService.getLogStats(days)
```

**Características**:
- Incluye información del jugador y torneo
- Tracking de cambios de estado de pago
- Metadata con nombres legibles

### 3. TeamLogService

**Ubicación**: `src/lib/services/team-log-service.ts`

**Utilizado en**:
- `src/app/api/teams/route.ts` (POST)
- `src/app/api/teams/[id]/route.ts` (PUT, DELETE)

**Métodos**:
```typescript
// Logs específicos
TeamLogService.logTeamCreated(context, teamData)
TeamLogService.logTeamUpdated(context, oldData, newData)
TeamLogService.logTeamDeleted(context, teamData)
TeamLogService.logTeamStatusChanged(context, teamData, oldStatus, newStatus)
TeamLogService.logTeamConfirmed(context, teamData)

// Consultas
TeamLogService.getTeamLogs(teamId, limit)
TeamLogService.getRecentLogs(limit)
TeamLogService.getLogStats(days)
```

**Características**:
- Registra formación de equipos/parejas
- Tracking de confirmaciones
- Incluye nombres de ambos jugadores

### 4. TournamentLogService

**Ubicación**: `src/lib/services/tournament-log-service.ts`

**Utilizado en**:
- `src/app/api/tournaments/[id]/status/route.ts` (PATCH)

### 5. CategoryLogService

**Ubicación**: `src/lib/services/category-log-service.ts`

**Utilizado en**:
- Implementado pero pendiente de integración en endpoints API

### 6. ClubLogService

**Ubicación**: `src/lib/services/club-log-service.ts`

**Utilizado en**:
- Implementado pero pendiente de integración en endpoints API

### 7. CourtLogService

**Ubicación**: `src/lib/services/court-log-service.ts`

**Utilizado en**:
- Implementado pero pendiente de integración en endpoints API

### 8. RankingsLogService

**Ubicación**: `src/lib/services/rankings-log-service.ts`

**Utilizado en**:
- Implementado pero pendiente de integración en endpoints API

### 9. MatchLogService

**Ubicación**: `src/lib/services/match-log-service.ts`

**Utilizado en**:
- `src/app/api/matches/[id]/result/route.ts` (POST)
- `src/app/api/admin/logs/route.ts` (GET)

**Métodos**:
```typescript
// Logs específicos
MatchLogService.logMatchCreated(context, matchData)
MatchLogService.logMatchUpdated(context, oldData, newData)
MatchLogService.logMatchResultAdded(context, matchData, resultData)
MatchLogService.logMatchDeleted(context, matchData)
MatchLogService.logMatchStatusChanged(context, matchData, oldStatus, newStatus)

// Consultas
MatchLogService.getMatchLogs(matchId, limit)
MatchLogService.getRecentLogs(limit)
MatchLogService.getLogStats(days)
```

**Características**:
- Registra creación y actualización de partidos
- Tracking de cambios de horario, cancha y árbitro
- Log detallado de resultados con score y ganador
- Metadata con información del torneo y fase
- Detección automática de cambios importantes

---

## 🔌 Integración en Endpoints

### Patrón de Uso

Todos los endpoints CRUD están integrados con logging automático:

```typescript
// Ejemplo: POST /api/users
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.USER)
    const body = await request.json()

    // 1. Crear usuario
    const user = await prisma.user.create({ data: body })

    // 2. Log automático
    await UserLogService.logUserCreated(
      { userId: session.user.id, targetUserId: user.id },
      user
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Endpoints Integrados

#### Usuarios
- ✅ `POST /api/users` - logUserCreated
- ✅ `PUT /api/users/[id]` - logUserUpdated + logUserStatusChanged + logUserRoleChanged
- ✅ `DELETE /api/users/[id]` - logUserDeleted
- ✅ `PATCH /api/users/[id]` - logUserStatusChanged

#### Inscripciones
- ✅ `POST /api/registrations` - logRegistrationCreated
- ✅ `PUT /api/registrations/[id]` - logRegistrationUpdated + logRegistrationStatusChanged
- ✅ `DELETE /api/registrations/[id]` - logRegistrationDeleted
- ✅ `PATCH /api/registrations/[id]/status` - logRegistrationStatusChanged

#### Equipos
- ✅ `POST /api/teams` - logTeamCreated
- ✅ `PUT /api/teams/[id]` - logTeamUpdated + logTeamStatusChanged
- ✅ `DELETE /api/teams/[id]` - logTeamDeleted

#### Partidos
- ✅ `POST /api/matches/[id]/result` - logMatchResultAdded

#### Otros Módulos
- ✅ Torneos, Clubes, Canchas, Categorías, Rankings (servicios implementados)
- ⏳ Integración pendiente en algunos endpoints para Clubes, Canchas, Categorías y Rankings

---

## 🖥️ Panel de Administración

### Ubicación
- **Ruta**: `http://localhost:3000/dashboard/admin` → Pestaña "Logs del Sistema"
- **Componente**: `src/components/admin/system-logs.tsx`
- **Página**: `src/app/dashboard/admin/page.tsx`

### Características

#### Filtros Disponibles
1. **Tabs por Módulo**:
   - Todos
   - Usuarios
   - Inscripciones
   - Equipos
   - Torneos
   - Clubes
   - Canchas
   - Categorías
   - Rankings
   - Partidos

2. **Búsqueda por Texto**:
   - Descripción
   - Nombre de usuario
   - Nombre de entidad
   - Email

3. **Filtro por Acción**:
   - Dropdown con todas las acciones disponibles
   - Agrupadas por tipo (Creación, Actualización, Eliminación)

4. **Filtro por Fecha**:
   - Fecha desde
   - Fecha hasta

#### Tabla de Logs

Columnas mostradas:
1. **Fecha** - Formato: dd/MM/yyyy HH:mm
2. **Entidad** - Nombre del objeto afectado
3. **Acción** - Badge con color según tipo
4. **Usuario** - Nombre y email del actor
5. **Descripción** - Texto descriptivo de la acción
6. **Campos Modificados** - Badges con nombres de campos

#### Colores por Tipo de Acción

- 🟢 **Verde** - Creaciones (CREATED)
- 🔵 **Azul** - Actualizaciones (UPDATED)
- 🔴 **Rojo** - Eliminaciones (DELETED)
- 🟠 **Naranja** - Cambios de estado (STATUS_CHANGED)
- 🟣 **Morado** - Confirmaciones (CONFIRMED, ROLE_CHANGED)
- 🟡 **Amarillo** - Acciones especiales (USER_ACTION)

#### Estadísticas

Panel inferior con:
- Total de eventos
- Usuarios únicos
- Módulos activos
- Tipos de acción

---

## 🔍 Consultas Útiles

### API Endpoint

**Ubicación**: `src/app/api/admin/logs/route.ts`

```
GET /api/admin/logs?module={module}&limit={limit}
```

Parámetros:
- `module`: all, users, registrations, teams, tournaments, clubs, courts, categories, rankings, matches
- `limit`: número de registros (default: 100)

Respuesta:
```json
{
  "logs": [...],
  "module": "users",
  "total": 150
}
```

### Ejemplos de Uso Programático

```typescript
// Obtener logs de un usuario específico
const logs = await UserLogService.getUserLogs('user-id', 50)

// Obtener logs de una inscripción
const logs = await RegistrationLogService.getRegistrationLogs('reg-id', 50)

// Obtener estadísticas de los últimos 30 días
const stats = await UserLogService.getLogStats(30)
// Resultado:
// {
//   stats: [
//     { action: 'USER_CREATED', count: 15 },
//     { action: 'USER_UPDATED', count: 42 }
//   ],
//   total: 57,
//   period: '30 días'
// }
```

---

## 🛡️ Seguridad y Privacidad

### Sanitización de Datos

Todos los servicios de log implementan sanitización automática:

```typescript
private static sanitizeUserData(data: any) {
  if (!data) return null
  const { password, ...sanitized } = data
  return sanitized
}
```

**Datos sensibles excluidos**:
- Contraseñas
- Tokens de autenticación
- Información de tarjetas de crédito (si aplicara)

### Control de Acceso

- ✅ **Solo ADMIN** puede acceder al panel de logs
- ✅ Endpoint `/api/admin/logs` requiere rol ADMIN
- ✅ Verificación de sesión en todos los endpoints

### Retención de Datos

- Los logs se mantienen indefinidamente por defecto
- Incluyen índices en campos clave para consultas rápidas:
  - `userId`
  - `action`
  - `createdAt`
  - IDs de entidades específicas

---

## 📈 Métricas y Análisis

### Información Capturada

Cada log registra:
1. **Quién**: Usuario que realizó la acción
2. **Qué**: Acción específica y entidad afectada
3. **Cuándo**: Timestamp preciso
4. **Dónde**: IP y user agent
5. **Cómo**: Datos anteriores vs nuevos (diff)
6. **Por qué**: Metadata con contexto adicional

### Casos de Uso

1. **Auditoría de Seguridad**
   - Tracking de cambios de rol
   - Detección de accesos sospechosos
   - Historial de modificaciones críticas

2. **Debugging**
   - Reproducción de problemas
   - Análisis de secuencia de eventos
   - Identificación de patrones

3. **Cumplimiento**
   - Trail de auditoría completo
   - Evidencia de cambios
   - Reportes de actividad

4. **Análisis de Uso**
   - Módulos más utilizados
   - Usuarios más activos
   - Patrones de comportamiento

---

## 🚀 Uso en Desarrollo

### Ejemplo Completo: Agregar Logging a un Nuevo Módulo

#### 1. Actualizar Schema de Prisma

```prisma
model MyEntityLog {
  id            String    @id @default(cuid())
  action        LogAction
  description   String
  myEntityId    String?
  userId        String
  ipAddress     String?
  userAgent     String?
  oldData       Json?
  newData       Json?
  metadata      Json?
  createdAt     DateTime  @default(now())

  myEntity      MyEntity? @relation(fields: [myEntityId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id])

  @@index([myEntityId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("my_entity_logs")
}
```

#### 2. Crear Servicio de Log

```typescript
// src/lib/services/my-entity-log-service.ts
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export class MyEntityLogService {
  static async log(context, data) {
    // Obtener IP y user agent
    let ipAddress = context.ipAddress
    let userAgent = context.userAgent

    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers()
        ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        userAgent = headersList.get('user-agent') || 'unknown'
      } catch {
        ipAddress = 'server'
        userAgent = 'server'
      }
    }

    return await prisma.myEntityLog.create({
      data: {
        action: data.action,
        description: data.description,
        myEntityId: context.myEntityId,
        userId: context.userId,
        ipAddress,
        userAgent,
        oldData: data.oldData,
        newData: data.newData,
        metadata: data.metadata,
      }
    })
  }

  static async logMyEntityCreated(context, entityData) {
    return this.log(context, {
      action: "MY_ENTITY_CREATED",
      description: `Entidad creada: ${entityData.name}`,
      newData: entityData,
    })
  }

  // ... más métodos
}
```

#### 3. Integrar en Endpoints

```typescript
// src/app/api/my-entities/route.ts
import { MyEntityLogService } from "@/lib/services/my-entity-log-service"

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  const body = await request.json()

  const entity = await prisma.myEntity.create({ data: body })

  // Log automático
  await MyEntityLogService.logMyEntityCreated(
    { userId: session.user.id, myEntityId: entity.id },
    entity
  )

  return NextResponse.json(entity)
}
```

#### 4. Actualizar Panel Admin

Agregar el módulo a:
- `src/app/api/admin/logs/route.ts` - Switch case
- `src/components/admin/system-logs.tsx` - moduleIcons, moduleLabels, actionIcons, actionColors, actionLabels

---

## ✅ Checklist de Implementación

- [x] Modelos de log en Prisma (UserLog, RegistrationLog, TeamLog, MatchLog, etc.)
- [x] Servicios de logging (9 servicios implementados)
- [x] Integración en endpoints API (usuarios, inscripciones, equipos, partidos)
- [x] Panel de administración con filtros (9 módulos)
- [x] Sanitización de datos sensibles
- [x] Índices de base de datos para performance
- [x] Documentación completa
- [x] MatchLogService integrado en endpoint de resultados
- [x] Módulo "Partidos" agregado al panel de administración
- [ ] Integración pendiente en endpoints de Clubes, Canchas, Categorías y Rankings

---

## 📚 Referencias

- [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md) - Sistema de permisos
- [context.md](context.md) - Contexto general del proyecto
- Schema de Prisma: `prisma/schema.prisma`
- Servicios: `src/lib/services/*-log-service.ts`
