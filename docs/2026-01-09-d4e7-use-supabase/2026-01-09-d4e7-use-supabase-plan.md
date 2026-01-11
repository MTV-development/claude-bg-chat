# Implementation Plan: Use Supabase

**Spec:** [2026-01-09-d4e7-use-supabase-spec.md](./2026-01-09-d4e7-use-supabase-spec.md)
**Created:** 2026-01-09
**Status:** Complete

## Overview

Migrate claude-bg-chat from JSON file storage to Supabase PostgreSQL with Supabase Auth (magic link), Drizzle ORM, and multi-user data isolation.

## Environment Validation

Per `/docs/current/technical-architecture.md`, run these pre-flight checks:

```bash
# 1. Build check - ensures production build works
npm run build

# 2. Full type check - catches ALL TypeScript errors including test files
npx tsc --noEmit

# 3. Test suite - ensures tests pass
npm test
```

### Expected Results

| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

### Known Issues

| Check | Issue | Status | Notes |
|-------|-------|--------|-------|
| `npx tsc --noEmit` | `@testing-library/jest-dom` matcher types not recognized | Known | Errors like `toBeInTheDocument`, `toHaveClass` not found. Tests still run - Jest uses Babel. |

## Test Strategy

Each phase will be verified by:
1. **P0**: Baseline environment validation
2. **P1**: Database connection test script
3. **P2**: Manual auth flow verification + automated user sync
4. **P3**: Existing frontend functionality works against new backend

---

## Phase 0: Environment Validation

**Goal:** Establish a healthy baseline before making any code changes
**Verification:** All validation commands pass (or known issues are documented)

### P0.1: Run Pre-flight Commands

Run all validation commands from the Environment Validation section above.

### P0.2: Document Baseline

Record which checks passed/failed and note any known issues.

### P0 Checkpoint

- [ ] All validation commands run
- [ ] Results documented in progress log
- [ ] Known issues identified and noted
- [ ] Ready to proceed with implementation

---

## Phase 1: Database Infrastructure

**Goal:** Set up Drizzle ORM with Supabase PostgreSQL connection and schema
**Verification:** `npx tsx scripts/db-test.ts` runs without errors

### P1.1: Install Dependencies

**Files:** `package.json`
**Changes:** Install Drizzle ORM and Supabase packages
```bash
npm install drizzle-orm postgres @supabase/ssr @supabase/supabase-js dotenv
npm install -D drizzle-kit
```
**Acceptance:** Packages appear in package.json, no install errors

### P1.2: Create Environment Template

