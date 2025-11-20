# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PadApp** is a comprehensive paddle tennis (pádel) tournament management system built with Next.js 15, React 19, TypeScript, Prisma, and PostgreSQL. The system handles tournament creation, player registrations, bracket generation (6 different formats), match management, rankings, and administrative tasks with full RBAC (Role-Based Access Control) and audit logging.

**Current Status**: 99% core functionality complete, production-ready with 46 API endpoints (100% RBAC protected), 91+ React components, 30+ database tables, and advanced UI/UX system with sorting, filtering, and clickable navigation on 8 main pages.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack
npm run dev-select       # Select database (local/remote) and start dev
npm run build            # Production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier
```

### Database Operations
```bash
npm run db:select        # Interactive database selector (local/remote)
npm run db:push          # Push schema changes to DB (development)
npm run db:migrate       # Create and apply migrations
npm run db:deploy        # Deploy migrations (production)
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database completely
npm run db:seed          # Load seed data
npm run db:seed-select   # Select DB then seed
```

**Database Selector Script**: The project includes `scripts/database-selector.js` that allows switching between local (Docker PostgreSQL) and remote databases by updating the `.env` file.

### Environment Variables Required
```bash
DATABASE_URL="postgresql://postgres:padapp123@localhost:5432/padapp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# MercadoPago (Sistema de Pagos)
MERCADOPAGO_ACCESS_TOKEN="TEST-your-access-token"
MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
MERCADOPAGO_WEBHOOK_SECRET="your-webhook-secret" # OBLIGATORIO en producción
```

### Default Test Credentials
- Admin: `admin@padapp.com` / `123456`
- Club Admin: `clubadmin@padapp.com` / `123456`
- Player: `player@padapp.com` / `123456`

## Architecture & Core Concepts

### RBAC System (Role-Based Access Control)

**Critical**: This project has a comprehensive RBAC system that MUST be used in all protected routes.

**Four Roles**:
- `ADMIN` - Full system access
- `CLUB_ADMIN` - Club and tournament management
- `PLAYER` - Personal profile and tournament participation
- `REFEREE` - Match result management

**Key Functions** (from `src/lib/rbac/`):
```typescript
// Use in ALL API routes
import { requireAuth, authorize, handleAuthError, Action, Resource } from '@/lib/rbac'

// Simple authentication check
export async function GET(request: NextRequest) {
  try {
    await requireAuth()  // Only checks if user is logged in
    // ... your logic
  } catch (error) {
    return handleAuthError(error)
  }
}

// Authorization with specific permission
export async function POST(request: NextRequest) {
  try {
    const session = await authorize(Action.CREATE, Resource.TOURNAMENT)
    // ... your logic
  } catch (error) {
    return handleAuthError(error)
  }
}

// Check permission without throwing error
const canEdit = await can(session, Action.UPDATE, Resource.TOURNAMENT, tournamentId)
```

**Actions**: CREATE, READ, UPDATE, DELETE, MANAGE, LIST, APPROVE, REJECT

**Resources**: TOURNAMENT, CLUB, USER, CATEGORY, REGISTRATION, PAYMENT, RANKING, MATCH, TEAM, COURT, LOG

**Frontend Usage**:
```typescript
import { useAuth } from '@/hooks/use-auth'

const { user, isAdmin, isClubAdmin, isAdminOrClubAdmin, hasRole } = useAuth()
```

**API Coverage**: 46 rutas protegidas (100% del sistema)
- 7 endpoints de Usuarios
- 17 endpoints de Torneos
- 11 endpoints de Clubes/Canchas
- 6 endpoints de Categorías
- 8 endpoints de Inscripciones
- 6 endpoints de Equipos
- 5 endpoints de Partidos
- 4 endpoints de Rankings
- 3 endpoints de Administración
- 2 endpoints de Autenticación (públicos con rate limiting)

**Quick Reference**:
| Operación | RBAC Required | Example |
|-----------|---------------|---------|
| Listar recursos | `requireAuth()` | GET /api/tournaments |
| Crear recurso | `authorize(Action.CREATE, Resource.X)` | POST /api/tournaments |
| Actualizar propio | `requireAuth()` + ownership | PUT /api/users/[id] |
| Actualizar cualquiera | `authorize(Action.UPDATE, Resource.X)` | PUT /api/tournaments/[id] |
| Eliminar | `authorize(Action.DELETE, Resource.X)` | DELETE /api/clubs/[id] |
| Admin only | `authorize(Action.READ, Resource.DASHBOARD)` | GET /api/admin/logs |

For complete API endpoint mapping, see [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)

**Match Management Permissions**:

All tournament formats (conventional and Americano Social) use consistent permissions for match management operations:

| Operation | Required Permissions | Implementation |
|-----------|---------------------|----------------|
| View match details | Any authenticated user | `requireAuth()` on server page |
| Start match | ADMIN, CLUB_ADMIN, REFEREE, or Tournament Organizer | `canManage` check in client component |
| Load match result | ADMIN, CLUB_ADMIN, REFEREE, or Tournament Organizer | `canManage` check in client component |
| Schedule match | ADMIN, CLUB_ADMIN, REFEREE, or Tournament Organizer | `canManage` check in client component |
| Revert result | ADMIN, CLUB_ADMIN, REFEREE, or Tournament Organizer | `canManage` check in client component |

**Client Component Pattern**:
```typescript
import { useAuth } from '@/hooks/use-auth'

