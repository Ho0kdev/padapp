# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PDLShot** is a comprehensive paddle tennis (pádel) tournament management system built with Next.js 15, React 19, TypeScript, Prisma, and PostgreSQL. The system handles tournament creation, player registrations, bracket generation (6 different formats), match management, rankings, and administrative tasks with full RBAC (Role-Based Access Control) and audit logging.

**Current Status**: 99% core functionality complete, production-ready with 46 API endpoints (100% RBAC protected), 91+ React components, 30+ database tables, and advanced UI/UX system with sorting, filtering, and clickable navigation on 8 main pages.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run dev-select       # Select database (local/remote) and start dev
npm run build            # Production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

### Database Operations
```bash
npm run db:select        # Interactive database selector (local/remote)
npm run db:push          # Push schema changes to DB (development)
npm run db:migrate       # Create and apply migrations
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database completely
npm run db:seed          # Load seed data
```

### Environment Variables Required
```bash
DATABASE_URL="postgresql://postgres:padelshot123@localhost:5432/padelshot"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
HOSTNAME="0.0.0.0" # REQUIRED for Docker/Dokploy

# MercadoPago (Payment System)
MERCADOPAGO_ACCESS_TOKEN="TEST-your-access-token"
MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
MERCADOPAGO_WEBHOOK_SECRET="your-webhook-secret" # REQUIRED in production
```

### Default Test Credentials
- Admin: `admin@padelshot.com` / `123456`
- Club Admin: `clubadmin@padelshot.com` / `123456`
- Player: `player@padelshot.com` / `123456`

## Architecture & Core Concepts

### RBAC System (Role-Based Access Control)

**Critical**: This project has a comprehensive RBAC system that MUST be used in all protected routes.

**Four Roles**: `ADMIN`, `CLUB_ADMIN`, `PLAYER`, `REFEREE`

**Key Functions** (from `src/lib/rbac/`):
```typescript
import { requireAuth, authorize, handleAuthError, Action, Resource } from '@/lib/rbac'

// Authentication only
await requireAuth()  // Checks if user is logged in

// Authorization with permission check
const session = await authorize(Action.CREATE, Resource.TOURNAMENT)

// Check permission without throwing
const canEdit = await can(session, Action.UPDATE, Resource.TOURNAMENT, tournamentId)
```

**Actions**: CREATE, READ, UPDATE, DELETE, MANAGE, LIST, APPROVE, REJECT
**Resources**: TOURNAMENT, CLUB, USER, CATEGORY, REGISTRATION, PAYMENT, RANKING, MATCH, TEAM, COURT, LOG

**Frontend Usage**:
```typescript
import { useAuth } from '@/hooks/use-auth'
const { user, isAdmin, isClubAdmin, isAdminOrClubAdmin, hasRole } = useAuth()
```

**Quick Reference**:
| Operation | RBAC Required | Example |
|-----------|---------------|---------|
| List resources | `requireAuth()` | GET /api/tournaments |
| Create resource | `authorize(Action.CREATE, Resource.X)` | POST /api/tournaments |
| Update own | `requireAuth()` + ownership | PUT /api/users/[id] |
| Update any | `authorize(Action.UPDATE, Resource.X)` | PUT /api/tournaments/[id] |
| Delete | `authorize(Action.DELETE, Resource.X)` | DELETE /api/clubs/[id] |

📄 **Complete RBAC Documentation**: See [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md) for detailed endpoint mapping and permission rules.

**Match Management Permissions**:
- View: Any authenticated user (`requireAuth()`)
- Manage (start/load result/schedule/revert): ADMIN, CLUB_ADMIN, REFEREE, or Tournament Organizer
- Client pattern: `canManage = isOwner || isAdminOrClubAdmin || isReferee`
- API pattern: `authorize(Action.UPDATE, Resource.TOURNAMENT)`

### Audit Logging System

**All sensitive operations MUST be logged**. Use the 9 logging services:

```typescript
import { UserLogService } from '@/lib/services/user-log-service'
// ... etc for Tournament, Registration, Team, Match, Club, Court, Category, Rankings

// CREATE
await UserLogService.logUserCreated({ userId, targetUserId }, newUser)

// UPDATE (includes oldData/newData diff)
await TournamentLogService.logTournamentUpdated({ userId, tournamentId }, oldTournament, newTournament)

// DELETE
await TournamentLogService.logTournamentDeleted({ userId, tournamentId }, tournament)
```

Logs capture: action, userId, targetId, ipAddress, userAgent, oldData, newData, metadata, timestamp.

📄 **Complete Logging Documentation**: See [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md)

