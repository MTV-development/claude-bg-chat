# Supabase & Zustand Subscription Analysis

**Created:** 2026-01-11
**Project:** 2026-01-11-3a5d-zustand-and-reactive-db
**Status:** Reference Document

## Purpose

This document captures research findings on:
1. **Supabase Realtime** - How subscriptions work, performance, pitfalls, best practices
2. **Zustand** - Selective subscriptions, avoiding re-render cascades, store architecture

This analysis informed the architectural decisions in the main specification.

---

# Part 1: Zustand Analysis

## The Core Problem: Re-render Cascades

When using Zustand (or any state management library) naively, components can subscribe to the entire store. This means **any change to any part of the store** triggers re-renders in **all subscribed components**.

### The Anti-Pattern

```tsx
function TodoList() {
  // BAD: Subscribes to ENTIRE store
  const state = useTodoStore()

  // This component re-renders when:
  // - A todo changes (expected)
  // - Connection status changes (unexpected)
  // - Any other state changes (unexpected)

  return state.todos.map(todo => <TodoItem todo={todo} />)
}
```

### Why This Happens

Zustand uses `Object.is` comparison by default. When you select the entire store object:
- The store object reference changes on every update
- `Object.is(oldStore, newStore)` returns `false`
- React re-renders the component

---

## The Solution: Selector Functions

Zustand allows you to select specific slices of state. Only when **that specific slice** changes does the component re-render.

### Basic Selectors

```tsx
// GOOD: Only re-renders when `todos` array changes
const todos = useTodoStore((state) => state.todos)

// GOOD: Only re-renders when this specific todo changes
const todo = useTodoStore((state) => state.todos[todoId])

// GOOD: Only re-renders when connection status changes
const isConnected = useTodoStore((state) => state.isConnected)
```

### The `useShallow` Hook

When your selector returns a **new object or array** on every call, you need `useShallow` to prevent unnecessary re-renders.

```tsx
import { useShallow } from 'zustand/react/shallow'

// WITHOUT useShallow - re-renders every time (bad)
const counts = useTodoStore((state) => ({
  focus: state.focusCount,
  inbox: state.inboxCount,
}))
// ^ Creates new object every time, Object.is always returns false

// WITH useShallow - only re-renders when values change (good)
const counts = useTodoStore(useShallow((state) => ({
  focus: state.focusCount,
  inbox: state.inboxCount,
})))
// ^ useShallow does shallow comparison of object properties
```

### When to Use `useShallow`

| Selector Returns | Use `useShallow`? |
|------------------|-------------------|
| Single primitive (`state.count`) | No |
| Single object reference (`state.todos[id]`) | No |
| New object literal (`{ a: state.a, b: state.b }`) | Yes |
| New array (`state.items.filter(...)`) | Yes |
| Computed value (`state.items.length`) | No |

---

## Best Practice: Export Hooks, Not the Store

The recommended pattern is to **never export the raw store hook**. Instead, export purpose-built selector hooks.

### Why?

1. **Prevents accidental full-store subscriptions** - Developers can't do `useStore()` if it's not exported
2. **Encapsulates store structure** - Components don't know/care how data is organized internally
3. **Easier refactoring** - Change store structure without touching components
4. **Self-documenting** - Hook names describe what data they provide

### Implementation Pattern

```typescript
// store.ts - INTERNAL, not exported
const useStore = create<TodoStore>((set, get) => ({
  entities: {
    todos: {},
    projects: {},
  },
  isConnected: false,
  // ...
}))

// selectors.ts - PUBLIC API
export const useTodo = (id: string) =>
  useStore((state) => state.entities.todos[id])

export const useTodosForTab = (tab: Tab) =>
  useStore(useShallow((state) =>
    Object.values(state.entities.todos)
      .filter(t => getTabForTodo(t) === tab)
  ))

export const useTabCounts = () =>
  useStore(useShallow((state) => {
    const todos = Object.values(state.entities.todos)
    return {
      focus: todos.filter(t => getTabForTodo(t) === 'focus').length,
      optional: todos.filter(t => getTabForTodo(t) === 'optional').length,
      // ...
    }
  }))

export const useIsConnected = () =>
  useStore((state) => state.isConnected)

export const useTodoActions = () =>
  useStore(useShallow((state) => ({
    addTodo: state.addTodo,
    completeTodo: state.completeTodo,
    deleteTodo: state.deleteTodo,
  })))
```

---

## Normalized Data Storage

### The Problem with Arrays

```typescript
// Array storage
interface Store {
  todos: Todo[]
}

// To find a todo by ID: O(n) scan
const todo = todos.find(t => t.id === id)

// To update a todo: O(n) map
const updated = todos.map(t => t.id === id ? newTodo : t)
```