const { isAdminOrClubAdmin, isReferee } = useAuth()
const isOwner = match.tournament.organizerId === currentUserId
const canManage = isOwner || isAdminOrClubAdmin || isReferee

// Use canManage to show/hide management buttons
{canManage && <Button>Cargar resultado</Button>}
```

**API Endpoint Pattern**:
```typescript
// All match management endpoints use Action.UPDATE on Resource.TOURNAMENT
const session = await authorize(Action.UPDATE, Resource.TOURNAMENT)
```

This ensures that:
- Tournament organizers can manage their own tournament matches
- ADMIN and CLUB_ADMIN can manage any matches
- REFEREE role can load/revert match results (but not create/delete tournaments)
- Regular PLAYER role cannot manage matches

### Audit Logging System

**All sensitive operations MUST be logged**. There are 9 logging services:

```typescript
import { UserLogService } from '@/lib/services/user-log-service'
import { TournamentLogService } from '@/lib/services/tournament-log-service'
// ... etc for Registration, Team, Match, Club, Court, Category, Rankings

// Log pattern for CREATE
await UserLogService.logUserCreated(
  { userId: session.user.id, targetUserId: newUser.id },
  newUser
)

// Log pattern for UPDATE (includes oldData/newData diff)
await TournamentLogService.logTournamentUpdated(
  { userId: session.user.id, tournamentId: tournament.id },
  oldTournament,
  newTournament
)

// Log pattern for DELETE
await TournamentLogService.logTournamentDeleted(
  { userId: session.user.id, tournamentId: tournament.id },
  tournament
)
```

Logs automatically capture: action, userId, targetId, ipAddress, userAgent, oldData, newData, metadata, and timestamp.

### Database Architecture

**Key Models**:
- **User** → **Player** (1:1 extended profile)
- **Tournament** → Multiple **TournamentCategory** → **Registration** (individual players) → **Team** (pairs)
- **Match** → **MatchSet** → **MatchGame** (hierarchical match structure)
- **Tournament** → **TournamentZone** (groups) → **ZoneTeam** (group assignments)
- **AmericanoPool** → **AmericanoPoolPlayer** / **AmericanoPoolMatch** (social format)

**Critical Relationships**:
1. **Registration → Team**: Individual players register, then form teams (pairs). One player can register in multiple categories but only ONE team per category.
2. **Match Progression**: Matches reference `team1FromMatchId` and `team2FromMatchId` for automatic winner progression in elimination brackets.
3. **Logging**: Every main entity has a corresponding `*Log` table (UserLog, TournamentLog, RegistrationLog, etc.)

### Tournament Formats (6 implemented)

The system supports 7 formats (6 implemented):
1. **SINGLE_ELIMINATION** ✅
2. **DOUBLE_ELIMINATION** ✅ (upper/lower brackets)
3. **ROUND_ROBIN** ✅
4. **GROUP_STAGE_ELIMINATION** ✅ (groups + knockout)
5. **AMERICANO** ✅ (fixed teams, round-robin)
6. **AMERICANO_SOCIAL** ✅ (individual players in pools of 4)
7. **SWISS** ⏳ (pending)

**Bracket Service** (`src/lib/services/bracket-service.ts`):
- Main service: 1,700+ lines
- Auto-generates brackets for all formats
- Handles bye distribution, seeding, group configuration
- Automatic winner progression with `progressWinner()`
- Group standings calculation with tie-breaking rules

**Americano Social Service** (`src/lib/services/americano-social-service.ts`):
- Specialized format: players in pools of 4
- Requires exactly multiples of 4 players
- 3 matches per player with rotating partners
- Individual and global rankings
- **🆕 Multiple rounds support** (1-10 rounds):
  - Round 1: Random distribution
  - Rounds 2+: Intelligent pairing that minimizes ALL repeated pairings within pools
  - Greedy algorithm counts total pool repetitions, not just individual player pairs
  - Mathematical formula: max rounds ≈ `(N/4) - 1` based on Social Golfer Problem analysis
  - Examples: 8 players → 1 round, 12 players → 2 rounds, 16 players → 3 rounds, 20 players → 4 rounds

### Validation Pattern

**All API routes MUST validate input with Zod schemas** (located in `src/lib/utils/validations/`):

```typescript
import { tournamentSchema } from '@/lib/utils/validations/tournament'

