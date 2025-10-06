# 📋 PadApp - Context para Desarrollo Rápido

*Última actualización: Octubre 5, 2025*

## 🎯 Resumen Ejecutivo del Proyecto

**PadApp** es un sistema completo de gestión de torneos de pádel construido con tecnologías modernas, actualmente al **90% de funcionalidad core completa**.

### Stack Tecnológico
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM + PostgreSQL
- **Auth**: NextAuth.js con JWT + RBAC completo
- **UI**: shadcn/ui + Radix UI + Lucide icons
- **Validación**: Zod + React Hook Form
- **Estado**: Zustand para estado global

---

## 🚀 Estado Actual del Desarrollo

### ✅ COMPLETADO Y FUNCIONAL (90%)

#### 1. **Sistema de Autenticación y RBAC** [100%]
- **4 Roles**: ADMIN, CLUB_ADMIN, PLAYER, REFEREE
- **Permisos granulares**: Sistema de Actions + Resources
- **Auditoría completa**: AuditLogger con tracking de cambios
- **Middleware**: Rutas protegidas con validación de permisos
- **Helpers**: `requireAuth()`, `authorize()`, `can()`, `isAdminOrClubAdmin()`
- 📄 [Documentación completa: RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)

#### 2. **Gestión de Torneos** [100%]
- **CRUD completo**: Crear, editar, eliminar, listar
- **6 formatos**: Single/Double Elimination, Round Robin, Swiss, Group Stage, Americano
- **Estados**: DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → COMPLETED → CANCELLED
- **Configuración avanzada**: Fechas, participantes, tarifas, premios, reglas de sets/games, golden point
- **Validaciones Zod**: Completas en frontend y backend
- **Filtros**: Por estado, búsqueda, tipo de torneo, club

#### 3. **Sistema de Inscripciones** [90% - 🆕 COMPLETADO Sept 30]
- ✅ **CRUD completo** de inscripciones (equipos)
- ✅ **Validación anti-duplicados**: Un jugador solo puede estar en un equipo por categoría
- ✅ **Endpoint check-players**: `/api/registrations/check-players` para optimización UX
- ✅ **Filtrado inteligente**: Jugadores ya inscritos no aparecen en selectores
- ✅ **Validación de fechas**: Último día de inscripción incluido completo
- ✅ **Filtros avanzados**: Por torneo, categoría, estado (PENDING, CONFIRMED, PAID, WAITLIST, CANCELLED), jugador
- ✅ **Lista de espera**: Automática cuando se alcanza límite de equipos
- ✅ **Reglas de negocio**: Un jugador puede inscribirse en múltiples categorías, pero solo un equipo por categoría
- ✅ **RBAC**: ADMIN/CLUB_ADMIN ven todas, PLAYER solo las suyas
- ⚠️ **Pendiente**: Integración de pagos con Stripe, notificaciones por email

#### 4. **Sistema de Puntos Automático** [100%] ⭐ MEJORADO
- **🆕 Puntos Base Configurables**: Cada torneo define su nivel (100-5,000 pts)
- **Cálculo inteligente proporcional** con 4 factores:
  - Puntos base por participación (50 pts fijo)
  - Puntos por posición (porcentaje del rankingPoints del torneo)
    - 1° lugar: 100% del rankingPoints (ej: 1000 pts Premium, 500 pts Regional)
    - 2° lugar: 70% del rankingPoints
    - 3° lugar: 50% del rankingPoints, etc.
  - Bonus por rendimiento proporcional al rankingPoints
    - Victoria: (rankingPoints/1000) × 25 pts
    - Set: (rankingPoints/1000) × 5 pts
  - Multiplicadores dinámicos (tipo torneo + participantes)
- **Niveles sugeridos**: Premium (1000), Regional (500), Local (250)
- **Endpoint**: `POST /api/tournaments/{id}/calculate-points`
- **Actualización automática**: Rankings actualizados al completar torneos
- **Logs detallados**: Auditoría de cada cálculo
- 📄 [POINTS_CALCULATION.md](POINTS_CALCULATION.md)

#### 5. **Sistema de Rankings** [100%]
- Rankings anuales por categoría con histórico completo
- API de temporadas: `/api/rankings/seasons`
- Actualización automática post-torneo
- Visualización por categoría y año

#### 6. **Gestión de Clubes y Canchas** [100%]
- **CRUD completo** de clubes (info, ubicación, contacto)
- **CRUD completo** de canchas con características técnicas
- **Estados de canchas**: AVAILABLE, MAINTENANCE, RESERVED, OUT_OF_SERVICE
- Superficies, iluminación, techo, características especiales
- Tarifas por hora y notas

