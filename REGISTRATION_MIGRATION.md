# 🔄 Migración del Sistema de Inscripciones

**Fecha**: Octubre 3, 2025
**Estado**: ✅ Completado (Backend + Frontend)

---

## 📋 Resumen Ejecutivo

Hemos migrado el sistema de inscripciones de un modelo **acoplado** (equipo + jugadores en una operación) a un modelo **desacoplado** (inscripciones individuales + formación de equipos por separado).

### Problema Anterior ❌

```typescript
// Flujo antiguo (DEPRECADO)
POST /api/registrations
{
  player1Id: "...",
  player2Id: "...",
  teamName: "..."
}
// ❌ Crea 2 Registrations + 1 Team en una sola operación
// ❌ Difícil cambiar de pareja
// ❌ Ownership poco claro
// ❌ Pagos complicados
```

### Solución Nueva ✅

```typescript
// Paso 1: Cada jugador se inscribe individualmente
POST /api/registrations
{
  tournamentId: "...",
  categoryId: "...",
  playerId: "player1",
  acceptTerms: true
}

POST /api/registrations
{
  tournamentId: "...",
  categoryId: "...",
  playerId: "player2",
  acceptTerms: true
}

// Paso 2: Formar equipo (solo torneos convencionales)
POST /api/teams
{
  tournamentId: "...",
  categoryId: "...",
  registration1Id: "reg1",
  registration2Id: "reg2",
  teamName: "Los Campeones"
}
```

---

## 🎯 Ventajas del Nuevo Sistema

### 1. **Control Individual**
- ✅ Cada jugador maneja su propia inscripción
- ✅ Cada jugador paga individualmente
- ✅ Estados independientes (PENDING, CONFIRMED, PAID)

### 2. **Flexibilidad**
- ✅ Cambiar de pareja sin eliminar inscripciones
- ✅ Buscar pareja después de inscribirse
- ✅ Disolver equipo pero mantener inscripción

### 3. **Consistencia**
- ✅ Mismo flujo para todos los tipos de torneo
- ✅ AMERICANO_SOCIAL: Solo paso 1
- ✅ CONVENCIONALES: Paso 1 + Paso 2

### 4. **RBAC Claro**
- ✅ Cada jugador es dueño de su Registration
- ✅ Logs de auditoría más claros
- ✅ Permisos granulares

---

## 🔧 Cambios Técnicos

### Nuevos Endpoints

#### 1. `POST /api/teams`
Crea un equipo vinculando 2 inscripciones existentes.

**Request:**
```json
{
  "tournamentId": "cmg123...",
  "categoryId": "cat456...",
  "registration1Id": "reg789...",
  "registration2Id": "reg012...",
  "teamName": "Los Campeones",
  "notes": "Notas opcionales"
}
```

**Validaciones:**
- ✅ Ambas registrations deben existir
- ✅ Mismo torneo y categoría
- ✅ Ambos jugadores CONFIRMED o PAID
- ✅ Ninguno en otro equipo de la misma categoría
- ✅ Torneo no debe ser AMERICANO_SOCIAL

**Response:**
```json
{
  "id": "team123...",
  "name": "Los Campeones",
  "status": "CONFIRMED",
  "registration1": {
    "id": "reg789...",
    "player": { "firstName": "Juan", "lastName": "Pérez" }
  },
  "registration2": {
    "id": "reg012...",
    "player": { "firstName": "Pedro", "lastName": "García" }
  }
}
```

#### 2. `GET /api/teams/[id]`
Obtiene detalles de un equipo.

#### 3. `PUT /api/teams/[id]`
Actualiza nombre, seed, notas del equipo.

**Request:**
```json
{
  "name": "Nuevo Nombre",
  "seed": 1,
  "notes": "Notas actualizadas"
}
```

#### 4. `DELETE /api/teams/[id]`
Disuelve un equipo SIN eliminar las inscripciones.

**Validaciones:**
- ✅ Torneo no debe estar IN_PROGRESS o COMPLETED
- ✅ Equipo no debe tener partidos jugados

**Resultado:**
- ❌ Equipo eliminado
- ✅ Registrations se mantienen
- ✅ Jugadores pueden formar nuevo equipo

### Endpoint Unificado

#### 1. `POST /api/registrations`
**Endpoint principal para TODAS las inscripciones.**

**Comportamiento:**
- Acepta inscripciones individuales para CUALQUIER tipo de torneo
- **AMERICANO_SOCIAL**: El jugador juega individualmente (sin equipo)
- **CONVENCIONALES**: El jugador debe formar equipo después con `POST /api/teams`

**Request:**
```json
{
  "tournamentId": "cmg123...",
  "categoryId": "cat456...",
  "playerId": "player789...",
  "notes": "Notas opcionales",
  "acceptTerms": true
}
```

---

## 📊 Modelo de Datos

### Prisma Schema (sin cambios)