const body = await request.json()
const validatedData = tournamentSchema.parse(body) // Throws ZodError if invalid
```

**Form validation** uses React Hook Form + Zod:
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

const form = useForm({
  resolver: zodResolver(tournamentSchema),
  defaultValues: {...}
})
```

### Points Calculation System

Tournaments have configurable `rankingPoints` (100-5000) that determines importance:
- **Premium/National**: 1000-1500 pts
- **Regional**: 400-900 pts
- **Local**: 100-300 pts

Points are calculated automatically via `POST /api/tournaments/[id]/calculate-points` based on:
1. Base participation (50 pts fixed)
2. Position finish (proportional to rankingPoints)
3. Performance bonuses (wins/sets, proportional)
4. Multipliers (tournament type + participant count)

**Service**: `src/lib/services/points-calculation-service.ts`

### Payment System & MercadoPago Integration

**Complete payment system** with MercadoPago integration and manual payment support.

**Key Features**:
- MercadoPago SDK integration (cards, wallets, bank transfers)
- Manual payment confirmation (ADMIN/CLUB_ADMIN only)
- Webhook with signature validation (HMAC-SHA256) 🔒
- Complete audit trail with PaymentLogService
- Support for partial payments

**Security** 🔒:
- Audited December 2024 - **5 vulnerabilities corrected**
- Security Score: **9/10** ⭐ (was 3/10 before audit)
- Webhook signature validation (x-signature)
- Amount validation, idempotency, anti-replay protection

**Environment Variables**:
```bash
MERCADOPAGO_ACCESS_TOKEN="TEST-xxx"
MERCADOPAGO_WEBHOOK_SECRET="app-xxx" # REQUIRED in production
```

**📄 Complete Documentation**: See [`PAYMENT_SYSTEM.md`](PAYMENT_SYSTEM.md) for:
- Full system guide
- Security audit details
- Configuration guide
- API endpoints
- Testing instructions

## Important Patterns & Conventions

### API Route Structure

**Standard pattern for all API routes**:
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
    const body = await request.json()
    const validatedData = schema.parse(body)

    const created = await prisma.model.create({ data: validatedData })

    await LogService.logCreated({ userId: session.user.id, modelId: created.id }, created)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Component Patterns

**Form components** use shadcn/ui + React Hook Form + Zod:
- Select components MUST use `value={field.value}` (NOT `defaultValue`)
- All forms include loading states and error handling
- Use `toast` from `sonner` for user feedback

**Data tables** follow pattern:
- Header component with filters/actions
- Table component with data display
- Detail/edit dialogs for actions

### Status Badges and Visual Styles

**Centralized Badge System** (`src/lib/utils/status-styles.ts`):

The system uses a centralized approach for all status badges to ensure consistency across the entire application.

**Available Badge Systems**:
1. **Tournament Status** - 7 states (DRAFT, PUBLISHED, REGISTRATION_OPEN, etc.)
2. **Registration Status** - 5 states (PENDING, CONFIRMED, PAID, CANCELLED, WAITLIST)
3. **Payment Status** - 5 states (PENDING, PAID, FAILED, REFUNDED, CANCELLED)
4. **Payment Method** - 5 methods (MERCADOPAGO_CARD, MERCADOPAGO_WALLET, BANK_TRANSFER, CASH, MANUAL)
5. **Match Status** - 5 states (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, WALKOVER)
6. **Team Status** - 3 states (DRAFT, CONFIRMED, CANCELLED)
7. **Club Status** - 3 states (ACTIVE, INACTIVE, MAINTENANCE)
8. **Court Status** - 4 states (AVAILABLE, MAINTENANCE, RESERVED, UNAVAILABLE)
9. **Category Type** - 5 types (AGE, SKILL, RANKING, GENDER, MIXED)
10. **Gender Restriction** - 3 options (MALE, FEMALE, MIXED)
11. **Phase Type** - 7 phases (GROUP_STAGE, ROUND_OF_16, QUARTERFINALS, etc.)

**Usage Pattern**:
```typescript
import {
  getPaymentStatusStyle,
  getPaymentStatusLabel,
  getPaymentMethodStyle,
  getPaymentMethodLabel,
  getTournamentStatusStyle,
  getTournamentStatusLabel
  // ... other helpers
} from '@/lib/utils/status-styles'

// In component
<Badge className={getPaymentStatusStyle(payment.paymentStatus)}>
  {getPaymentStatusLabel(payment.paymentStatus)}
</Badge>
```

**IMPORTANT**:
- ALWAYS use the helper functions from `status-styles.ts`
- NEVER hardcode badge styles or labels inline
- Each status/method has consistent colors across the entire app
- All labels are in Spanish for user-facing components