### Database Architecture

**Key Models**:
- **User** → **Player** (1:1 extended profile)
- **Tournament** → **TournamentCategory** → **Registration** → **Team** (pairs)
- **Match** → **MatchSet** → **MatchGame** (hierarchical structure)
- **Tournament** → **TournamentZone** (groups) → **ZoneTeam**
- **AmericanoPool** → **AmericanoPoolPlayer** / **AmericanoPoolMatch**

**Critical Relationships**:
1. **Registration → Team**: Individual players register first, then form teams. One player = ONE team per category.
2. **Match Progression**: Matches reference `team1FromMatchId`/`team2FromMatchId` for automatic winner progression.
3. **Logging**: Every entity has a `*Log` table.

### Tournament Formats

7 formats (6 implemented):
1. **SINGLE_ELIMINATION** ✅
2. **DOUBLE_ELIMINATION** ✅ (upper/lower brackets)
3. **ROUND_ROBIN** ✅
4. **GROUP_STAGE_ELIMINATION** ✅ (groups + knockout)
5. **AMERICANO** ✅ (fixed teams, round-robin)
6. **AMERICANO_SOCIAL** ✅ (individual players in pools of 4, multi-round support)
7. **SWISS** ⏳ (pending)

**Services**:
- `bracket-service.ts` (1,700+ lines): Auto-generates brackets, handles seeding, winner progression
- `americano-social-service.ts`: Pools of 4, intelligent pairing algorithm (1-10 rounds), minimizes repetitions

📄 **Complete Format Documentation**: See [TOURNAMENT_FORMATS.md](TOURNAMENT_FORMATS.md)

### Validation Pattern

**All API routes MUST validate input with Zod schemas** (in `src/lib/utils/validations/`):

```typescript
import { tournamentSchema } from '@/lib/utils/validations/tournament'
const validatedData = tournamentSchema.parse(await request.json())
```

**Forms** use React Hook Form + Zod:
```typescript
const form = useForm({ resolver: zodResolver(tournamentSchema) })
```

### Points Calculation System

Tournaments have configurable `rankingPoints` (100-5000):
- **Premium/National**: 1000-1500 pts
- **Regional**: 400-900 pts
- **Local**: 100-300 pts

Calculation via `POST /api/tournaments/[id]/calculate-points`:
1. Base participation (50 pts)
2. Position finish (proportional)
3. Performance bonuses (wins/sets)
4. Multipliers (type + participant count)

📄 **Complete Points Documentation**: See [POINTS_CALCULATION.md](POINTS_CALCULATION.md)

### Payment System & MercadoPago

**Complete payment system** with MercadoPago SDK and manual payment support.

**Key Features**:
- MercadoPago integration (cards, wallets, transfers)
- Manual payment confirmation (ADMIN/CLUB_ADMIN only)
- Webhook with signature validation (HMAC-SHA256) 🔒
- Audit trail with PaymentLogService
- Partial payment support

**Security Score**: **9/10** ⭐ (audited Dec 2024, 5 vulnerabilities corrected)

📄 **Complete Payment Documentation**: See [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md) for security audit, configuration, API endpoints, and testing.

## Important Patterns & Conventions

### API Route Structure

```typescript
// GET - List with pagination
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const data = await prisma.model.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: { /* relations */ }
    })
    return NextResponse.json(data)
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST - Create with validation and logging
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.MODEL)
    const validatedData = schema.parse(await request.json())
    const created = await prisma.model.create({ data: validatedData })
    await LogService.logCreated({ userId: session.user.id, modelId: created.id }, created)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Component Patterns

**Forms** (shadcn/ui + React Hook Form + Zod):
- Select: Use `value={field.value}` (NOT `defaultValue`)
- Include loading states and error handling
- Use `toast` from `sonner` for feedback

**Data Tables**:
- Header component with filters/actions
- Table component with data display
- Detail/edit dialogs

### Status Badges

**Centralized system** in `src/lib/utils/status-styles.ts`:

11 badge systems: Tournament Status, Registration Status, Payment Status, Payment Method, Match Status, Team Status, Club Status, Court Status, Category Type, Gender Restriction, Phase Type.

**Usage**:
```typescript
import { getPaymentStatusStyle, getPaymentStatusLabel } from '@/lib/utils/status-styles'

<Badge className={getPaymentStatusStyle(payment.paymentStatus)}>
  {getPaymentStatusLabel(payment.paymentStatus)}
