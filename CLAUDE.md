# CLAUDE.md - Quick Start para Desarrolladores

> **Guía rápida para Claude Code y desarrolladores**
> Para documentación completa del proyecto ver [README.md](README.md)

---

## 🎯 Estado del Proyecto

**PDLShot** - Sistema completo de gestión de torneos de pádel
**Estado**: ✅ **97% completo** - Production-ready

- 46 API endpoints (100% RBAC protegidos)
- 90+ componentes React
- 30+ tablas de base de datos
- 6/7 formatos de torneo implementados

---

## ⚡ Comandos Esenciales

### Desarrollo

```bash
npm run dev              # Dev server con Turbopack (http://localhost:3000)
npm run dev-select       # Selector de DB + dev server
npm run build            # Build para producción
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
```

### Base de Datos

```bash
npm run db:select        # Selector interactivo (local/remoto)
npm run db:push          # Push schema changes (desarrollo)
npm run db:migrate       # Crear y aplicar migraciones
npm run db:studio        # Prisma Studio (GUI)
npm run db:reset         # Reset completo
npm run db:seed          # Cargar datos de prueba
```

### Credenciales de Test

```
Admin:      admin@padelshot.app / 123456
Organizer: clubadmin@padelshot.app / 123456
Player:     player@padelshot.app / 123456
```

---

## 📁 Arquitectura del Proyecto

```
src/
├── app/
│   ├── api/                    # 46 API routes (Next.js App Router)
│   │   ├── auth/               # Login, registro, password reset
│   │   ├── tournaments/        # CRUD torneos + brackets (17 endpoints)
│   │   ├── registrations/      # Inscripciones + pagos (8 endpoints)
│   │   ├── teams/              # Equipos (6 endpoints)
│   │   ├── matches/            # Partidos (5 endpoints)
│   │   ├── clubs/              # Clubes + canchas (11 endpoints)
│   │   ├── categories/         # Categorías (6 endpoints)
│   │   ├── rankings/           # Rankings (4 endpoints)
│   │   ├── users/              # Usuarios (7 endpoints)
│   │   └── webhooks/           # MercadoPago webhooks
│   ├── auth/                   # Páginas: login, registro, reset password
│   └── dashboard/              # 8 páginas principales protegidas
│
├── components/                 # 90+ componentes React organizados por módulo
│   ├── [entity]/               # Componentes específicos por entidad
│   └── ui/                     # shadcn/ui base components
│
├── hooks/
│   └── use-auth.ts            # Hook principal: isAdmin, hasRole, etc.
│
├── lib/
│   ├── rbac/                  # Sistema RBAC completo (14 archivos)
│   │   ├── helpers.ts         # requireAuth(), authorize(), handleAuthError()
│   │   ├── ability.ts         # Motor de permisos
│   │   ├── types.ts           # Action, Resource, Session
│   │   └── policies/          # Políticas por recurso
│   ├── services/              # 19 servicios de negocio
│   │   ├── bracket-service.ts           # Generación de brackets (1,700+ líneas)
│   │   ├── americano-social-service.ts  # Pools de 4 jugadores
│   │   ├── points-calculation-service.ts # Sistema de puntos
│   │   ├── payment-service.ts           # MercadoPago
│   │   ├── email-service.ts             # Resend emails
│   │   └── *-log-service.ts             # 9 servicios de auditoría
│   ├── validations/           # Zod schemas
│   ├── auth.ts                # NextAuth config
│   └── prisma.ts              # Prisma client singleton
│
└── types/                     # TypeScript definitions
```

---

## 🔐 Sistema RBAC - Quick Reference

### En API Routes

