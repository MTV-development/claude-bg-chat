# Use Supabase Specification

**Created:** 2026-01-09
**Status:** Ready

## Decisions

1. **Supabase Project**: New dedicated project (user will provide credentials)
2. **User Model**: Multi-user support from the start
3. **Chat Persistence**: No - keep chat local/ephemeral
4. **Test Database**: Separate Supabase project for testing
5. **No KV Store**: Agent prompts/configs stay hard-coded in source (unlike effortless-gtd)
6. **Projects Table**: Yes, minimal fields (id, user_id, name, timestamps)
7. **Activity Log Retention**: Unlimited (no cleanup policy)
8. **No Data Migration**: Start with clean slate; no JSON-to-DB migration
9. **Auth Method**: Magic link email only (no password, no OAuth)
10. **API Breaking Changes**: Acceptable if needed during migration
11. **Cascading Deletes**: All FK relationships use ON DELETE CASCADE

## Overview

Migrate claude-bg-chat from JSON file storage to Supabase PostgreSQL with:
- Supabase Auth for user authentication
- Drizzle ORM for type-safe database access and migrations
- Relational schema: users, todos, projects, activity_log
- Multi-user data isolation (all queries scoped to authenticated user)

## Schema Design

### Tables

```
users
├── id (uuid, PK)
├── auth_id (text, unique) → links to Supabase auth.users
├── email (text)
├── created_at (timestamp)
└── updated_at (timestamp)

projects
├── id (uuid, PK)
├── user_id (uuid, FK → users.id, ON DELETE CASCADE)
├── name (text)
├── created_at (timestamp)
└── updated_at (timestamp)

todos
├── id (uuid, PK)
├── user_id (uuid, FK → users.id, ON DELETE CASCADE)
├── project_id (uuid, FK → projects.id, ON DELETE SET NULL, nullable)
├── title (text) — raw capture
├── next_action (text, nullable) — clarified action
├── status (enum: inbox, active, someday, done)
├── due_date (date, nullable)
├── can_do_anytime (boolean)
├── postpone_count (integer)
├── created_at (timestamp)
├── completed_at (timestamp, nullable)
└── updated_at (timestamp)

activity_log
├── id (uuid, PK)
├── user_id (uuid, FK → users.id, ON DELETE CASCADE)
├── todo_id (uuid, FK → todos.id, ON DELETE CASCADE)
├── action (enum: created, postponed, completed, clarified, deleted, uncompleted)
├── details (jsonb) — flexible metadata
├── created_at (timestamp)
```

### Mapping from Current JSON Model

| JSON Field | Database Column | Notes |
|------------|-----------------|-------|
| `id` | `todos.id` | Keep as string/uuid |
| `title` | `todos.title` | Raw capture text |
| `nextAction` | `todos.next_action` | Clarified action |
| `status` | `todos.status` | Same enum values |
| `completed` | Derived | `status === 'done'` |
| `project` | `todos.project_id` | FK to projects table |
| `dueDate` | `todos.due_date` | Date type |
| `canDoAnytime` | `todos.can_do_anytime` | Boolean |
| `postponeCount` | `todos.postpone_count` | Integer |
| `createdAt` | `todos.created_at` | Timestamp |
| `completedAt` | `todos.completed_at` | Timestamp |

## Phase 1: Database Connectivity

### Dependencies to Install

```bash
npm install drizzle-orm postgres @supabase/ssr @supabase/supabase-js dotenv
npm install -D drizzle-kit
```

### Environment Variables (.env.local)

```
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=<provided by user>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<provided by user>

# Database (from Supabase Dashboard > Project Settings > Database)
DATABASE_URL=<pooled connection string>
DIRECT_URL=<direct connection string>
```

### Files to Create

1. **`drizzle.config.ts`** - Drizzle Kit configuration
2. **`src/db/schema.ts`** - Table definitions with Drizzle
3. **`src/db/index.ts`** - Database connection export
4. **`src/lib/supabase/server.ts`** - Supabase auth client (for later phases)
5. **`.env.local.example`** - Template for environment variables

### Verification Script

Create `scripts/db-test.ts` to:
- Connect to database
- Insert a test user
- Insert a test todo
- Query and log results
- Clean up test data

### Success Criteria

- [ ] `npm run db:generate` creates migration files
- [ ] `npm run db:push` applies schema to Supabase
- [ ] `npx tsx scripts/db-test.ts` completes without errors

---

## Phase 2: Authentication

### Goal
Implement Supabase Auth with login/logout and user sync to app database.

### Files to Create