**Payment System Badges**:

*Payment Status*:
- `PENDING` → Pendiente (yellow)
- `PAID` → Pagado (green)
- `FAILED` → Fallido (red)
- `REFUNDED` → Reembolsado (purple)
- `CANCELLED` → Cancelado (gray)

*Payment Method*:
- `MERCADOPAGO_CARD` → Tarjeta (MercadoPago) (blue)
- `MERCADOPAGO_WALLET` → Wallet Digital (purple)
- `BANK_TRANSFER` → Transferencia Bancaria (teal)
- `CASH` → Efectivo (green)
- `MANUAL` → Manual (orange)

### Bracket & Match Management

**Important flows**:

1. **Generate Bracket**: `POST /api/tournaments/[id]/generate-bracket`
   - Creates matches, assigns teams, sets up progression links
   - For GROUP_STAGE_ELIMINATION: creates groups + empty playoff structure

2. **Load Match Result**: `POST /api/matches/[id]/result`
   - Validates scores, sets, tiebreaks
   - Calls `BracketService.progressWinner()` to advance winners
   - For group stage: auto-classifies teams when all groups complete
   - Logs with MatchLogService

3. **Group Classification**: Automatic on last group match completion
   - Calculates standings for all groups
   - Selects top N + best seconds/thirds
   - Assigns to playoff bracket with proper seeding

### Critical Business Rules

1. **Registration Anti-Duplicates**: One player can be in only ONE team per tournament category. Checked via `/api/registrations/check-players` endpoint.

2. **Team Formation**: Requires 2 individual registrations first, then creates Team linking both.

3. **Match Score Validation**:
   - Must provide sets array with scores
   - Tiebreak at 7-6 requires tiebreak points
   - Winner team must be specified

4. **Bracket Progression**:
   - Winners automatically advance via `team1FromMatchId`/`team2FromMatchId` references
   - Double elimination has separate roundNumber ranges (1-N for upper, 101-10N for lower, 200 for final)

5. **Group Standings**: Ordered by points → set diff → game diff → sets won

## File Organization

```
src/
├── app/
│   ├── api/                    # API routes (Next.js 15 App Router)
│   │   ├── [entity]/route.ts   # Standard CRUD pattern
│   │   └── [entity]/[id]/      # Individual resource operations
│   ├── auth/                   # Login/register pages
│   └── dashboard/              # Protected dashboard pages
├── components/
│   ├── [entity]/               # Entity-specific components
│   └── ui/                     # Shadcn/ui base components
├── hooks/
│   └── use-auth.ts            # Authentication hook (MUST use for permission checks)
├── lib/
│   ├── rbac/                  # RBAC system (CRITICAL)
│   ├── services/              # Business logic & logging services
│   ├── utils/validations/     # Zod schemas
│   ├── auth.ts                # NextAuth configuration
│   └── prisma.ts              # Prisma client singleton
└── types/                     # TypeScript type definitions
```

## Common Pitfalls to Avoid

1. **Don't skip RBAC checks**: Every protected API route needs `requireAuth()` or `authorize()`
2. **Don't forget logging**: All CUD operations need corresponding log service calls
3. **Don't use `defaultValue` in Select components**: Use `value` for React Hook Form sync
4. **Don't modify bracket structure manually**: Use `BracketService` methods
5. **Don't forget Zod validation**: All API input must be validated
6. **Don't create teams directly**: Create individual registrations first
7. **Don't bypass ownership checks**: `authorize()` automatically checks ownership for resources
8. **Don't forget to regenerate Prisma client**: After schema changes, always run `npx prisma generate`

## Troubleshooting Common Issues

### Prisma Client Out of Sync

**Error**: `Unknown field 'X' for include statement on model 'Y'`

**Cause**: The Prisma client is out of sync with the schema after schema modifications.

**Solution**:
```bash
# Stop the dev server first (Ctrl+C)
npx prisma generate

# Restart dev server
npm run dev
```

**Note**: The Prisma client must be regenerated whenever:
- You modify `prisma/schema.prisma`
- You add/remove fields from models
- You change relationships between models
- After pulling schema changes from git

### Dev Server File Lock on Windows

**Error**: `EPERM: operation not permitted, rename '...query_engine-windows.dll.node'`

**Cause**: The Next.js dev server is running and has locked the Prisma query engine DLL.

**Solution**:
1. Stop the dev server completely
2. Run `npx prisma generate`
3. Restart the dev server

## Testing Workflows

### Complete Tournament Flow
1. Create tournament (ADMIN/CLUB_ADMIN)
2. Publish tournament → Change status to REGISTRATION_OPEN
3. Players create individual registrations
4. Form teams (2 registrations → 1 team)
5. Generate bracket
6. Load match results (auto-progresses winners)
7. Complete tournament
8. Calculate points: `POST /api/tournaments/[id]/calculate-points`