### The Solution: Record by ID

```typescript
// Normalized storage
interface Store {
  todos: Record<string, Todo>
}

// To find a todo by ID: O(1) lookup
const todo = todos[id]

// To update a todo: O(1) assignment
todos[id] = newTodo
```

### Benefits of Normalization

1. **O(1) lookups** - `useTodo(id)` is instant
2. **Easy updates** - Replace single entity without touching others
3. **No duplicates** - ID is the key, can't have same entity twice
4. **Better selector performance** - Can select single entity without scanning
5. **Matches database structure** - Easier mental model for DB-backed state

---

## Slices Pattern for Large Stores

For complex applications, split the store into logical "slices" that are combined at creation time.

### Why Slices?

1. **Separation of concerns** - Each domain (todos, projects, sync) is isolated
2. **Easier testing** - Can test slices independently
3. **Better organization** - One file per domain
4. **Extensibility** - Add new entities without touching existing code

### Implementation

```typescript
// slices/entitiesSlice.ts
export const createEntitiesSlice: StateCreator<EntitiesSlice> = (set) => ({
  todos: {},
  projects: {},
  _setTodos: (todos) => set({ todos: Object.fromEntries(todos.map(t => [t.id, t])) }),
  _applyTodoChange: (payload) => { /* ... */ },
})

// slices/syncSlice.ts
export const createSyncSlice: StateCreator<SyncSlice> = (set) => ({
  isConnected: false,
  lastSyncedAt: null,
  _setConnected: (val) => set({ isConnected: val }),
})

// store.ts - combines all slices
export const useStore = create<EntitiesSlice & SyncSlice>()((...a) => ({
  ...createEntitiesSlice(...a),
  ...createSyncSlice(...a),
}))
```

---

## Common Pitfalls

### Pitfall 1: Stale Closures in Callbacks

```typescript
// BAD: todos is captured at subscription time
const todos = store.getState().todos
channel.on('postgres_changes', (payload) => {
  console.log(todos)  // Stale! This is the old value
})

// GOOD: Always get fresh state inside callbacks
channel.on('postgres_changes', (payload) => {
  const currentTodos = store.getState().todos  // Fresh value
})
```

### Pitfall 2: Selector Returning New Reference Every Time

```typescript
// BAD: Creates new array every render, even if contents unchanged
const todoIds = useTodoStore((state) => Object.keys(state.todos))
// ^ Object.keys() creates new array every time

// GOOD: Use useShallow
const todoIds = useTodoStore(useShallow((state) => Object.keys(state.todos)))
```

### Pitfall 3: Deriving State in Components

```typescript
// BAD: Computation happens on every render
function TodoList() {
  const todos = useTodos()
  const focusTodos = todos.filter(t => t.tab === 'focus')  // Runs every render
  // ...
}

// GOOD: Move computation to selector
function TodoList() {
  const focusTodos = useTodosForTab('focus')  // Selector handles filtering
  // ...
}
```

### Pitfall 4: Subscribing to Actions

```typescript
// BAD: Actions are part of state, this re-renders when anything changes
const { todos, addTodo, deleteTodo } = useTodoStore()

// GOOD: Separate data and actions
const todos = useTodos()
const { addTodo, deleteTodo } = useTodoActions()  // Uses useShallow internally
```

---

## Performance Checklist

- [ ] Never export the raw `useStore` hook
- [ ] Always use selectors to pick specific state
- [ ] Use `useShallow` when selector returns new object/array
- [ ] Store entities normalized by ID (`Record<string, Entity>`)
- [ ] Move filtering/computation into selectors, not components
- [ ] Use `getState()` inside callbacks, not closed-over values
- [ ] Split large stores into slices for organization
- [ ] Actions should be selected separately from data

---

## Zustand References