1. **`src/lib/supabase/client.ts`** - Browser-side Supabase client
2. **`src/lib/supabase/middleware.ts`** - Session refresh middleware
3. **`middleware.ts`** - Next.js middleware for auth
4. **`src/services/auth/sync-user.ts`** - Sync Supabase auth user to `users` table
5. **`src/services/auth/get-current-user.ts`** - Get authenticated user helper
6. **`app/(auth)/login/page.tsx`** - Login page
7. **`app/(auth)/auth/callback/route.ts`** - Magic link callback handler
8. **`app/api/auth/signout/route.ts`** - Sign out endpoint

### Auth Flow (Magic Link Only)

1. User enters email on login page
2. Supabase sends magic link email
3. User clicks link → redirected to `/auth/callback`
4. Callback route exchanges code for session, calls `syncUserFromAuth()`
5. User redirected to main app with session cookie set
6. Middleware refreshes session on each request
7. API routes use `requireCurrentUser()` to get authenticated user

### UI Changes

- Add login/logout button to header
- Show user email when logged in
- Redirect unauthenticated users to login page

### Success Criteria

- [ ] Can log in via email magic link
- [ ] Session persists across page refreshes
- [ ] Can log out
- [ ] User record created in `users` table on first login

---

## Phase 3: API Migration

### Goal
Replace JSON file operations with database queries, scoped to authenticated user.

### Files to Modify

1. **`app/api/todos/route.ts`** - GET (list), PATCH (update), DELETE
2. **`app/api/todos/add/route.ts`** - POST (create todo)
3. **`app/api/todos/postpone/route.ts`** - POST (postpone todo)
4. **`app/api/todos/projects/route.ts`** - GET (list projects)

### New Database Service Layer

Create `src/services/todos/` with:
- `list-todos.ts` - Query todos with filtering by tab
- `create-todo.ts` - Insert new todo
- `update-todo.ts` - Update todo fields
- `delete-todo.ts` - Soft delete or hard delete
- `postpone-todo.ts` - Update due date and increment postpone count

Create `src/services/projects/` with:
- `list-projects.ts` - Get user's projects with todo counts
- `get-or-create-project.ts` - Find or create project by name

### Migration Strategy

1. Create new database service functions
2. Update API routes to use services instead of JSON store
3. All queries include `where user_id = currentUser.userId`
4. Breaking changes to API response shapes are acceptable if needed
5. Update frontend components to match new API contracts
6. Remove `scripts/gtd/lib/store.ts` JSON operations and `data/todos.json`

### Success Criteria

- [ ] All CRUD operations work against database
- [ ] Data isolated per user (user A can't see user B's todos)
- [ ] Frontend updated to work with new API
- [ ] Activity log entries created on todo changes

---

## Phase 4: Testing Infrastructure

### Goal
Set up separate Supabase project for isolated test database.

### Environment Setup

```
# .env.test.local
NEXT_PUBLIC_SUPABASE_URL=<test project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test project anon key>
DATABASE_URL=<test project pooled connection>
DIRECT_URL=<test project direct connection>
```

### Test Utilities

Create `tests/helpers/db.ts`:
- `setupTestDb()` - Run migrations on test database
- `cleanupTestDb()` - Truncate all tables between tests
- `createTestUser()` - Insert test user directly in DB (bypasses Supabase Auth for speed)
- `seedTestData(userId)` - Insert sample todos/projects for a test user

Test data seeding creates realistic scenarios:
- User with empty state (new user)
- User with todos across all tabs (focus, optional, later, inbox, done)
- User with multiple projects and linked todos
- User with activity log history

### Jest Configuration (existing test framework)

- Load `.env.test.local` for test runs (use `dotenv` in Jest setup)
- Run `cleanupTestDb()` in `beforeEach` or `afterEach`
- Run DB tests sequentially to avoid race conditions

### npm Scripts

```json
{
  "test:db": "dotenv -e .env.test.local -- jest --testPathPattern=tests/db",
  "db:test:push": "dotenv -e .env.test.local -- npx drizzle-kit push"
}
```

### Success Criteria

- [ ] Tests run against isolated test database
- [ ] Test data doesn't pollute production
- [ ] Can run full test suite with `npm run test:db`
- [ ] CI can run tests (secrets in GitHub Actions)

---

## Future Phases (Out of Scope)

- **Real-time sync**: Supabase Realtime for live updates across tabs
- **Row Level Security**: PostgreSQL RLS policies for defense in depth
- **Offline support**: Local-first with sync when online
- **Multiple auth providers**: Google, GitHub OAuth

## References

- `../effortless-gtd/drizzle.config.ts` - Drizzle configuration
- `../effortless-gtd/src/db/schema.ts` - Database schema with relations
- `../effortless-gtd/src/db/index.ts` - Database connection setup
- `../effortless-gtd/src/lib/supabase/server.ts` - Supabase auth client
- `../effortless-gtd/src/services/auth/*` - User sync and auth helpers