### Database Reset with Fresh Data
```bash
npm run db:reset    # Drops DB, runs migrations
npm run db:seed     # Loads test data (users, clubs, tournaments, etc.)
```

## Key Documentation Files

- `README.md` - Complete project documentation with roadmap section
- `RBAC_GUIA_DEFINITIVA.md` - Detailed RBAC guide
- `POINTS_CALCULATION.md` - Points system documentation
- `LOGGING_SYSTEM.md` - Audit logging guide (9 services)
- `TOURNAMENT_FORMATS.md` - All bracket formats explained (1,637 lines)
- `PAYMENT_SYSTEM.md` - Complete payment system guide (includes security audit)

## Technology Stack

- **Next.js 15** with App Router (Turbopack)
- **React 19** with Server Components
- **TypeScript 5** (strict mode)
- **Prisma 6** ORM with PostgreSQL
- **NextAuth.js 4** with JWT strategy
- **Tailwind CSS 4** + shadcn/ui components
- **Zod 4** for validation
- **React Hook Form 7** for forms
- **Zustand 5** for global state
- **date-fns 4** for dates
- **Recharts 3** for charts

## Architecture Decision Records

1. **Decoupled Registration System**: Individual player registrations separate from team formation (easier to manage, more flexible)

2. **Match Progression via References**: Instead of manual advancement, matches reference source matches for automatic winner progression

3. **Service Layer for Business Logic**: Complex operations (brackets, points, americano) isolated in services, not in API routes

4. **Comprehensive Logging**: 9 separate logging services (one per entity) for detailed audit trails, each capturing IP, user agent, and data diffs

5. **Configurable Tournament Points**: Each tournament defines its own `rankingPoints` value (100-5000) for flexible ranking systems

6. **Americano Social as Separate Tables**: AmericanoPool/Player/Match tables independent from main Match system due to different structure (4 players per match vs 2 teams)


7. **Multiple Rounds for Americano Social** (Dec 2024): Tournament-level configuration (1-10 rounds) with intelligent greedy algorithm that minimizes total pool repetitions (counts all pairs within pool, not just individual connections)

## UI/UX Patterns - Data Tables (December 2024)

### Advanced Data Table Pattern

All main data tables (Users, Clubs, Categories, Teams, Matches, Rankings, Tournaments, Registrations) follow a consistent pattern with:
1. **Dynamic sorting** (click headers to sort ASC/DESC)
2. **Advanced filtering** (multiple filter dropdowns)
3. **Clickable rows** (navigate to detail page)
4. **Mobile responsive** (cards on mobile, table on desktop)

### Standard Table Component Structure

```typescript
// 1. Imports
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useRouter } from "next/navigation"

// 2. Component setup
export function EntityTable() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current sorting state from URL
  const orderBy = searchParams.get('orderBy') || 'defaultColumn'
  const order = searchParams.get('order') || 'defaultOrder'

  // 3. Sorting handler
  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams)
    if (orderBy === column) {
      // Toggle order if clicking same column
      params.set('order', order === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, start with ascending
      params.set('orderBy', column)
      params.set('order', 'asc')
    }
    params.set('page', '1') // Reset to first page
    router.push(`/dashboard/entity?${params.toString()}`)
  }

  // 4. Icon selector
  const getSortIcon = (column: string) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    }
    return order === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  // 5. Row click handler
  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Don't navigate if clicking on buttons or dropdown menus
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('a')) {
      return
    }
    router.push(`/dashboard/entity/${id}`)
  }

  return (
    <>
      {/* Desktop table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('columnName')}
                className="h-8 px-2 lg:px-3 hover:bg-transparent"
              >
                Column Label
                {getSortIcon('columnName')}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              onClick={(e) => handleRowClick(item.id, e)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell>{item.data}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Mobile cards */}
      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => handleRowClick(item.id, e)}
      >
        {/* Card content */}
      </Card>
    </>
  )
}
```