```typescript
import { requireAuth, authorize, handleAuthError, Action, Resource } from '@/lib/rbac'

// GET - Solo autenticación
export async function GET(request: NextRequest) {
  try {
    await requireAuth()  // Verifica que esté logged in
    const data = await prisma.resource.findMany()
    return NextResponse.json(data)
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST - Con autorización
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.TOURNAMENT)
    const body = await request.json()
    const created = await prisma.tournament.create({ data: body })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT - Con ownership check
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const existing = await prisma.tournament.findUnique({ where: { id } })

    // Valida ownership o rol ADMIN automáticamente
    await authorize(Action.UPDATE, Resource.TOURNAMENT, existing)

    const updated = await prisma.tournament.update({ where: { id }, data: body })
    return NextResponse.json(updated)
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### En Frontend

```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, isAdmin, isOrganizer, isAdminOrOrganizer, hasRole } = useAuth()

  if (isAdmin) return <AdminPanel />
  if (isAdminOrOrganizer) return <ManagementPanel />
  return <PlayerView />
}
```

**Quick Reference Table**:

| Operación | RBAC Requerido | Ejemplo |
|-----------|---------------|---------|
| Listar recursos | `requireAuth()` | GET /api/tournaments |
| Crear recurso | `authorize(CREATE, Resource)` | POST /api/tournaments |
| Actualizar propio | `requireAuth()` + ownership | PUT /api/users/[id] |
| Actualizar cualquiera | `authorize(UPDATE, Resource)` | PUT /api/tournaments/[id] |
| Eliminar | `authorize(DELETE, Resource)` | DELETE /api/clubs/[id] |

📄 **Doc completa**: [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md) (46 endpoints documentados)

---

## 🏆 Formatos de Torneo

### 6 Formatos Implementados

1. **SINGLE_ELIMINATION** ✅ - Con byes automáticos
2. **DOUBLE_ELIMINATION** ✅ - Upper/lower brackets
3. **ROUND_ROBIN** ✅ - Todos contra todos
4. **GROUP_STAGE_ELIMINATION** ✅ - Grupos + knockout
5. **AMERICANO** ✅ - Parejas fijas, Circle Method
6. **AMERICANO_SOCIAL** ✅ - Individual players, pools de 4, multi-ronda

📄 **Algoritmos detallados**: [TOURNAMENT_FORMATS.md](TOURNAMENT_FORMATS.md)

### Validaciones de Generación de Brackets

**CRÍTICO**: Brackets solo se generan cuando `status = REGISTRATION_CLOSED` o `IN_PROGRESS`

```typescript
// Estados permitidos
✅ REGISTRATION_CLOSED
✅ IN_PROGRESS

// Estados NO permitidos
❌ DRAFT → Error: "Torneo debe estar publicado"
❌ PUBLISHED → Error: "Inscripciones deben estar cerradas"
❌ REGISTRATION_OPEN → Error: "Inscripciones deben estar cerradas"
❌ COMPLETED → Error: "No se puede regenerar bracket completado"
```

### Limpieza Automática (→ IN_PROGRESS)

Cuando torneo cambia a `IN_PROGRESS`, sistema cancela automáticamente:

- Inscripciones NO `CONFIRMED`/`PAID` sin pagos parciales
- Equipos con al menos una inscripción cancelada
- **Preserva**: Inscripciones con pagos parciales

---

## 💰 Sistema de Pagos (MercadoPago)

### Variables de Entorno

```bash
MERCADOPAGO_ACCESS_TOKEN="TEST-your-token"
MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
NEXT_PUBLIC_MERCADOPAGO_ENABLED=true  # Habilitar/deshabilitar MercadoPago
MERCADOPAGO_WEBHOOK_SECRET="your-secret"  # REQUERIDO en producción
```

**Habilitar/Deshabilitar MercadoPago**:
- `NEXT_PUBLIC_MERCADOPAGO_ENABLED=true` → Botón visible, pagos habilitados
- `NEXT_PUBLIC_MERCADOPAGO_ENABLED=false` → Botón oculto, solo pagos manuales (admins)
- ⚠️ **IMPORTANTE**: Reiniciar servidor después de cambiar este valor

### Tarjetas de Test

```
Aprobada:   5031 7557 3453 0604 (Mastercard)
Rechazada:  4444 4444 4444 4444 (Visa)
CVV:        123
Nombre:     APRO (aprobar) / OTHE (rechazar)
```

### Seguridad

- ✅ Validación de firma HMAC-SHA256
- ✅ Validación de timestamp (< 5 min)
- ✅ Validación de monto
- ✅ Idempotencia (no procesa pagos ya PAID)

**Seguridad Score**: 9/10

📄 **Auditoría completa**: [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md)

---

## 📊 Sistema de Puntos

### Configuración por Torneo

Cada torneo define `rankingPoints` (100-5,000 pts):

- **Premium/Nacional**: 1000-1500 pts
- **Regional**: 400-900 pts
- **Local/Club**: 100-300 pts

### Fórmula

```
PUNTOS FINALES = [
    (PARTICIPACIÓN + POSICIÓN + VICTORIAS + SETS)
    × MULT_TORNEO
    × MULT_PARTICIPANTES
]