**Files:** `.env.local.example`
**Changes:** Create template with all required Supabase environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```
**Acceptance:** File exists with documented variables

### P1.3: Create Drizzle Configuration

**Files:** `drizzle.config.ts`
**Changes:** Configure Drizzle Kit with PostgreSQL dialect and schema path
**Acceptance:** Config file points to schema and uses `DIRECT_URL` for migrations

### P1.4: Create Database Schema

**Files:** `src/db/schema.ts`
**Changes:** Define all tables with Drizzle:
- `users` table (id, auth_id, email, timestamps)
- `projects` table (id, user_id FK, name, timestamps)
- `todos` table (all fields from spec with FKs)
- `activity_log` table (id, user_id, todo_id, action enum, details jsonb, timestamp)
- Define relations between tables
**Acceptance:** Schema compiles without TypeScript errors

### P1.5: Create Database Connection

**Files:** `src/db/index.ts`
**Changes:** Export Drizzle client instance using `DATABASE_URL`
**Acceptance:** Module exports `db` instance

### P1.6: Add npm Scripts

**Files:** `package.json`
**Changes:** Add scripts:
- `db:generate`: `drizzle-kit generate`
- `db:push`: `drizzle-kit push`
- `db:studio`: `drizzle-kit studio`
**Acceptance:** Scripts work when credentials are configured

### P1.7: Create Verification Script

**Files:** `scripts/db-test.ts`
**Changes:** Script that:
1. Connects to database
2. Inserts a test user
3. Inserts a test project
4. Inserts a test todo
5. Queries and logs results
6. Cleans up test data
**Acceptance:** Script runs without errors when credentials are set

### P1 Checkpoint

- [ ] All dependencies installed
- [ ] Environment template created
- [ ] Drizzle config created
- [ ] Schema defined with all 4 tables
- [ ] Database connection module created
- [ ] npm scripts added
- [ ] `npm run db:generate` creates migration files
- [ ] `npm run db:push` applies schema to Supabase
- [ ] `npx tsx scripts/db-test.ts` completes without errors
- [ ] `npm run build` still passes

---

## Phase 2: Authentication

**Goal:** Implement Supabase Auth with magic link login and user sync
**Verification:** Can log in via magic link, session persists, user record created in DB

### P2.1: Create Supabase Server Client

**Files:** `src/lib/supabase/server.ts`
**Changes:** Create server-side Supabase client using `@supabase/ssr`
**Acceptance:** Exports `createServerClient()` function

### P2.2: Create Supabase Browser Client

**Files:** `src/lib/supabase/client.ts`
**Changes:** Create browser-side Supabase client
**Acceptance:** Exports `createBrowserClient()` function

### P2.3: Create Auth Middleware Helper

**Files:** `src/lib/supabase/middleware.ts`
**Changes:** Create middleware helper for session refresh
**Acceptance:** Exports middleware helper function

### P2.4: Create Next.js Middleware

**Files:** `middleware.ts`
**Changes:** Configure middleware to:
- Refresh session on each request
- Protect routes (redirect unauthenticated users to /login)
- Allow public access to /login and /auth/callback
**Acceptance:** Middleware runs on navigation

### P2.5: Create User Sync Service

**Files:** `src/services/auth/sync-user.ts`
**Changes:** Function to:
- Check if user exists in `users` table by `auth_id`
- Create user record if not exists
- Return user record with internal `id`
**Acceptance:** User record created on first login

### P2.6: Create Get Current User Helper

**Files:** `src/services/auth/get-current-user.ts`
**Changes:** Function to:
- Get authenticated user from Supabase session
- Look up corresponding `users` table record
- Return typed user object or throw/redirect if unauthenticated
**Acceptance:** Returns user with internal DB id

### P2.7: Create Login Page

**Files:** `app/(auth)/login/page.tsx`
**Changes:** Create login page with:
- Email input
- "Send Magic Link" button
- Supabase `signInWithOtp` call
- Success message after email sent
**Acceptance:** Can enter email and receive magic link

### P2.8: Create Auth Callback Handler

**Files:** `app/(auth)/auth/callback/route.ts`
**Changes:** Route handler that:
- Exchanges code for session
- Calls `syncUserFromAuth()`
- Redirects to main app
**Acceptance:** Magic link click logs user in

### P2.9: Create Sign Out Endpoint

**Files:** `app/api/auth/signout/route.ts`
**Changes:** POST endpoint that:
- Calls Supabase `signOut()`
- Returns success response
**Acceptance:** Can log out

### P2.10: Add Auth UI to Header

**Files:** `components/Header.tsx` (new or modify existing layout)
**Changes:** Add:
- Show user email when logged in
- Logout button
- Login link when not logged in
**Acceptance:** Auth state visible in UI

### P2 Checkpoint

- [ ] Supabase server client created
- [ ] Supabase browser client created
- [ ] Middleware refreshes sessions
- [ ] Login page renders and sends magic links
- [ ] Auth callback exchanges code for session
- [ ] User sync creates DB record on first login
- [ ] Sign out works
- [ ] UI shows auth state
- [ ] `npm run build` passes
- [ ] Manual test: full login/logout flow works

---

## Phase 3: API Migration

**Goal:** Replace JSON file operations with Supabase database queries, scoped to authenticated user
**Verification:** All existing frontend functionality works with new backend

### P3.1: Create Todo Service - List

**Files:** `src/services/todos/list-todos.ts`
**Changes:** Function to query todos by user_id with tab filtering
- Port `filterByTab` logic to SQL WHERE clauses
- Include project name via join
**Acceptance:** Returns todos for authenticated user only

### P3.2: Create Todo Service - Create

**Files:** `src/services/todos/create-todo.ts`
**Changes:** Function to:
- Insert new todo with user_id
- Create activity log entry
- Return created todo
**Acceptance:** Todo inserted in DB with user_id

### P3.3: Create Todo Service - Update

**Files:** `src/services/todos/update-todo.ts`
**Changes:** Function to:
- Update todo fields (status, dueDate, nextAction, etc.)
- Verify todo belongs to user
- Create activity log entry
**Acceptance:** Todo updated, activity logged

### P3.4: Create Todo Service - Delete

**Files:** `src/services/todos/delete-todo.ts`
**Changes:** Function to:
- Hard delete todo (cascades to activity_log via FK)
- Verify todo belongs to user
**Acceptance:** Todo removed from DB

### P3.5: Create Todo Service - Postpone

**Files:** `src/services/todos/postpone-todo.ts`
**Changes:** Function to:
- Update due date
- Increment postpone count
- Create activity log entry
**Acceptance:** Due date and count updated

### P3.6: Create Project Service - List

**Files:** `src/services/projects/list-projects.ts`
**Changes:** Function to:
- Query projects for user with todo counts
- Aggregate completed vs active counts
**Acceptance:** Returns projects with counts

### P3.7: Create Project Service - Get or Create

**Files:** `src/services/projects/get-or-create-project.ts`
**Changes:** Function to:
- Find project by name for user
- Create if not exists
- Return project with id
**Acceptance:** Projects created/found correctly

### P3.8: Migrate GET /api/todos

**Files:** `app/api/todos/route.ts`
**Changes:** Replace JSON store calls with:
- `getCurrentUser()` for auth
- `listTodos(userId, tab)` for data
- Keep response shape compatible (or document breaking changes)
**Acceptance:** Frontend loads todos from DB

### P3.9: Migrate PATCH /api/todos

**Files:** `app/api/todos/route.ts`
**Changes:** Replace with:
- Auth check
- `updateTodo(userId, id, changes)`
**Acceptance:** Todo updates work

### P3.10: Migrate DELETE /api/todos

**Files:** `app/api/todos/route.ts`
**Changes:** Replace with:
- Auth check
- `deleteTodo(userId, id)`
**Acceptance:** Todo deletion works

### P3.11: Migrate POST /api/todos/add

**Files:** `app/api/todos/add/route.ts`
**Changes:** Replace with:
- Auth check
- `createTodo(userId, data)`
- Handle project creation if needed
**Acceptance:** Adding todos works

### P3.12: Migrate POST /api/todos/postpone

**Files:** `app/api/todos/postpone/route.ts`
**Changes:** Replace with:
- Auth check
- `postponeTodo(userId, id, days)`
**Acceptance:** Postponing works

### P3.13: Migrate GET /api/todos/projects

**Files:** `app/api/todos/projects/route.ts`
**Changes:** Replace with:
- Auth check
- `listProjects(userId)`
**Acceptance:** Projects endpoint works

### P3.14: Update Frontend if Needed

**Files:** `components/TodoList.tsx`, other components as needed
**Changes:** Adjust for any API response shape changes
**Acceptance:** Frontend renders correctly

### P3.15: Remove Old JSON Storage

**Files:**
- `scripts/gtd/lib/store.ts` - keep utility functions, remove JSON file operations
- `data/todos.json` - delete or gitignore
**Changes:**
- Remove `loadTodos()` / `saveTodos()` file operations
- Keep `filterByTab`, `getItemTab`, `generateId` helpers (move to shared utils if needed)
**Acceptance:** No more JSON file reads/writes

### P3 Checkpoint

- [ ] All service functions created
- [ ] All API routes migrated
- [ ] Data isolated per user (tested with 2 accounts)
- [ ] Activity log entries created
- [ ] Frontend works with new backend
- [ ] JSON storage removed
- [ ] `npm run build` passes
- [ ] `npm test` passes (after updating tests)

---

## Final Checklist

- [x] All phases complete (P0-P3)
- [ ] All tests passing
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Production build works (`npm run build`)
- [ ] Manual smoke test completed:
  - [ ] Login with magic link
  - [ ] Create todo
  - [ ] Update todo
  - [ ] Postpone todo
  - [ ] Delete todo
  - [ ] Create project
  - [ ] Logout
  - [ ] Verify data persists across sessions
  - [ ] Verify user A cannot see user B's data
- [ ] Update `/docs/current/technical-architecture.md` with new architecture
- [ ] Update `/docs/current/data-model.md` with database schema
- [ ] Ready for review

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Environment variables misconfigured | Clear documentation, `.env.local.example` templates |
| Auth flow complexity | Follow Supabase SSR guide closely, test each step |
| Data loss during migration | Clean slate approach (no migration), start fresh |
| Breaking API changes | Frontend updated in same phase, document changes |
| Test isolation | Separate Supabase project for tests |
| Session management bugs | Use Supabase middleware pattern from docs |

## Dependencies

```
P0 (Environment) → P1 (Database) → P2 (Auth) → P3 (API Migration)
```

Each phase depends on the previous phase being complete.
