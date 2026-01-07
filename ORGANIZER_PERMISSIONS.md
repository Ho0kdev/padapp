# 🔐 Permisos del Rol ORGANIZER

## Resumen
El rol **ORGANIZER** está diseñado para **organizar torneos**, NO para administrar la infraestructura del sistema.

---

## ✅ Permisos Actuales (Después del Fix de Seguridad)

### 🏆 **Dominio Principal: Torneos**
| Recurso | Permisos | Alcance |
|---------|----------|---------|
| **Tournament** | CREATE, READ, LIST, UPDATE, DELETE | Solo torneos propios (organizerId) |
| **Registration** | READ, LIST, APPROVE, REJECT | Solo inscripciones de sus torneos |
| **Team** | READ, LIST, UPDATE | Solo equipos de sus torneos |
| **Match** | READ, LIST, UPDATE | Solo partidos de sus torneos |
| **Payment** | READ, LIST, UPDATE | Solo pagos de sus torneos |

### 📖 **Solo Lectura: Infraestructura**
| Recurso | Permisos | Alcance |
|---------|----------|---------|
| **Club** | ✅ READ, LIST | Todos (para seleccionar al crear torneo) |
| **Court** | ✅ READ, LIST | Todas (para asignar canchas) |
| **Category** | ✅ READ, LIST | Todas (para seleccionar categorías) |
| **User** | ✅ READ, LIST | Todos (para ver jugadores) |
| **Ranking** | ✅ READ, LIST | Todos (consulta) |
| **Report** | ✅ READ, LIST | Todos (consulta) |

### ❌ **Prohibido: Gestión de Infraestructura**
| Recurso | Operaciones Prohibidas |
|---------|----------------------|
| **Club** | ❌ CREATE, UPDATE, DELETE |
| **Court** | ❌ CREATE, UPDATE, DELETE |
| **Category** | ❌ CREATE, UPDATE, DELETE |
| **User** | ❌ CREATE, DELETE, ROLE_CHANGE |

---

## 🔒 Matriz de Permisos Completa

### Comparativa ADMIN vs ORGANIZER

| Operación | ADMIN | ORGANIZER | Justificación |
|-----------|-------|-----------|---------------|
| **Crear clubes** | ✅ | ❌ | Infraestructura del sistema |
| **Modificar clubes** | ✅ | ❌ | Infraestructura del sistema |
| **Eliminar clubes** | ✅ | ❌ | Infraestructura del sistema |
| **Ver clubes** | ✅ | ✅ | Necesita seleccionar club para torneo |
| **Crear canchas** | ✅ | ❌ | Infraestructura del sistema |
| **Modificar canchas** | ✅ | ❌ | Infraestructura del sistema |
| **Eliminar canchas** | ✅ | ❌ | Infraestructura del sistema |
| **Ver canchas** | ✅ | ✅ | Necesita asignar canchas a partidos |
| **Crear categorías** | ✅ | ❌ | Estructura de competición |
| **Modificar categorías** | ✅ | ❌ | Estructura de competición |
| **Eliminar categorías** | ✅ | ❌ | Estructura de competición |
| **Ver categorías** | ✅ | ✅ | Necesita seleccionar categorías para torneo |
| **Crear torneos** | ✅ | ✅ | Dominio principal del ORGANIZER |
| **Modificar torneos** | ✅ | ✅ (propios) | Solo torneos donde es organizador |
| **Eliminar torneos** | ✅ | ✅ (propios) | Solo torneos donde es organizador |
| **Gestionar inscripciones** | ✅ | ✅ (de sus torneos) | Solo inscripciones de sus torneos |
| **Gestionar equipos** | ✅ | ✅ (de sus torneos) | Solo equipos de sus torneos |
| **Gestionar partidos** | ✅ | ✅ (de sus torneos) | Solo partidos de sus torneos |
| **Confirmar pagos** | ✅ | ✅ (de sus torneos) | Solo pagos de sus torneos |
| **Crear usuarios** | ✅ | ❌ | Gestión de usuarios es crítica |
| **Cambiar roles** | ✅ | ❌ | Gestión de seguridad |

---

## 🎯 Flujo de Trabajo Típico de un ORGANIZER

### 1. Crear un Torneo
```typescript
// ✅ PUEDE seleccionar de infraestructura existente
const clubs = await fetch('/api/clubs') // READ permitido
const courts = await fetch('/api/courts') // READ permitido
const categories = await fetch('/api/categories') // READ permitido

// ✅ PUEDE crear su torneo
const tournament = await fetch('/api/tournaments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Torneo Verano 2026',
    mainClubId: selectedClub.id, // Usa club existente
    // ...
  })
})
```

### 2. NO Puede Crear Infraestructura
```typescript
// ❌ NO PUEDE crear un club
const club = await fetch('/api/clubs', {
  method: 'POST', // 403 Forbidden
  body: JSON.stringify({ name: 'Nuevo Club' })
})

// ❌ NO PUEDE crear una cancha
const court = await fetch('/api/courts', {
  method: 'POST', // 403 Forbidden
  body: JSON.stringify({ name: 'Cancha 5' })
})

// ❌ NO PUEDE crear una categoría
const category = await fetch('/api/categories', {
  method: 'POST', // 403 Forbidden
  body: JSON.stringify({ name: 'Primera' })
})
```

### 3. Gestionar Su Torneo
```typescript
// ✅ PUEDE gestionar inscripciones
await fetch(`/api/registrations/${id}/approve`, { method: 'POST' })

// ✅ PUEDE modificar partidos
await fetch(`/api/matches/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ scheduledAt: newDate })
})

