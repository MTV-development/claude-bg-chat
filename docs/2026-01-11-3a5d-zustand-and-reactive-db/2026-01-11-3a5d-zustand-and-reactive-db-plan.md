# Implementation Plan: Zustand and Reactive DB

**Spec:** [2026-01-11-3a5d-zustand-and-reactive-db-spec.md](./2026-01-11-3a5d-zustand-and-reactive-db-spec.md)
**Created:** 2026-01-11
**Status:** Complete

## Overview

Implement a Zustand-based reactive state layer that subscribes to Supabase Realtime for automatic UI updates. Components will use selector hooks instead of local state + polling, with mutations still flowing through existing API routes.

## Environment Validation

Per `/docs/current/environment-validation.md`:

**Pre-flight commands:**
```bash
# 1. Build check
npm run build

# 2. Full type check
npx tsc --noEmit

# 3. Test suite
npm test
```

**Expected results:**
| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

**Known issues:** None documented.

## Test Strategy

- **Phase 1-2:** Unit test store actions and selectors manually by importing and calling them
- **Phase 3:** Integration test by running the app and verifying Realtime updates appear in browser DevTools Network tab
- **Phase 4:** End-to-end test by completing a todo via UI and confirming the list updates without polling
- **All phases:** `npm run build`, `npx tsc --noEmit`, `npm test` must pass

---

## Phase 0: Environment Validation

**Goal:** Establish a healthy baseline before making any code changes
**Verification:** All validation commands pass

### P0.1: Run Pre-flight Commands

Run all three validation commands from the Environment Validation section above.

### P0.2: Install Zustand

Install the Zustand package as specified in the spec's Prerequisites section.

```bash
npm install zustand
```

**Acceptance:** Package installs successfully, `npm run build` still passes.

### P0 Checkpoint

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] `npm test` passes
- [ ] Zustand installed
- [ ] Ready to proceed with implementation

---

## Phase 1: Store Infrastructure

**Goal:** Create the Zustand store with normalized structure and selector hooks
**Verification:** Store compiles, selectors can be imported without errors

### P1.1: Create Store Types

**Files:** `lib/stores/types.ts` (new)
**Changes:**
- Define `Todo` and `Project` interfaces matching database schema
- Define `TodoStore` interface with normalized entity storage
- Define `RealtimePayload` type for Supabase events
- Export `TabType` constant for tab filtering

**Acceptance:** File creates without TypeScript errors.

### P1.2: Create Core Store

**Files:** `lib/stores/todoStore.ts` (new)
**Changes:**
- Create Zustand store with `entities.todos` and `entities.projects` as `Record<string, T>`
- Add `isConnected` and `lastSyncedAt` connection state
- Implement internal actions: `_setTodos`, `_setProjects`, `_applyTodoChange`, `_applyProjectChange`
- Implement `_setConnected` and `_setLastSynced`

**Acceptance:** Store can be instantiated, internal actions work correctly.

### P1.3: Create Selector Hooks

**Files:** `lib/stores/selectors.ts` (new)
**Changes:**
- Implement `useTodo(id)` - single entity selector
- Implement `useProject(id)` - single entity selector
- Implement `useTodosForTab(tab)` - filtered list with `useShallow`
- Implement `useAllProjects()` - project list with `useShallow`
- Implement `useTabCounts()` - derived counts with `useShallow`
- Implement `useIsConnected()` - connection state

**Acceptance:** All hooks export without TypeScript errors.

### P1.4: Create Helper Utilities

**Files:** `lib/stores/todoHelpers.ts` (new)
**Changes:**
- Implement `getTabForTodo(todo)` function (port from `lib/services/todos/list-todos.ts:getItemTab`)
- Implement `sortTodos(a, b)` comparator function

**Acceptance:** Helpers can be imported and used by selectors.

### P1.5: Export Store Module

**Files:** `lib/stores/index.ts` (new)
**Changes:**
- Re-export all selector hooks from `selectors.ts`
- Re-export types as needed
- Do NOT export raw store (encapsulation)

**Acceptance:** `import { useTodo, useTodosForTab } from '@/lib/stores'` works.

### P1 Checkpoint