</Badge>
```

**IMPORTANT**: ALWAYS use helper functions from `status-styles.ts`, NEVER hardcode styles/labels.

### Bracket & Match Management

**Key Flows**:

1. **Generate Bracket**: `POST /api/tournaments/[id]/generate-bracket`
   - **VALIDATION**: Only allowed when `status = REGISTRATION_CLOSED` or `IN_PROGRESS`
   - **ERROR**: Returns error if `status = PUBLISHED` or `REGISTRATION_OPEN`
   - Creates matches, assigns teams, sets progression links
   - Applies to all 7 formats (conventional + Americano Social via `/americano-social/generate`)

2. **Load Match Result**: `POST /api/matches/[id]/result`
   - Validates scores/sets/tiebreaks
   - Calls `BracketService.progressWinner()`
   - Auto-classifies groups when complete

3. **Group Classification**: Automatic on last group match
   - Calculates standings (points → set diff → game diff → sets won)
   - Selects top N + best seconds/thirds
   - Assigns to playoff bracket

4. **Tournament Start (IN_PROGRESS)**: Automatic cleanup
   - Cancels registrations NOT in `CONFIRMED` or `PAID` (without partial payments)
   - Cancels teams with cancelled registrations
   - Triggered automatically (by date) or manually (status change)
   - Full audit logging via `TournamentStatusService.cancelUnconfirmedRegistrations()`

### Critical Business Rules

1. **Registration Anti-Duplicates**: One player = ONE team per tournament category (`/api/registrations/check-players`)
2. **Team Formation**: 2 individual registrations first, then create Team
3. **Match Score Validation**: Sets array required, tiebreak at 7-6 needs points, winner team specified
4. **Bracket Progression**: Winners auto-advance via match references
5. **Group Standings**: Ordered by points → set diff → game diff → sets won
6. **Bracket Generation Validation**: Brackets/pools can ONLY be generated when `status = REGISTRATION_CLOSED` or `IN_PROGRESS`. Error if `PUBLISHED` or `REGISTRATION_OPEN`.
7. **Automatic Registration Cleanup**: When tournament → `IN_PROGRESS`, system automatically cancels:
   - Registrations NOT in `CONFIRMED`/`PAID` AND without partial payments
   - Teams with at least one cancelled registration
   - Preserves registrations with partial payments (at least one `PAID` payment)

## UI/UX Patterns - Data Tables

All main tables (Users, Clubs, Categories, Teams, Matches, Rankings, Tournaments, Registrations) follow a consistent pattern:

1. **Dynamic Sorting**: Click headers, URL persistence (`orderBy`, `order` params)
2. **Advanced Filtering**: Multiple dropdowns (up to 3), dynamic options
3. **Clickable Rows**: Navigate to detail page, intelligent click detection
4. **Mobile Responsive**: Cards on mobile, table on desktop

**Standard Pattern**:
```typescript
// Sorting handler
const handleSort = (column: string) => {
  const params = new URLSearchParams(searchParams)
  if (orderBy === column) {
    params.set('order', order === 'asc' ? 'desc' : 'asc')
  } else {
    params.set('orderBy', column)
    params.set('order', 'asc')
  }
  params.set('page', '1')
  router.push(`/dashboard/entity?${params.toString()}`)
}