- [Zustand - Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)
- [Zustand - Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [Redux - Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape) (concepts apply to Zustand)
- [TkDodo - Working with Zustand](https://tkdodo.eu/blog/working-with-zustand)
- [Zustand Best Practices](https://brainhub.eu/library/zustand-architecture-patterns-at-scale)

---

# Part 2: Supabase Realtime Analysis

---

## How Supabase Realtime Works

### Change Data Capture (CDC)

Supabase Realtime uses PostgreSQL's Write-Ahead Log (WAL) to detect database changes. When a row is inserted, updated, or deleted, the change is captured and broadcast to subscribed clients.

```
Database Change → WAL → Supabase Realtime Server → WebSocket → Client
```

### WALRUS: Per-User Filtering with RLS

Supabase implements a PostgreSQL function called **WALRUS** (Write Ahead Log Realtime Unified Security) to filter events based on Row Level Security policies.

For each database change, WALRUS:
1. Identifies the affected table and change type (INSERT/UPDATE/DELETE)
2. Queries a subscription table tracking connected users and their subscribed tables
3. For each subscriber, assumes their identity and checks: "can this user SELECT this row?"
4. Reports authorized viewers back to the Realtime server
5. Only those users receive the event

**Key insight:** The authorization check always uses the table's primary key, making it efficient.

---

## Performance Characteristics

### Scaling Behavior

From Supabase benchmarks, processing time scales linearly with subscriber count:

| Subscribers | Processing Time |
|-------------|-----------------|
| 1           | 11.2ms          |
| 100         | 24.5ms          |
| 1,000       | 64.7ms          |
| 10,000      | 303.8ms         |

**For single-user sessions** (like our todo app), the overhead is minimal (~11ms per change).

### Factors Affecting Performance

1. **RLS policy complexity** - Joins in RLS policies significantly slow down authorization checks
2. **Primary key size** - Smaller, fixed-width primary keys are faster
3. **Index coverage** - Filter conditions should use indexed columns
4. **Subscriber count** - Linear scaling means 10x subscribers = ~10x processing time

### Optimization Recommendations

1. Add indexes on columns used in RLS policies:
   ```sql
   CREATE INDEX idx_todos_user_id ON todos(user_id);
   ```

2. Use explicit filters in addition to RLS (reduces server-side work):
   ```typescript
   channel.on('postgres_changes', {
     event: '*',
     schema: 'public',
     table: 'todos',
     filter: `user_id=eq.${userId}`  // Server doesn't check other users
   }, callback)
   ```

3. For high-scale scenarios, consider Broadcast with triggers instead of Postgres Changes

---

## Known Limitations

### 1. DELETE Events Don't Contain Full Row Data

When RLS is enabled and replica identity is set to `full`, DELETE events only contain the **primary key**, not the full row data.

**Implication:** You cannot filter DELETEs by non-PK columns, and you won't know what was deleted beyond the ID.

**Workaround:** Store sufficient context locally (e.g., keep deleted ID to remove from store).

### 2. TRUNCATE Is Not Broadcast

Table truncations are not sent as Realtime events.

**Implication:** If you truncate a table, clients won't be notified.

**Workaround:** Avoid TRUNCATE in production; use DELETE if you need notifications.

### 3. Filter Limitations

Available filters: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`

**Not supported:** Complex queries, joins, OR conditions, pattern matching.

### 4. Connection Duration

- Without authentication: Connections last 24 hours
- With authentication: Connections can last indefinitely (until disconnect)
- Service role key: 24-hour limit

---

## The Reconnection Problem (Critical)

### The Gap Issue

When a WebSocket connection drops and reconnects, **any events that occurred during the disconnect are lost**. The Realtime server does not replay missed events.

From community discussions:
> "Standard examples of starting a subscription and letting realtime handle re-connections in the background will cause loss of data changes."

### Symptoms

- Connection drops due to network issues, tab backgrounding, device sleep
- Realtime attempts to reconnect
- Events during the gap are never delivered
- Client state becomes stale/inconsistent

### Solution: Refetch on Reconnect

The only reliable solution is to **completely refetch data** when reconnecting:

```typescript
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    // Always refetch - whether initial connect or reconnect
    await refetchAllData()
    store.getState()._setConnected(true)
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
    store.getState()._setConnected(false)
    supabase.removeChannel(channel)
    // Destroy and recreate channel
    setTimeout(() => setupSubscription(userId), retryDelay)
  }
})
```

### Additional Hardening

1. **Visibility API** - Pause/resume subscription when tab is hidden/visible
2. **Heartbeat monitoring** - Detect stale connections
3. **Periodic reconciliation** - Optionally refetch every N minutes as safety net

---

## Multi-Tenant Considerations

### RLS-Based Isolation

Supabase Realtime respects RLS policies automatically. If your RLS policy is:

```sql
CREATE POLICY "Users see own todos" ON todos
  FOR SELECT USING (auth.uid() = user_id);