#### 7. **Sistema de Categorías** [100%]
- **5 tipos**: AGE, SKILL, RANKING, GENDER, MIXED
- Restricciones configurables (edad, género, puntos ranking)
- Estados activo/inactivo

#### 8. **Gestión de Usuarios** [100%]
- Perfiles completos con información personal y emergencia
- Sistema granular de roles
- Estados: ACTIVE, INACTIVE, SUSPENDED
- Asociación con jugadores

#### 9. **Panel Administrativo** [100%]
- Dashboard con estadísticas en tiempo real
- Actividad reciente de torneos
- Métricas de usuarios y clubes activos
- **Sistema de Logs completo** (solo ADMIN) 🆕
  - Logs de usuarios (creación, actualización, cambios de rol/estado)
  - Logs de inscripciones (creación, cambios de estado, pagos)
  - Logs de equipos (creación, actualización, confirmación)
  - Logs de torneos, clubes, canchas, categorías y rankings
  - Tabla con filtros por módulo, acción, fecha y búsqueda
  - Visualización de campos modificados (antes/después)
  - Tracking completo de IP, user agent y metadata

#### 10. **Base de Datos** [100%]
- 18+ tablas relacionadas optimizadas 🆕
- **Sistema completo de logs y auditoría expandido** 🆕
  - UserLog (tracking completo de acciones sobre usuarios)
  - RegistrationLog (tracking de inscripciones y pagos)
  - TeamLog (tracking de equipos/parejas)
  - TournamentLog, ClubLog, CourtLog, CategoryLog, RankingLog
- Seeds realistas para desarrollo
- Migraciones versionadas

---

## 📂 Estructura del Proyecto (Simplificada)

```
padapp/
├── prisma/
│   ├── schema.prisma          # Esquema completo de BD
│   ├── migrations/            # Migraciones versionadas
│   └── seeds/                 # Datos de prueba
├── src/
│   ├── app/
│   │   ├── api/              # 30+ endpoints
│   │   │   ├── auth/         # Login, registro, session
│   │   │   ├── tournaments/  # CRUD + calculate-points
│   │   │   ├── registrations/ # CRUD + check-players
│   │   │   ├── clubs/        # CRUD clubes y canchas
│   │   │   ├── categories/   # CRUD categorías
│   │   │   ├── rankings/     # Rankings + seasons
│   │   │   ├── users/        # CRUD usuarios
│   │   │   └── admin/        # Logs y panel admin
│   │   ├── auth/             # Páginas login/registro
│   │   └── dashboard/        # Panel principal + módulos
│   │       ├── admin/        # Panel administrativo
│   │       ├── tournaments/  # Gestión torneos
│   │       ├── registrations/ # Gestión inscripciones
│   │       ├── clubs/        # Gestión clubes
│   │       ├── categories/   # Gestión categorías
│   │       ├── rankings/     # Rankings
│   │       └── users/        # Gestión usuarios
│   ├── components/           # 50+ componentes
│   │   ├── registrations/    # 🆕 registration-form, header, table
│   │   ├── tournaments/      # tournament-form, table, detail
│   │   ├── clubs/            # club-form, court-form
│   │   ├── categories/       # category-form, table
│   │   ├── rankings/         # ranking-table, season-selector
│   │   ├── users/            # user-form, detail, table
│   │   ├── layout/           # sidebar, header, layout
│   │   └── ui/               # shadcn components
│   ├── hooks/
│   │   ├── use-auth.ts       # Hook de autenticación + isAdminOrClubAdmin
│   │   └── use-toast.ts      # Notificaciones
│   ├── lib/
│   │   ├── rbac/             # Sistema RBAC completo
│   │   │   ├── index.ts      # requireAuth, authorize, can
│   │   │   ├── permissions.ts # Matriz de permisos
│   │   │   └── audit.ts      # AuditLogger
│   │   ├── services/         # Servicios de logs 🆕
│   │   │   ├── user-log-service.ts         # Logs de usuarios
│   │   │   ├── registration-log-service.ts # Logs de inscripciones
│   │   │   ├── team-log-service.ts         # Logs de equipos
│   │   │   ├── tournament-log-service.ts   # Logs de torneos
│   │   │   ├── club-log-service.ts         # Logs de clubes
│   │   │   ├── court-log-service.ts        # Logs de canchas
│   │   │   ├── category-log-service.ts     # Logs de categorías
│   │   │   └── rankings-log-service.ts     # Logs de rankings
│   │   ├── validations/      # Esquemas Zod
│   │   ├── auth.ts           # NextAuth config
│   │   ├── prisma.ts         # Cliente Prisma
│   │   └── utils.ts          # Utilidades
│   └── types/                # Tipos TypeScript
├── RBAC_GUIA_DEFINITIVA.md   # 📄 Documentación RBAC completa
├── README.md                 # 📄 Documentación principal
├── roadmap.md                # 📄 Roadmap actualizado
└── context.md                # 📄 Este archivo
```