- [ ] All P1 files created
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Store can be imported without runtime errors

---

## Phase 2: Realtime Sync Layer

**Goal:** Connect Zustand store to Supabase Realtime for live updates
**Verification:** Changes in database appear in store without page refresh

### P2.1: Create Initial Load Function

**Files:** `lib/sync/initialLoad.ts` (new)
**Changes:**
- Implement `initialLoad(userId, supabase)` function
- Fetch todos and projects from Supabase using client-side queries
- Call store's `_setTodos` and `_setProjects` with results
- Call `_setLastSynced(Date.now())`

**Acceptance:** Function fetches data and populates store correctly.

### P2.2: Create Realtime Subscription

**Files:** `lib/sync/realtimeSync.ts` (new)
**Changes:**
- Implement `setupTodoSync(userId, supabase)` function
- Create channel `todos:${userId}`
- Subscribe to `postgres_changes` for `todos` table with `user_id` filter
- Subscribe to `postgres_changes` for `projects` table with `user_id` filter
- Call store's `_applyTodoChange` and `_applyProjectChange` on events
- Handle connection states: SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED
- Implement reconnection with 2-second backoff
- Return channel for cleanup

**Acceptance:** Subscription connects, receives test events in browser console.

### P2.3: Export Sync Module

**Files:** `lib/sync/index.ts` (new)
**Changes:**
- Re-export `setupTodoSync` and `initialLoad`

**Acceptance:** Functions can be imported from `@/lib/sync`.

### P2 Checkpoint

- [ ] All P2 files created
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: Realtime subscription connects in browser

---

## Phase 3: Provider Integration

**Goal:** Wire up sync layer to React lifecycle with proper cleanup
**Verification:** Store stays in sync with database changes

### P3.1: Create TodoSyncProvider

**Files:** `app/providers/TodoSyncProvider.tsx` (new)
**Changes:**
- Create client component with `'use client'` directive
- Use `useEffect` to set up sync when user is authenticated
- Get user from Supabase auth (use `supabase.auth.getUser()`)
- Call `setupTodoSync` with user ID
- Return cleanup function that removes channel
- Re-establish sync when user ID changes

**Acceptance:** Provider mounts without errors, sync initializes on login.

### P3.2: Create Auth Hook for Client

**Files:** `lib/hooks/useUser.ts` (new)
**Changes:**
- Create hook that subscribes to Supabase auth state
- Return current user object or null
- Handle loading state

**Acceptance:** Hook returns user after authentication.

### P3.3: Integrate Provider into App

**Files:** `components/Providers.tsx`
**Changes:**
- Import `TodoSyncProvider`
- Wrap children with `TodoSyncProvider` inside `ThemeProvider`

**Acceptance:** Provider is active in the component tree.

### P3 Checkpoint

- [ ] All P3 files created
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: Login triggers sync, store populates with data

---

## Phase 4: Migrate TodoList Component

**Goal:** Update TodoList to use Zustand selectors instead of local state + polling
**Verification:** UI updates automatically when database changes

### P4.1: Create TodoItem Component

**Files:** `components/TodoItem.tsx` (new)
**Changes:**
- Extract single todo rendering from `TodoList.tsx`
- Use `useTodo(id)` selector for reactive updates
- Keep mutation logic using existing API routes
- Accept props for event handlers (toggle, postpone, clarify, etc.)

**Acceptance:** Component renders todo and responds to store changes.

### P4.2: Create ProjectItem Component

**Files:** `components/ProjectItem.tsx` (new)
**Changes:**
- Extract single project rendering from `TodoList.tsx`
- Use `useProject(id)` if needed, or receive project as prop
- Accept onClick for navigation

**Acceptance:** Component renders project correctly.

### P4.3: Update TodoList to Use Selectors

**Files:** `components/TodoList.tsx`
**Changes:**
- Replace `todos` state with `useTodosForTab(activeTab)` selector
- Replace `projects` state with `useAllProjects()` selector
- Replace `tabCounts` state with `useTabCounts()` selector
- Remove `fetchTodos` and `fetchCounts` functions
- Remove `POLL_INTERVAL` constant and polling `useEffect`
- Keep all mutation handlers (they still call API routes)
- Use `TodoItem` component for rendering individual todos
- Use `ProjectItem` component for rendering projects