// Row click handler
const handleRowClick = (id: string, e: React.MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('a')) {
    return
  }
  router.push(`/dashboard/entity/${id}`)
}
```

**API Pattern**:
```typescript
const buildOrderBy = () => {
  const validColumns = ['col1', 'col2', 'col3']
  const sortOrder = (order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  return validColumns.includes(orderBy) ? { [orderBy]: sortOrder } : { defaultColumn: 'asc' as const }
}
```

**Header Pattern**: Use `DataTableHeader` component with `filterLabel`, `secondaryFilter`, `tertiaryFilter` support.

## File Organization

```
src/
├── app/
│   ├── api/                    # API routes (Next.js 15 App Router)
│   ├── auth/                   # Login/register pages
│   └── dashboard/              # Protected dashboard pages
├── components/
│   ├── [entity]/               # Entity-specific components
│   └── ui/                     # Shadcn/ui base components
├── hooks/
│   └── use-auth.ts            # Authentication hook
├── lib/
│   ├── rbac/                  # RBAC system (CRITICAL)
│   ├── services/              # Business logic & logging
│   ├── utils/validations/     # Zod schemas
│   ├── auth.ts                # NextAuth configuration
│   └── prisma.ts              # Prisma client singleton
└── types/                     # TypeScript definitions
```

## Common Pitfalls to Avoid

1. **Don't skip RBAC checks**: Every protected API route needs `requireAuth()` or `authorize()`
2. **Don't forget logging**: All CUD operations need log service calls
3. **Don't use `defaultValue` in Select**: Use `value` for React Hook Form sync
4. **Don't modify brackets manually**: Use `BracketService` methods
5. **Don't forget Zod validation**: All API input must be validated
6. **Don't create teams directly**: Create individual registrations first
7. **Don't bypass ownership checks**: `authorize()` checks ownership automatically
8. **Don't forget Prisma client regeneration**: After schema changes run `npx prisma generate`

## Troubleshooting Common Issues

### Prisma Client Out of Sync

**Error**: `Unknown field 'X' for include statement on model 'Y'`

**Solution**:
```bash
# Stop dev server (Ctrl+C)
npx prisma generate
npm run dev
```

Regenerate Prisma client when:
- Modifying `prisma/schema.prisma`
- Adding/removing fields or relationships
- Pulling schema changes from git

### Dev Server File Lock on Windows

**Error**: `EPERM: operation not permitted, rename '...query_engine-windows.dll.node'`

**Solution**: Stop dev server → `npx prisma generate` → Restart dev server

## Testing Workflows

### Complete Tournament Flow
1. Create tournament (ADMIN/CLUB_ADMIN)
2. Publish → Change status to REGISTRATION_OPEN
3. Players create registrations
4. Form teams (2 registrations → 1 team)
5. **Close registrations** → Change status to REGISTRATION_CLOSED
6. Generate bracket (⚠️ ONLY works when REGISTRATION_CLOSED or IN_PROGRESS)
7. **Start tournament** → Change status to IN_PROGRESS
   - System automatically cancels unconfirmed registrations/teams
   - Only CONFIRMED/PAID participants remain
8. Load match results (auto-progresses winners)
9. Complete tournament
10. Calculate points: `POST /api/tournaments/[id]/calculate-points`

**Important Status Transitions**:
- `DRAFT` → `PUBLISHED` → `REGISTRATION_OPEN` → `REGISTRATION_CLOSED` → `IN_PROGRESS` → `COMPLETED`
- ⚠️ Cannot generate brackets in `PUBLISHED` or `REGISTRATION_OPEN`
- ⚠️ When → `IN_PROGRESS`: automatic cleanup of unconfirmed registrations

### Database Reset
```bash
npm run db:reset    # Drops DB, runs migrations
npm run db:seed     # Loads test data
```

## Key Documentation Files

- `README.md` - Complete project documentation with roadmap
- `RBAC_GUIA_DEFINITIVA.md` - Detailed RBAC guide (46 endpoints)
- `POINTS_CALCULATION.md` - Points system documentation
- `LOGGING_SYSTEM.md` - Audit logging guide (9 services)
- `TOURNAMENT_FORMATS.md` - All bracket formats (1,637 lines)
- `PAYMENT_SYSTEM.md` - Payment system + security audit
- `CHANGELOG.md` - Detailed changelog (Dec 2024+)

## Technology Stack

- **Next.js 15** with App Router (Turbopack)
- **React 19** with Server Components
- **TypeScript 5** (strict mode)
- **Prisma 6** ORM with PostgreSQL
- **NextAuth.js 4** with JWT strategy
- **Tailwind CSS 4** + shadcn/ui components
- **Zod 4** for validation
- **React Hook Form 7** for forms
- **date-fns 4** for dates
- **Recharts 3** for charts

## Architecture Decision Records

1. **Decoupled Registration System**: Individual registrations separate from teams (flexible, easier to manage)
2. **Match Progression via References**: Automatic winner advancement using source match references
3. **Service Layer for Business Logic**: Complex operations (brackets, points, americano) in services, not API routes
4. **Comprehensive Logging**: 9 separate services (one per entity) for detailed audit trails with IP, user agent, data diffs
5. **Configurable Tournament Points**: Each tournament defines `rankingPoints` (100-5000) for flexible ranking
6. **Americano Social as Separate Tables**: Independent from main Match system (different structure: 4 players vs 2 teams)
7. **Multiple Rounds for Americano Social**: Tournament-level config (1-10 rounds) with greedy algorithm minimizing pool repetitions

## Recent Updates

📄 **See [CHANGELOG.md](CHANGELOG.md) for detailed changelog** including:
- **Tournament integrity controls** (bracket generation validation + auto-cleanup, Dec 2024)
- Security audit (MercadoPago, 5 vulnerabilities fixed, Dec 2024)
- UI/UX overhaul (8 pages, sorting, filtering, clickable rows, Dec 2024)
- Americano Social multi-round system
- Points visualization and tournament reversion
- Intelligent multi-word search
- Payment status display fixes
- And more...