---

## 🔐 Sistema RBAC - Quick Reference

### Roles y Permisos

| Recurso | ADMIN | CLUB_ADMIN | PLAYER | REFEREE |
|---------|-------|------------|--------|---------|
| Torneos | ✅ MANAGE | ✅ MANAGE (solo su club) | 🟡 READ | 🟡 READ |
| Inscripciones | ✅ MANAGE | ✅ READ (su club) | 🟡 CREATE, READ (solo suyas) | 🔴 - |
| Clubes | ✅ MANAGE | ✅ UPDATE (solo su club) | 🟡 READ | 🟡 READ |
| Usuarios | ✅ MANAGE | 🟡 READ | 🔴 UPDATE (solo perfil) | 🔴 - |
| Rankings | ✅ MANAGE | 🟡 READ | 🟡 READ | 🟡 READ |

### Uso en API Routes

```typescript
// Solo autenticación
export async function GET(request: NextRequest) {
  const session = await requireAuth()
  // ...
}

// Requiere permiso específico
export async function POST(request: NextRequest) {
  const session = await authorize(Action.CREATE, Resource.TOURNAMENT)
  // ...
}

// Verificar permiso sin error
const canEdit = await can(session, Action.UPDATE, Resource.TOURNAMENT, tournamentId)
```

### Auditoría

```typescript
await AuditLogger.log(session, {
  action: Action.CREATE,
  resource: Resource.REGISTRATION,
  resourceId: registration.id,
  description: `Inscripción creada: ${registration.name}`,
  newData: registration,
}, request)
```

---

## 🆕 Mejoras Recientes - Sept 30, 2024

### 🎯 Sistema de Puntos Configurables por Torneo [NUEVO]

1. **Campo rankingPoints en Tournament**: Cada torneo define su nivel (100-5,000 pts)
2. **Cálculo Proporcional**: Puntos por posición y rendimiento proporcionales al rankingPoints
3. **Formulario Actualizado**: Campo "Puntos de Ranking" en creación/edición de torneos
4. **Validaciones**: Min 100, max 5,000 con valor default 1000
5. **Seeds Actualizados**: Torneos de diferentes niveles (Premium 1000, Regional 500, Local 250)
6. **Documentación**: POINTS_CALCULATION.md completamente actualizado con ejemplos

### Sistema de Inscripciones Completado

7. **Validación Anti-Duplicados (Backend)**: Un jugador solo puede estar en un equipo por categoría
8. **Endpoint Check-Players**: `/api/registrations/check-players` para optimización UX
9. **Filtrado Inteligente (Frontend)**: Jugadores ya inscritos no aparecen en selectores
10. **Validación de Fechas**: Último día de inscripción incluido completo
11. **Filtros Avanzados**: Soporte para "all", múltiples estados, torneo
12. **Helper isAdminOrClubAdmin**: Agregado a `use-auth.ts` para lógica común

### Bugs Corregidos

13. **Select Components**: Cambiado de `defaultValue` a `value` para sincronización con React Hook Form
14. **Filtro de Torneos**: Usar `getAll()` para múltiples estados
15. **Valor "all" en Filtros**: Agregado a enums Zod con lógica condicional
16. **Conteo de Torneos en Categorías**: Solo cuenta torneos activos
17. **Botón Volver en Usuarios**: Navegación directa en lugar de `router.back()`

---

## ⏳ PENDIENTE (15%)

### Prioridad Alta - Inmediata

#### 1. **Completar Sistema de Inscripciones (10% restante)**
- ⏳ Integración con Stripe para pagos (3-4 días)
- ⏳ Sistema de notificaciones por email (2-3 días)
- ⏳ Panel público de inscripción sin login (2 días)

#### 2. **Gestión de Brackets/Llaves**
- ⏳ Generación automática para todos los formatos (2 semanas)
- ⏳ Visualización gráfica responsive
- ⏳ Editor manual de brackets
- ⏳ Progresión automática de ganadores

#### 3. **Sistema de Partidos**
- ⏳ Carga de resultados set por set (2 semanas)
- ⏳ Validación de puntuaciones
- ⏳ Estados: SCHEDULED → IN_PROGRESS → COMPLETED
- ⏳ Actualización automática de brackets y rankings