### API Route Pattern for Sorting

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const orderBy = searchParams.get('orderBy') || 'defaultColumn'
    const order = searchParams.get('order') || 'defaultOrder'

    // Build dynamic orderBy clause
    const buildOrderBy = () => {
      const validColumns = ['col1', 'col2', 'col3']
      const sortOrder = (order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

      if (validColumns.includes(orderBy)) {
        return { [orderBy]: sortOrder }
      } else {
        return { defaultColumn: 'asc' as const }
      }
    }

    const items = await prisma.entity.findMany({
      orderBy: buildOrderBy(),
      // ... other query params
    })

    return NextResponse.json(items)
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Header Component Pattern

Headers use the `DataTableHeader` component with support for multiple filters:

```typescript
export function EntityHeader() {
  return (
    <DataTableHeader
      title="Page Title"
      description="Page description"
      searchPlaceholder="Search by name, email, etc..."
      createButtonText="New Item"
      createButtonHref="/dashboard/entity/new"
      filterLabel="Status"
      filterOptions={statusOptions}
      filterParamKey="status"
      secondaryFilter={{
        label: "Secondary",
        options: secondaryOptions,
        paramKey: "secondary",
        width: "w-[150px]"
      }}
      tertiaryFilter={{
        label: "Tertiary",
        options: tertiaryOptions,
        paramKey: "tertiary",
        width: "w-[140px]"
      }}
      basePath="/dashboard/entity"
    />
  )
}
```

### Pages with Full UI/UX Implementation

| Page | Sortable Columns | Filters | Clickable |
|------|-----------------|---------|-----------|
| **Users** | 6 (name, email, role, status, gender, createdAt) | Status, Role, Gender | ✅ |
| **Clubs** | 3 (name, city, status) | Status, City, Country | ✅ |
| **Categories** | 3 (name, type, status) | Status | ✅ |
| **Teams** | 3 (name, status, createdAt) | Status, Tournament | ✅ |
| **Matches** | 2 (scheduledAt, status) | Status, Tournament | ✅ |
| **Rankings** | 3 (position, points, season) | Category, Season | ✅ |
| **Tournaments** | 4 (name, status, start, type) | Status (multiple) | ✅ |
| **Registrations** | 2 (status, createdAt) | Status, Tournament | ✅ |

### Key Features

1. **URL State Persistence**: All sorting and filtering stored in URL params
2. **Type Safety**: TypeScript types enforced for `order` param (`'asc' | 'desc'`)
3. **Intelligent Click Detection**: Prevents navigation when clicking UI elements
4. **Visual Feedback**: Hover effects and sort icons provide clear UX
5. **Mobile First**: Responsive design with cards on mobile, tables on desktop
6. **Consistent Behavior**: Same patterns across all 8 pages

## Recent Updates (December 2024)

### 🔒 Security Audit - MercadoPago Payment System (December 2024)

**Complete security audit and correction of the payment system**

**Summary**: Identified and corrected **5 vulnerabilities** (2 CRITICAL, 1 HIGH, 1 MEDIUM, 1 LOW) in the MercadoPago integration.

**Vulnerabilities Corrected**:

1. **🔴 CRITICAL - Webhook without Signature Validation**
   - **Problem**: Anyone could send fake webhooks to mark payments as approved
   - **Solution**: Implemented `MercadoPagoValidationService` with HMAC-SHA256 validation
   - **File**: `src/lib/services/mercadopago-validation-service.ts` (NEW)
   - **Impact**: Prevents fraud by validating that webhooks come from MercadoPago

2. **🔴 CRITICAL - Dangerous Fallback to Most Recent PENDING**
   - **Problem**: With multiple PENDING payments, webhook could update the wrong one
   - **Solution**: Removed fallback, now only searches by unique IDs
   - **File**: `src/app/api/webhooks/mercadopago/route.ts:102-128`
   - **Impact**: Eliminates payment confusion scenarios

3. **🟡 HIGH - No Amount Validation**
   - **Problem**: System accepted payments without verifying amounts matched
   - **Solution**: Validates amount with 0.01 ARS tolerance before approval
   - **File**: `src/app/api/webhooks/mercadopago/route.ts:143-175`
   - **Impact**: Only accepts payments for the correct amount

4. **🟡 MEDIUM - Race Condition**
   - **Problem**: Simultaneous webhooks could process same payment twice
   - **Solution**: Idempotency check - doesn't process already PAID payments
   - **File**: `src/app/api/webhooks/mercadopago/route.ts:130-138`
   - **Impact**: Prevents duplicate processing

5. **🟢 LOW - Logs with organizerId instead of System**
   - **Problem**: Webhook logs used organizerId, confusing audit trail
   - **Solution**: Created dedicated 'system' user (ID: `'system'`)
   - **Files**: `prisma/seeds/index.ts:90-109`, webhook route
   - **Impact**: Better audit trail clarity

**Security Improvements**:
- ✅ Signature validation (x-signature header with HMAC-SHA256)
- ✅ Timestamp validation (prevents replay attacks, max 5 min)
- ✅ Amount validation (tolerance: 0.01 ARS)
- ✅ Idempotency (prevents double processing)
- ✅ Strict ID-based payment lookup
- ✅ System user for automated logs

**Security Score**:
- **Before**: 3/10 🔴 (Vulnerable to fraud)
- **After**: 9/10 ✅ (Production-ready secure)

**New Environment Variable**:
```bash
MERCADOPAGO_WEBHOOK_SECRET="app-xxx" # REQUIRED in production
```

**Documentation**:
- `SECURITY_AUDIT_MERCADOPAGO.md` - Complete audit report (NEW)
- `PAYMENT_SYSTEM.md` - Updated with security section
- `.env.example` - Updated with new variable

**Files Modified**: 5 files
**Files Created**: 2 files (validation service + audit doc)

---

### UI/UX System Overhaul - Advanced Data Tables (December 2024)

Implemented comprehensive UI/UX improvements across all 8 main pages with:

**Pages Updated**: Users, Clubs, Categories, Teams, Matches, Rankings, Tournaments, Registrations

**Features Added**:
1. **Dynamic Column Sorting**:
   - 27+ sortable columns across all pages
   - Click header to sort ascending, click again for descending
   - Visual icons: `↕️` (unsorted), `↑` (asc), `↓` (desc)
   - URL persistence with `orderBy` and `order` params

2. **Clickable Row Navigation**:
   - Click any table row to navigate to detail page
   - Intelligent click detection (doesn't navigate on buttons/dropdowns)
   - Hover effect: `cursor-pointer hover:bg-muted/50`
   - Works on both desktop tables and mobile cards

3. **Advanced Filtering**:
   - Multiple filter dropdowns per page (up to 3)
   - Dynamic filters (e.g., cities/countries loaded from database)
   - Improved search placeholders describing searchable fields
   - `DataTableHeader` component enhanced with `tertiaryFilter` support

4. **Backend API Improvements**:
   - `buildOrderBy()` function pattern in 8 API endpoints
   - Type-safe ordering: `'asc' | 'desc'` enforcement
   - Column validation (only allowed columns can be sorted)
   - New endpoint: `/api/clubs/filters` for dynamic filter options

**Files Modified** (25 files):
- APIs (8): users, clubs, categories, teams, matches, rankings, tournaments, registrations, clubs/filters
- Tables (8): Corresponding table components for each entity
- Headers (8): Corresponding header components for each entity
- UI Component (1): `data-table-header.tsx` (added tertiaryFilter support)

**Consistency Achieved**:
- Same 3 functions in all tables: `handleSort()`, `getSortIcon()`, `handleRowClick()`
- Same hooks: `useRouter()`, `useSearchParams()`
- Same TypeScript patterns and type safety
- Same UX behavior across desktop and mobile

### Match Validation Enhancements
- Added validation preventing match status changes to `IN_PROGRESS`, `COMPLETED`, or `WALKOVER` when teams are not fully assigned
- File: `src/app/api/matches/[id]/status/route.ts:98-108`

### Automatic Seed Assignment System
- Implemented automatic seed calculation based on sum of player ranking points
- Preview dialog shows seed assignments before bracket generation
- Tiebreaker: team registration date (first registered = better seed)
- Players without ranking automatically go to the end
- File: `src/app/api/tournaments/[id]/assign-seeds/route.ts`
- Component: `src/components/brackets/bracket-generator.tsx`

### RBAC Improvements for Americano Social
- Enhanced permission controls for pool generation and management
- Only ADMIN and CLUB_ADMIN can generate/regenerate pools
- Players see informative messages instead of admin buttons
- File: `src/components/tournaments/americano-social/americano-social-detail.tsx`

### Pool Regeneration with Confirmation
- Added confirmation dialog showing what data will be deleted
- Displays: total pools, total matches, completed matches
- Properly deletes americanoGlobalRanking to avoid unique constraint errors
- File: `src/app/api/tournaments/[id]/americano-social/generate/route.ts`

### Navigation Fixes for Americano Social
- Dashboard automatically detects tournament type and redirects appropriately
- Conventional tournament route redirects to americano-social route when applicable
- Server-side redirection for better performance
- Files:
  - `src/lib/dashboard.ts`
  - `src/components/dashboard/recent-tournaments-real.tsx`
  - `src/app/dashboard/tournaments/[id]/page.tsx`

### Multiple Rounds System (Major Feature)
**Database Changes**:
- Added `americanoRounds` field to Tournament model (1-10)
- Added `roundNumber` field to AmericanoPool model
- Updated unique constraint: `[tournamentId, categoryId, roundNumber, poolNumber]`

**Intelligent Pairing Algorithm**:
- Round 1: Random distribution
- Rounds 2+: Greedy algorithm minimizes TOTAL pool repetitions
- Evaluates each candidate by counting ALL repeated pairs in the proposed pool
- Uses `countPoolRepetitions()` to score entire pool, not just candidate connections
- Selects candidates that create pools with minimum total repetitions

**Mathematical Foundation**:
- Utility: `src/lib/utils/americano-rounds.ts`
- Based on Social Golfer Problem (NP-complete combinatorial problem)
- Conservative formula: max rounds ≈ `(N/4) - 1`
- Formula derived from analysis of known optimal solutions for pools of 4
- Provides recommendation messages based on player count
- Examples: 8 players → 1 round, 12 → 2, 16 → 3, 20 → 4

**UI Enhancements**:
- Form field visible only for AMERICANO_SOCIAL tournament type
- Dynamic message showing recommended rounds based on player count
- Multi-round visualization with tabs per round
- Organized match view grouped by rounds

**Service Updates**:
- `AmericanoSocialService.generateAmericanoSocialPools()` now accepts `numberOfRounds` parameter
- Private methods: `generateFirstRound()`, `generateSubsequentRound()`, `countPoolRepetitions()`, `updatePlayerPoolHistory()`
- New `countPoolRepetitions()`: evaluates entire pool for repeated pairs (not just candidate)
- File: `src/lib/services/americano-social-service.ts`

**Benefits**:
- Maximizes player interaction variety
- Minimizes total pool repetitions using intelligent greedy algorithm
- Flexible configuration (1-10 rounds)
- Better statistics from more matches
- Clear UI organization

### Bug Fix: americanoRounds Not Persisting (Dec 2024)
**Issue**: Field `americanoRounds` was not saving when editing tournaments, causing regenerated pools to always use 1 round.

**Root Causes**:
1. Missing `americanoRounds` in `updateTournamentSchema` validation (`/api/tournaments/[id]/route.ts`)
2. Missing `americanoRounds` in `createTournamentSchema` validation (`/api/tournaments/route.ts`)
3. Missing `americanoRounds` in `initialData` mapping (`edit/page.tsx`)
4. Next.js caching preventing fresh data load (`americano-social/page.tsx`)

**Fixes Applied**:
- ✅ Added `americanoRounds: z.number().int().min(1).max(10).optional()` to update schema
- ✅ Added `americanoRounds: z.number().int().min(1).max(10).default(1)` to create schema
- ✅ Added `americanoRounds: tournament.americanoRounds` to edit page initialData
- ✅ Explicitly selected `americanoRounds: true` in americano-social page query
- ✅ Added `export const dynamic = 'force-dynamic'` to disable Next.js caching

**Files Modified**:
- `src/app/api/tournaments/route.ts` (line 34)
- `src/app/api/tournaments/[id]/route.ts` (line 42)
- `src/app/dashboard/tournaments/[id]/edit/page.tsx` (line 81)
- `src/app/dashboard/tournaments/[id]/americano-social/page.tsx` (lines 12-13, 52)

### Points Visualization and Tournament Reversion (Oct 30, 2025)

**New Feature: Tournament Points Tab**
- Added "Puntos" tab in tournament detail view showing complete points breakdown
- Component: `src/components/tournaments/tournament-points.tsx`
- API Endpoint: `GET /api/tournaments/[id]/stats`
- Features:
  - Podium display for top 3 players
  - Stats cards (total players, points awarded, average)
  - Expandable table rows with detailed breakdown per player
  - Shows: participation base, position points (%), victory bonus, set bonus, subtotal, tournament multiplier, participant multiplier, final total
  - Real-time calculation of breakdown using `PointsCalculationService.calculatePlayerTournamentPointsWithBreakdown()`

**New Feature: Player Points History**
- Added "Historial de Puntos" tab in player ranking detail page
- Component: `src/components/rankings/ranking-detail.tsx`
- API Endpoint: `GET /api/players/[playerId]/tournament-stats`
- Features:
  - List of all tournaments played by the player
  - Tournament name (linked), status, final position, matches, sets, points
  - Same expandable breakdown as tournament points tab
  - Ordered by most recent tournament first

**Automatic Points Recalculation on Tournament Reversion**
- When a tournament status changes from COMPLETED to IN_PROGRESS:
  - Automatically resets `TournamentStats.pointsEarned` to 0
  - Resets `TournamentStats.finalPosition` to null
  - Recalculates all player rankings excluding the reverted tournament
  - Only sums points from tournaments with status COMPLETED
- Service: `PointsCalculationService.recalculatePlayerRankingsAfterTournamentReversion()`
- Triggers:
  1. DELETE `/api/matches/[id]/result` - When reverting a match result
  2. PATCH `/api/tournaments/[id]/status` - When manually changing tournament status
- File: `src/lib/services/points-calculation-service.ts`
- Ensures data integrity: rankings always reflect only completed tournaments

**UI Fixes: React Fragment Keys**
- Fixed React warning about missing keys in list items
- Changed `<>` to `<React.Fragment key={...}>` in tournament-points.tsx and ranking-detail.tsx
- Proper HTML structure maintained (no Collapsible wrapper violating table hierarchy)
- Files:
  - `src/components/tournaments/tournament-points.tsx`
  - `src/components/rankings/ranking-detail.tsx`