```

Then Realtime will only send events to users who can SELECT that row.

### Belt-and-Suspenders Approach

Even with RLS, we recommend explicit filters:

```typescript
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'todos',
  filter: `user_id=eq.${userId}`  // Explicit + RLS
}, callback)
```

**Benefits:**
- Reduces server-side authorization work (doesn't need to check other users)
- Defense in depth if RLS is misconfigured
- Clearer intent in code

### Performance at Scale

For thousands of concurrent users, consider:

1. **Separate channels per user** - `channel(\`todos:${userId}\`)`
2. **Broadcast with triggers** - More control, better scaling
3. **Disable RLS for public data** - "The fastest security policy is one that doesn't exist"

---

## Connection Lifecycle

### Channel States

| Status | Meaning |
|--------|---------|
| `SUBSCRIBED` | Connected and receiving events |
| `CHANNEL_ERROR` | Server-side error (auth, RLS, etc.) |
| `TIMED_OUT` | Connection timed out |
| `CLOSED` | Channel was closed (by client or server) |

### Recommended Lifecycle Management

```typescript
function setupSubscription(userId: string) {
  const channel = supabase.channel(`todos:${userId}`)
  let retryCount = 0
  const maxRetries = 10

  channel.on('postgres_changes', {...}, handleChange)

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      retryCount = 0  // Reset on success
      await refetchAllData()
      store.getState()._setConnected(true)
    } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
      store.getState()._setConnected(false)
      supabase.removeChannel(channel)

      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)  // Exponential backoff, max 30s
        setTimeout(() => setupSubscription(userId), delay)
      } else {
        // Give up, show user an error
        store.getState()._setFatalError(true)
      }
    }
  })

  return channel
}
```

### Cleanup on Unmount

```typescript
useEffect(() => {
  const channel = setupSubscription(userId)

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

---

## Alternatives Considered

### 1. Polling Instead of Realtime

**Pros:**
- No WebSocket complexity
- No reconnection gap (each poll is fresh)
- Simpler error handling

**Cons:**
- Latency = poll interval
- More bandwidth (constant requests)
- No instant multi-tab sync

**Verdict:** Realtime is preferred for UX; polling is a valid fallback.

### 2. Broadcast with Triggers

Instead of `postgres_changes`, you can use triggers to send custom Broadcast messages:

```sql
CREATE OR REPLACE FUNCTION notify_todo_change()
RETURNS trigger AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'todos:' || NEW.user_id,
    TG_OP,
    TG_TABLE_NAME,
    NEW,
    OLD
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Pros:**
- More control over payload
- Better scaling characteristics
- Can include computed fields

**Cons:**
- More setup
- Must maintain triggers
- Authorization logic in triggers

**Verdict:** Overkill for our use case; `postgres_changes` is sufficient.

### 3. Third-Party Solutions (Ably, Pusher)

**Pros:**
- Battle-tested at scale
- Rich feature sets

**Cons:**
- Additional service dependency
- Cost
- Data leaves Supabase ecosystem

**Verdict:** Not needed; Supabase Realtime is capable for our requirements.

---

## Summary of Best Practices

1. **Always refetch on reconnect** - Don't trust that you received all events
2. **Use explicit filters + RLS** - Belt-and-suspenders security
3. **Index columns used in filters** - Performance at scale
4. **Handle all channel states** - Not just SUBSCRIBED
5. **Implement exponential backoff** - Don't hammer server on failures
6. **Clean up channels on unmount** - Prevent memory leaks
7. **Consider visibility API** - Pause when tab hidden
8. **Keep RLS policies simple** - Avoid joins in policies

---

## Supabase References

- [Supabase Realtime - Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Realtime - Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase Blog - Realtime RLS in PostgreSQL](https://supabase.com/blog/realtime-row-level-security-in-postgresql)
- [Supabase Realtime - Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)
- [Supabase Realtime - Error Codes](https://supabase.com/docs/guides/realtime/error_codes)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [GitHub Discussion - Reliable Realtime Updates](https://github.com/supabase/supabase/discussions/5641)

---

# Part 3: Summary

## Key Takeaways

### Zustand
1. **Never subscribe to the entire store** - Always use selectors
2. **Export hooks, not the store** - Encapsulate structure, prevent misuse
3. **Use `useShallow`** when selectors return new objects/arrays
4. **Normalize data** - Store entities by ID for O(1) lookups
5. **Use `getState()` in callbacks** - Avoid stale closures

### Supabase Realtime
1. **Always refetch on reconnect** - Events during disconnect are lost forever
2. **Use explicit filters + RLS** - Belt-and-suspenders security
3. **Handle all channel states** - Not just SUBSCRIBED
4. **Implement exponential backoff** - Don't hammer server on failures
5. **DELETE events only contain PK** - Plan accordingly

### Architecture Decision: Option A (Remote-First)
1. **Zustand is a mirror** - Not a separate source of truth
2. **Mutations go through API** - Not directly to store
3. **Realtime updates the store** - Components react automatically
4. **~100ms latency is acceptable** - For a todo app, this is fine
5. **Simpler than optimistic updates** - No rollback logic, no pending queue