#### 4. **Calendario y Programación**
- ⏳ Calendario visual de partidos (3 semanas)
- ⏳ Asignación automática de canchas
- ⏳ Gestión de conflictos y horarios

### Prioridad Media

5. **Sistema de Notificaciones Push**: PWA notifications
6. **Reportes Avanzados**: PDF/Excel exports, analytics
7. **Mejoras en Rankings**: Gráficos de evolución, comparativas
8. **Sistema de Reservas**: Booking de canchas públicas

---

## 🎯 Quick Start para Desarrollo

### Variables de Entorno Requeridas

```bash
# Database
DATABASE_URL="postgresql://postgres:padapp123@localhost:5432/padapp"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### Comandos Esenciales

```bash
# Desarrollo
npm run dev                 # Servidor con Turbopack
npm run db:studio           # Prisma Studio (explorar BD)
npm run db:select           # Selector de BD (local/remoto)

# Base de datos
npm run db:push             # Aplicar cambios al esquema
npm run db:seed             # Cargar datos de prueba
npm run db:reset            # Reset completo + seeds

# Calidad
npm run lint                # Verificar código
npm run type-check          # Verificar TypeScript
```

### Credenciales de Prueba

```
Admin: admin@padapp.com / 123456
Club Admin: clubadmin@padapp.com / 123456
Player: player@padapp.com / 123456
```

---

## 🔍 Archivos Clave para Desarrollo

### Sistema RBAC
- `src/lib/rbac/index.ts` - Funciones de autorización
- `src/lib/rbac/permissions.ts` - Matriz de permisos
- `src/lib/rbac/audit.ts` - Sistema de auditoría
- `src/hooks/use-auth.ts` - Hook de autenticación

### Inscripciones (🆕 Módulo reciente)
- `src/app/api/registrations/route.ts` - GET/POST con validaciones
- `src/app/api/registrations/check-players/route.ts` - Verificación de jugadores
- `src/components/registrations/registration-form.tsx` - Formulario con validaciones
- `src/components/registrations/registrations-header.tsx` - Filtros

### Torneos
- `src/app/api/tournaments/route.ts` - CRUD principal
- `src/app/api/tournaments/[id]/calculate-points/route.ts` - Cálculo de puntos
- `src/components/tournaments/tournament-form.tsx` - Formulario

### Base de Datos
- `prisma/schema.prisma` - Esquema completo
- `prisma/seeds/index.ts` - Seeds con datos realistas

---

## 📊 Estadísticas Actuales

- **50+ componentes React** implementados
- **30+ API endpoints** funcionando
- **15+ tablas de BD** con relaciones
- **26 archivos** con RBAC implementado
- **4 roles** de usuario con permisos granulares
- **6 formatos** de torneos soportados
- **90% inscripciones** completadas
- **100% rankings y puntos** funcionales

---

## 🚀 Próximos Pasos Sugeridos

1. **Completar Stripe Integration** (3-4 días) - Habilita pagos automáticos
2. **Sistema de Emails** (2-3 días) - Notificaciones de inscripción
3. **Panel Público de Inscripción** (2 días) - Permite registros sin login previo
4. **Comenzar Brackets** (2 semanas) - Siguiente pieza crítica del flujo

---

## 📚 Documentación Relacionada

- **[README.md](README.md)** - Documentación principal completa
- **[RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)** - Sistema RBAC detallado
- **[roadmap.md](roadmap.md)** - Roadmap actualizado con progreso
- **Prisma Schema** - `prisma/schema.prisma` para modelo de datos

---

## 💡 Tips para Desarrollo Rápido

### Al trabajar en API Routes:
1. Siempre usar `requireAuth()` o `authorize()` primero
2. Validar con Zod schemas
3. Registrar auditoría con `AuditLogger.log()`
4. Manejar errores con `handleAuthError()`

### Al crear componentes:
1. Verificar permisos con `useAuth()` hook
2. Usar `isAdminOrClubAdmin` para lógica común
3. Validar formularios con React Hook Form + Zod
4. Componentes Select deben usar `value` (no `defaultValue`)

### Al modificar schemas:
1. Actualizar `prisma/schema.prisma`
2. Correr `npm run db:push` en desarrollo
3. Crear migración en producción con `npm run db:migrate`
4. Actualizar seeds si aplica

---

**Estado del Proyecto**: ✅ 85% Funcionalidad Core | 🚀 Sistema de Inscripciones Completado | ⏳ Próximo: Brackets y Partidos

*¿En qué módulo o funcionalidad específica necesitas trabajar?*