// ✅ PUEDE confirmar pagos
await fetch(`/api/registrations/${id}/payment/manual`, {
  method: 'POST'
})
```

---

## 🛡️ Seguridad: Ownership Check

### Validación Automática en API Routes

```typescript
// src/app/api/tournaments/[id]/route.ts
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireAuth()
  const { id } = await params

  const existingTournament = await prisma.tournament.findUnique({
    where: { id }
  })

  // ✅ Valida automáticamente:
  // - ADMIN: siempre permitido
  // - ORGANIZER: solo si tournament.organizerId === session.user.id
  await authorize(Action.UPDATE, Resource.TOURNAMENT, existingTournament)

  // Si llega aquí, tiene permisos
  const updated = await prisma.tournament.update({ ... })
  return NextResponse.json(updated)
}
```

### Recursos con Ownership Check

| Recurso | Campo de Ownership | Validación |
|---------|-------------------|------------|
| Tournament | `organizerId` | `tournament.organizerId === user.id` |
| Registration | Via `tournament` | Tournament debe pertenecer al ORGANIZER |
| Team | Via `tournament` | Tournament debe pertenecer al ORGANIZER |
| Match | Via `tournament` | Tournament debe pertenecer al ORGANIZER |
| Payment | Via `registration.tournament` | Tournament debe pertenecer al ORGANIZER |

### Recursos SIN Ownership (Solo ADMIN)

| Recurso | Razón |
|---------|-------|
| Club | Infraestructura global del sistema |
| Court | Infraestructura de clubes |
| Category | Estructura de competición estándar |
| User | Gestión de seguridad crítica |

---

## 📊 Testing de Permisos

### Test Manual con Usuario ORGANIZER

```bash
# Login como ORGANIZER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@padelshot.app","password":"123456"}'

# ✅ Debería funcionar: Listar clubes
curl http://localhost:3000/api/clubs

# ❌ Debería fallar: Crear club
curl -X POST http://localhost:3000/api/clubs \
  -H "Content-Type: application/json" \
  -d '{"name":"Nuevo Club"}'
# Expected: 403 Forbidden

# ✅ Debería funcionar: Crear torneo
curl -X POST http://localhost:3000/api/tournaments \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi Torneo","mainClubId":"..."}'

# ✅ Debería funcionar: Modificar su torneo
curl -X PUT http://localhost:3000/api/tournaments/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Torneo Actualizado"}'

# ❌ Debería fallar: Modificar torneo de otro
curl -X PUT http://localhost:3000/api/tournaments/{other-id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Intento Hackear"}'
# Expected: 403 Forbidden
```

---

## 🔄 Migración de Comportamiento

### Antes del Fix (INCORRECTO)
```typescript
// ❌ ORGANIZER podía hacer esto (INSEGURO)
await prisma.club.create({ ... })      // Crear clubes
await prisma.court.create({ ... })     // Crear canchas
await prisma.category.create({ ... })  // Crear categorías
```

### Después del Fix (CORRECTO)
```typescript
// ✅ ORGANIZER solo puede leer (SEGURO)
await prisma.club.findMany()      // ✅ Listar clubes
await prisma.court.findMany()     // ✅ Listar canchas
await prisma.category.findMany()  // ✅ Listar categorías

// ❌ No puede crear/modificar/eliminar
await prisma.club.create({ ... })     // 403 Forbidden
await prisma.court.update({ ... })    // 403 Forbidden
await prisma.category.delete({ ... }) // 403 Forbidden
```

---

## 📝 Código RBAC Actualizado

```typescript
// src/lib/rbac/ability.ts - Permisos de ORGANIZER

case UserRole.ORGANIZER:
  // Solo LECTURA de infraestructura
  ability.can([Action.READ, Action.LIST], [
    Resource.CLUB,
    Resource.COURT,
    Resource.CATEGORY,
  ])

  // GESTIÓN COMPLETA de torneos
  ability.can([Action.CREATE, Action.READ, Action.LIST, Action.UPDATE],
    Resource.TOURNAMENT)

  // DELETE solo torneos propios
  ability.can(Action.DELETE, Resource.TOURNAMENT, (tournament: any) => {
    return tournament.organizerId === userId
  })

  // Gestión de inscripciones, equipos, partidos (de sus torneos)
  ability.can([Action.READ, Action.LIST, Action.APPROVE, Action.REJECT],
    Resource.REGISTRATION)
  ability.can([Action.READ, Action.LIST, Action.UPDATE],
    Resource.TEAM)
  ability.can([Action.READ, Action.LIST, Action.UPDATE],
    Resource.MATCH)
  ability.can([Action.READ, Action.LIST, Action.UPDATE],
    Resource.PAYMENT)

  break
```

---

## ✅ Resumen de Seguridad

### Principio de Mínimo Privilegio Aplicado

| Aspecto | Estado |
|---------|--------|
| **Separación de Responsabilidades** | ✅ ORGANIZER gestiona torneos, ADMIN gestiona infraestructura |
| **Ownership Validation** | ✅ Solo puede modificar torneos propios |
| **Principle of Least Privilege** | ✅ Solo permisos necesarios para su función |
| **Defense in Depth** | ✅ Validación en RBAC + API routes + Base de datos |
| **Audit Trail** | ✅ Todos los cambios se registran en logs |

---

**Última actualización**: Enero 2026
**Versión**: 2.0 (Post Security Fix)
**Commit**: `8a5cfcd`