Donde:
- PARTICIPACIÓN = 50 pts (fijo)
- POSICIÓN = porcentaje × rankingPoints
- VICTORIAS = partidas_ganadas × (rankingPoints/1000) × 25
- SETS = sets_ganados × (rankingPoints/1000) × 5
```

### Ejemplo

Torneo Premium (1000 pts), Campeón, 5 victorias, 10 sets:
```
50 + 1000 + 125 + 50 = 1,225 pts
1,225 × 1.2 (eliminación simple) × 1.3 (24 jugadores) = 1,911 pts
```

📄 **Fórmulas y tablas**: [POINTS_CALCULATION.md](POINTS_CALCULATION.md)

---

## 🔧 Patrones de Código Comunes

### API Route Completo

```typescript
import { requireAuth, authorize, handleAuthError, Action, Resource } from '@/lib/rbac'
import { tournamentSchema } from '@/lib/validations/tournament'

export async function POST(request: NextRequest) {
  try {
    // 1. Autorizar
    const session = await authorize(Action.CREATE, Resource.TOURNAMENT)

    // 2. Validar input con Zod
    const body = await request.json()
    const validatedData = tournamentSchema.parse(body)

    // 3. Crear en BD
    const tournament = await prisma.tournament.create({ data: validatedData })

    // 4. Log (opcional pero recomendado)
    await TournamentLogService.logTournamentCreated(
      { userId: session.user.id, tournamentId: tournament.id },
      tournament
    )

    // 5. Retornar
    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Componente con React Hook Form + Zod

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tournamentSchema } from '@/lib/validations/tournament'

export function TournamentForm() {
  const form = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues: { ... }
  })

  const onSubmit = async (data) => {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    if (res.ok) toast.success('Torneo creado')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields con Controller de react-hook-form */}
    </form>
  )
}
```

### Select con React Hook Form (IMPORTANTE)

```typescript
// ❌ INCORRECTO (no sincroniza)
<Select defaultValue={field.value}>

// ✅ CORRECTO
<Select value={field.value} onValueChange={field.onChange}>
```

---

## 📝 Sistema de Auditoría

### 9 Servicios de Logging

```typescript
import { UserLogService } from '@/lib/services/user-log-service'
import { TournamentLogService } from '@/lib/services/tournament-log-service'
// ... etc (9 servicios total)

// CREATE
await UserLogService.logUserCreated({ userId, targetUserId }, newUser)

// UPDATE (con diff)
await TournamentLogService.logTournamentUpdated(
  { userId, tournamentId },
  oldTournament,
  newTournament
)