```prisma
// ✅ El schema YA está bien diseñado para el nuevo flujo

model Registration {
  id                  String   @id @default(cuid())
  tournamentId        String
  categoryId          String
  playerId            String
  registrationStatus  RegistrationStatus  // PENDING, CONFIRMED, PAID
  payment             Payment?            // 1 pago por jugador

  // Relaciones con Teams
  teamAsPlayer1       Team[]  @relation("TeamRegistration1")
  teamAsPlayer2       Team[]  @relation("TeamRegistration2")

  @@unique([tournamentId, categoryId, playerId])
}

model Team {
  id               String     @id @default(cuid())
  tournamentId     String
  categoryId       String
  registration1Id  String     // FK a Registration
  registration2Id  String     // FK a Registration
  name             String?
  status           TeamStatus // DRAFT, CONFIRMED, ELIMINATED
  seed             Int?
  notes            String?

  registration1    Registration @relation("TeamRegistration1", ...)
  registration2    Registration @relation("TeamRegistration2", ...)
}
```

**Importante:** No se requieren migraciones de base de datos, solo cambios en la lógica de negocio.

---

## 🔄 Casos de Uso

### Caso 1: Inscripción Individual (AMERICANO_SOCIAL)

```typescript
// Paso 1: Jugador se inscribe
POST /api/registrations
{
  tournamentId: "torneo123",
  categoryId: "categoria456",
  playerId: "jugador789",
  acceptTerms: true
}

// ✅ Registration creada con estado PENDING
// ✅ Jugador puede pagar
// ✅ No se requiere equipo (juega individualmente)
```

### Caso 2: Inscripción por Equipos (CONVENCIONAL)

```typescript
// Paso 1a: Jugador 1 se inscribe
POST /api/registrations
{
  tournamentId: "torneo123",
  categoryId: "categoria456",
  playerId: "juan",
  acceptTerms: true
}
// → Registration: PENDING

// Paso 1b: Jugador 1 paga
POST /api/registrations/{regId}/payment
{
  amount: 500,
  paymentMethod: "CREDIT_CARD"
}
// → Registration: PAID

// Paso 2a: Jugador 2 se inscribe
POST /api/registrations
{
  tournamentId: "torneo123",
  categoryId: "categoria456",
  playerId: "pedro",
  acceptTerms: true
}
// → Registration: PENDING

// Paso 2b: Jugador 2 paga
POST /api/registrations/{regId}/payment
{
  amount: 500,
  paymentMethod: "CREDIT_CARD"
}
// → Registration: PAID

// Paso 3: Formar equipo
POST /api/teams
{
  tournamentId: "torneo123",
  categoryId: "categoria456",
  registration1Id: "reg_juan",
  registration2Id: "reg_pedro",
  teamName: "Los Campeones"
}
// ✅ Team creado con estado CONFIRMED
```

### Caso 3: Cambio de Pareja

```typescript
// Situación: Juan pagó, Pedro no pagó, Juan quiere cambiar a María

// Estado actual:
// - Registration Juan: PAID
// - Registration Pedro: PENDING
// - Team: No existe (no se puede crear hasta que Pedro pague)

// Acción: Juan forma equipo con María (que ya pagó)
POST /api/teams
{
  registration1Id: "reg_juan",
  registration2Id: "reg_maria",
  teamName: "Juan & María"
}

// ✅ Team creado con Juan + María
// ✅ Registration de Pedro se mantiene (puede buscar otra pareja)
```

### Caso 4: Disolver Equipo

```typescript
// Situación: Equipo "Los Campeones" se disuelve antes del torneo

DELETE /api/teams/team123

// ✅ Team eliminado
// ✅ Registration Juan: PAID (se mantiene)
// ✅ Registration Pedro: PAID (se mantiene)
// ✅ Ambos pueden formar nuevos equipos
```

---

## 🚀 Implementación Frontend ✅

### Formulario de Inscripción

**Archivo**: `components/registrations/registration-form.tsx`

**Características**:
- ✅ Selección de torneo (solo torneos con inscripciones abiertas)
- ✅ Selección de categoría con información de costo y cupo
- ✅ Selección de jugador con filtros de género y nivel
- ✅ Validación de jugadores ya inscritos
- ✅ Checkbox: Aceptar términos
- ✅ Banner de éxito con acciones rápidas:
  - Botón "Ir a pagar" → Redirige a `/dashboard/registrations/{id}`
  - Botón "Formar equipo" → Redirige a `/dashboard/teams/new` (solo torneos convencionales)
- ✅ Permite inscribir múltiples jugadores sin salir del formulario

**Flujo UX**:
1. Usuario selecciona torneo y categoría
2. Sistema filtra jugadores disponibles según género y nivel
3. Usuario selecciona jugador y acepta términos
4. Sistema crea inscripción con estado PENDING
5. Banner muestra opciones: pagar o formar equipo

### Formulario Nuevo - Formar Equipo

**Archivo**: `components/teams/team-formation-form.tsx`