**Acceptance:** TodoList renders using store data, no polling.

### P4.4: Update Selection State

**Files:** `components/TodoList.tsx`
**Changes:**
- Selection state (`selectedIds`) remains in component (local UI state)
- No changes needed - selection is ephemeral, not synced

**Acceptance:** Selection still works after migration.

### P4 Checkpoint

- [ ] All P4 files created/modified
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Manual test: Complete a todo, list updates without refresh
- [ ] Manual test: Add todo via API, appears in UI automatically

---

## Phase 5: Cleanup and Polish

**Goal:** Remove legacy code and ensure clean architecture
**Verification:** No dead code, types are correct, app works end-to-end

### P5.1: Remove Polling Footer

**Files:** `components/TodoList.tsx`
**Changes:**
- Remove the "Auto-refreshing every Xs" footer text
- Optionally show connection status using `useIsConnected()` selector

**Acceptance:** Footer no longer mentions polling.

### P5.2: Handle Reconnection UI (Optional)

**Files:** `components/TodoList.tsx` or create `components/ConnectionStatus.tsx`
**Changes:**
- Show subtle indicator when `isConnected` is false
- Could be a small banner or icon

**Acceptance:** Users know if realtime is disconnected.

### P5.3: Handle Logout Cleanup

**Files:** `app/providers/TodoSyncProvider.tsx`
**Changes:**
- Clear store on logout (call `_setTodos([])`, `_setProjects([])`)
- This should already work via the `useEffect` cleanup when user changes

**Acceptance:** Store clears when user logs out.

### P5.4: Verify No Stale References

**Files:** All modified files
**Changes:**
- Remove any unused imports
- Ensure no references to old polling logic
- Clean up any `TODO` comments added during migration

**Acceptance:** `npm run build` passes with no warnings about unused variables.

### P5 Checkpoint

- [ ] All P5 tasks complete
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Manual test: Full workflow (login, add todo, complete, logout)

---

## Phase 6: E2E Testing

**Goal:** Create automated end-to-end tests verifying realtime sync functionality
**Verification:** Playwright tests pass, demonstrating realtime updates work without polling

### P6.1: Set Up E2E Test Bypass

**Files:** `middleware.ts`, `lib/hooks/useUser.ts`, `lib/services/auth/get-current-user.ts`
**Changes:**
- Add `NEXT_PUBLIC_E2E_TEST_USER_ID` environment variable support
- Middleware bypasses auth when E2E user ID is set (development only)
- Client-side `useUser` hook returns mock user in E2E mode
- Server-side `getCurrentUser` returns E2E user for API calls

**Acceptance:** Tests can run without requiring real authentication.

### P6.2: Create Realtime Sync E2E Tests

**Files:** `e2e/realtime-sync.spec.ts` (new)
**Changes:**
- Test: Initial load shows todos from Supabase
- Test: Adding a todo shows up immediately via realtime (not page refresh)
- Test: Completing a todo updates via realtime

**Acceptance:** All three tests pass with `npx playwright test`.

### P6.3: Create E2E Testing Documentation

**Files:** `docs/current/e2e-testing.md` (new), `docs/current/overview.md`
**Changes:**
- Document E2E test bypass setup
- Document how to run E2E tests
- Document troubleshooting common issues
- Add reference to E2E testing doc in overview

**Acceptance:** Documentation is complete and accurate.

### P6 Checkpoint

- [ ] E2E bypass working in middleware, client hooks, and server API
- [ ] All 3 realtime sync tests pass
- [ ] E2E testing playbook documented
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

---

## Final Checklist

- [ ] All phases complete (P0-P6)
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Manual smoke test completed:
  - [ ] Login shows todos from database
  - [ ] Adding todo via chat appears in list immediately
  - [ ] Completing todo updates list and counts
  - [ ] Opening in second browser tab shows synced state
  - [ ] Logout clears list
- [ ] No polling code remaining
- [ ] E2E tests pass (`npx playwright test e2e/realtime-sync.spec.ts`)
- [ ] Ready for review