// DELETE
await TournamentLogService.logTournamentDeleted({ userId, tournamentId }, tournament)
```

**Información capturada**: action, userId, targetId, ipAddress, userAgent, oldData, newData, metadata, timestamp

📄 **Sistema completo**: [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md)

---

## 🛡️ Sistema de Badges (Status Styles)

**IMPORTANTE**: Usa helpers centralizados, NO hardcodees estilos.

```typescript
import {
  getTournamentStatusStyle,
  getTournamentStatusLabel,
  getPaymentStatusStyle,
  getPaymentStatusLabel,
  getRegistrationStatusStyle,
  getRegistrationStatusLabel,
  // ... etc (11 sistemas)
} from '@/lib/utils/status-styles'

// Uso
<Badge className={getPaymentStatusStyle(payment.paymentStatus)}>
  {getPaymentStatusLabel(payment.paymentStatus)}
</Badge>
```

**11 sistemas de badges**: Tournament Status, Registration Status, Payment Status, Payment Method, Match Status, Team Status, Club Status, Court Status, Category Type, Gender Restriction, Phase Type.

---

## 🐛 Troubleshooting Común

### Prisma Client Out of Sync

```bash
# Detener dev server (Ctrl+C)
npx prisma generate
npm run dev
```

**Cuándo**: Después de modificar `schema.prisma`

### Build Errors

```bash
rm -rf .next node_modules
npm install
npm run build
```

### Error de Base de Datos

```bash
npm run db:studio  # Verificar datos
npm run db:reset   # Reset si necesario (desarrollo)
npm run db:seed    # Recargar datos
```

### File Lock en Windows (Prisma)

```bash
# Detener dev server
npx prisma generate
npm run dev
```

---

## 📚 Documentación Completa

### Sistemas Principales

- 🔐 **[RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)** - 46 endpoints documentados, matriz de permisos
- 📊 **[POINTS_CALCULATION.md](POINTS_CALCULATION.md)** - Fórmulas, ejemplos, estrategias
- 💰 **[PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md)** - Setup MercadoPago, seguridad 9/10
- 🏆 **[TOURNAMENT_FORMATS.md](TOURNAMENT_FORMATS.md)** - 6 algoritmos implementados

### Funcionalidades

- 📝 **[LOGGING_SYSTEM.md](LOGGING_SYSTEM.md)** - 9 servicios de auditoría
- 🔑 **[PASSWORD_RECOVERY_SETUP.md](PASSWORD_RECOVERY_SETUP.md)** - Tokens seguros, emails HTML

### General

- 📘 **[README.md](README.md)** - Overview completo del proyecto

---

## 🚨 Reglas Críticas

### RBAC
1. **SIEMPRE** usa `requireAuth()` o `authorize()` en API routes
2. **NUNCA** hagas checks manuales de roles
3. **USA** `handleAuthError(error)` para manejo de errores

### Validaciones
1. **TODOS** los inputs deben validarse con Zod
2. **CREA** schemas en `src/lib/validations/`
3. **USA** `zodResolver` en React Hook Form

### Logging
1. **REGISTRA** todas las operaciones CUD (Create, Update, Delete)
2. **USA** servicios específicos (`UserLogService`, `TournamentLogService`, etc.)
3. **INCLUYE** oldData/newData en updates

### Forms
1. **USA** `value` (NO `defaultValue`) en Select components
2. **VALIDA** con Zod en cliente Y servidor
3. **MANEJA** loading states

### Base de Datos
1. **REGENERA** Prisma client después de cambios en schema
2. **CREA** migraciones en producción (`db:migrate`)
3. **USA** `db:push` solo en desarrollo

---

## ⚡ Tips de Productividad

### Database Selector

```bash
npm run dev-select      # Selector + dev en un comando
npm run db:seed-select  # Selector + seed
```

### Prisma Studio

```bash
npm run db:studio  # GUI para ver/editar datos
```

### Type Checking Continuo

```bash
npm run type-check  # Verificar tipos sin build
```

---

## 🔗 Links Útiles

- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js 16 Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Zod**: https://zod.dev
- **MercadoPago Docs**: https://www.mercadopago.com.ar/developers

---

**Last Updated**: Diciembre 2025
**Version**: 1.0.0
**Status**: Production Ready (97% complete)