**Características**:
- ✅ Muestra solo inscripciones del usuario actual
- ✅ Filtra inscripciones CONFIRMED o PAID
- ✅ Excluye torneos AMERICANO_SOCIAL
- ✅ Selección de torneo y categoría
- ✅ Selección de tu inscripción
- ✅ Carga dinámica de parejas disponibles:
  - Solo jugadores CONFIRMED o PAID
  - Excluye jugadores ya en equipos
  - Muestra estado de pago y puntos de ranking
- ✅ Auto-generación de nombre de equipo
- ✅ Campo de notas opcional
- ✅ Redirige a `/dashboard/teams/{id}` al crear el equipo exitosamente

**Flujo UX**:
1. Sistema carga inscripciones del usuario
2. Usuario selecciona torneo y categoría
3. Usuario selecciona su inscripción
4. Sistema carga jugadores disponibles en esa categoría
5. Usuario selecciona pareja
6. Sistema auto-genera nombre del equipo (editable)
7. Al crear, redirige al detalle del equipo

### Página de Detalle de Equipo

**Archivo**: `app/dashboard/teams/[id]/page.tsx`

**Características**:
- ✅ Información completa del equipo
- ✅ Estado del equipo con badges
- ✅ Detalles del torneo y categoría
- ✅ Cards de ambos jugadores con:
  - Nombre y email
  - Estado de inscripción
  - Género, puntos, nivel
  - Estado de pago con fecha
- ✅ Metadata del sistema (ID, fechas de creación/actualización)
- ✅ Links a inscripciones individuales
- ✅ Botón volver

### Páginas Actualizadas

**Archivo**: `app/dashboard/registrations/new/page.tsx`

**Cambios**:
- ✅ Usa el componente `RegistrationForm` unificado
- ✅ Título actualizado: "Nueva Inscripción"
- ✅ Descripción clara del flujo de inscripción

---

## 📝 Checklist de Migración

### Backend ✅
- [x] Crear `GET /api/teams` (listado con paginación y filtros)
- [x] Crear `POST /api/teams`
- [x] Crear `GET /api/teams/[id]`
- [x] Crear `PUT /api/teams/[id]`
- [x] Crear `DELETE /api/teams/[id]`
- [x] Unificar `POST /api/registrations` (endpoint único para todas las inscripciones)
- [x] Eliminar endpoint redundante `/api/registrations/individual`
- [x] Documentación completa

### Frontend ✅
- [x] Crear `components/registrations/registration-form.tsx` (formulario unificado)
- [x] Crear `components/teams/team-formation-form.tsx`
- [x] Crear `components/teams/teams-header.tsx`
- [x] Crear `components/teams/teams-table.tsx`
- [x] Actualizar `/dashboard/registrations/new` (usar formulario unificado)
- [x] Crear `/dashboard/teams` (listado de equipos)
- [x] Crear `/dashboard/teams/new` (formar equipos)
- [x] Crear `/dashboard/teams/[id]` (detalle de equipo)
- [x] Agregar "Equipos" al menú de navegación
- [x] Simplificar lógica en componentes de detalle/edición
- [x] Eliminar formularios deprecados
- [ ] Actualizar tests

### Testing ⏳
- [ ] Tests unitarios de endpoints `/api/teams`
- [ ] Tests de integración del flujo completo
- [ ] Tests de casos edge (cambio de pareja, disolución, etc.)

### Documentación ⏳
- [ ] Actualizar README.md
- [ ] Actualizar context.md
- [ ] Crear guía para usuarios finales

---

## 🎓 Ejemplos de Uso

### cURL Examples

```bash
# 1. Inscripción individual
curl -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "cmg123",
    "categoryId": "cat456",
    "playerId": "player789",
    "acceptTerms": true
  }'

# 2. Formar equipo
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "cmg123",
    "categoryId": "cat456",
    "registration1Id": "reg_juan",
    "registration2Id": "reg_pedro",
    "teamName": "Los Campeones"
  }'

# 3. Actualizar equipo
curl -X PUT http://localhost:3000/api/teams/team123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Nombre",
    "seed": 1
  }'

# 4. Disolver equipo
curl -X DELETE http://localhost:3000/api/teams/team123
```

---

## 🔍 Preguntas Frecuentes

### ¿Qué pasa con los equipos existentes?
Los equipos creados con el endpoint antiguo siguen funcionando normalmente. No se requiere migración de datos.

### ¿Puedo seguir usando el endpoint antiguo?
Sí, por retrocompatibilidad. Pero se recomienda usar el nuevo flujo para todas las nuevas funcionalidades.

### ¿Qué pasa si un jugador no paga?
El jugador queda con estado PENDING. Su pareja puede buscar otro jugador para formar equipo.

### ¿Puedo cambiar de pareja después de formar equipo?
Sí, disuelve el equipo con `DELETE /api/teams/[id]` y forma uno nuevo con `POST /api/teams`.

### ¿Se eliminan las inscripciones al disolver un equipo?
No, las inscripciones se mantienen. Solo se elimina el vínculo (Team).

---

**Estado**: ✅ Backend y Frontend completados
**Disponible**: El nuevo sistema ya está listo para usar
**Próximo paso**: Testing y actualización de documentación
