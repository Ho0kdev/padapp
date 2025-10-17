# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PadApp** is a comprehensive paddle tennis (pádel) tournament management system built with Next.js 15, React 19, TypeScript, Prisma, and PostgreSQL. The system handles tournament creation, player registrations, bracket generation (6 different formats), match management, rankings, and administrative tasks with full RBAC (Role-Based Access Control) and audit logging.

**Current Status**: 97% core functionality complete, production-ready with 45+ API endpoints, 91+ React components, and 30+ database tables.

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

- `README.md` - Complete project documentation (1,360 lines)
- `RBAC_GUIA_DEFINITIVA.md` - Detailed RBAC guide
- `POINTS_CALCULATION.md` - Points system documentation
- `LOGGING_SYSTEM.md` - Audit logging guide (9 services)
- `TOURNAMENT_FORMATS.md` - All bracket formats explained (1,637 lines)
- `ROADMAP.md` - Project roadmap and progress tracking
- `context.md` - Quick development context

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
