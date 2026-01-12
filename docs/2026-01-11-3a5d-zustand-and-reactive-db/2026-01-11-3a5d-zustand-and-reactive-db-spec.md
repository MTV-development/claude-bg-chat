# Zustand and Reactive DB Specification

**Created:** 2026-01-11
**Status:** Ready for Implementation

## Overview

This specification describes the implementation of a Zustand-based reactive state layer for the Todo application. The goal is to have visual components and business logic interact with a Zustand store rather than directly with Supabase, providing:

1. **Shared reactive state** - Multiple components see the same data
2. **Surgical subscriptions** - Components only re-render when their specific data changes
3. **Real-time updates** - Changes appear via Supabase Realtime without polling

## Architecture Decision: Remote-First Model

We are implementing **Option A: Remote-First with Local Cache**.

### Data Flow

```
User Action (e.g., complete todo)
         │
         ▼
    API Call to existing Next.js route (/api/todos/...)
         │
         ▼
    Database updates via Drizzle ORM
         │
         ▼
    Supabase Realtime detects change (CDC)
         │
         ▼
    Broadcasts to subscribed client (filtered by user_id + RLS)
         │
         ▼
    Zustand store receives event, updates normalized state
         │
         ▼
    Only affected components re-render (via selectors)
```

### Key Principle

**Zustand is a mirror of the database, not a separate source of truth.**

- All mutations go through the existing API routes
- Zustand does not perform writes; it only reflects what the database says
- On reconnection, we refetch from the database to ensure consistency

## Store Structure

### Internal State (Not Exported Directly)

```typescript
interface TodoStore {
  // === Normalized Entity Storage ===
  entities: {
    todos: Record<string, Todo>
    projects: Record<string, Project>
  }

  // === Connection State ===
  isConnected: boolean
  lastSyncedAt: number | null

  // === Internal Actions (called by sync layer) ===
  _setTodos: (todos: Todo[]) => void
  _setProjects: (projects: Project[]) => void
  _applyTodoChange: (payload: RealtimePayload) => void
  _applyProjectChange: (payload: RealtimePayload) => void
  _setConnected: (connected: boolean) => void
  _setLastSynced: (timestamp: number) => void
}
```

### Exported Selector Hooks (Public API)

Components use these hooks exclusively. They never import the raw store.

```typescript
// Single entity selectors
export const useTodo = (id: string) => Todo | undefined
export const useProject = (id: string) => Project | undefined

// List selectors (with useShallow to prevent unnecessary re-renders)
export const useTodosForTab = (tab: Tab) => Todo[]
export const useAllProjects = () => Project[]

// Derived data selectors
export const useTabCounts = () => { focus: number, optional: number, ... }

// Sync state selectors
export const useIsConnected = () => boolean
```

### Why Normalized Storage

Storing entities as `Record<string, Entity>` (by ID) rather than arrays:

1. **O(1) lookups** - `useTodo(id)` is instant
2. **Easy updates** - Replace single entity without array manipulation
3. **No duplicates** - ID is the key, can't have same entity twice
4. **Selector efficiency** - Can select single entity without scanning array

## Selector Design (Critical for Performance)

### The Problem We're Solving

```tsx
// BAD: Subscribes to entire store, re-renders on ANY change
const state = useStore()
```

### The Solution: Atomic Selectors

```tsx
// GOOD: Only re-renders when this specific todo changes
const todo = useTodo(todoId)

// GOOD: Only re-renders when tab contents change (with useShallow)
const todos = useTodosForTab('focus')

// GOOD: Actions never change, so this doesn't cause re-renders
const { addTodo, completeTodo } = useTodoActions()
```

### Implementation Pattern

```typescript
import { useShallow } from 'zustand/react/shallow'

// For single primitive/object values - no useShallow needed
export const useTodo = (id: string) =>
  useStore((state) => state.entities.todos[id])

// For computed arrays/objects - use useShallow
export const useTodosForTab = (tab: Tab) =>
  useStore(useShallow((state) => {
    return Object.values(state.entities.todos)
      .filter(todo => getTabForTodo(todo) === tab)
      .sort(sortTodos)
  }))

// For multiple values - use useShallow with object
export const useTabCounts = () =>
  useStore(useShallow((state) => {
    const todos = Object.values(state.entities.todos)
    return {
      focus: todos.filter(t => getTabForTodo(t) === 'focus').length,
      optional: todos.filter(t => getTabForTodo(t) === 'optional').length,
      inbox: todos.filter(t => getTabForTodo(t) === 'inbox').length,
      later: todos.filter(t => getTabForTodo(t) === 'later').length,
      done: todos.filter(t => getTabForTodo(t) === 'done').length,
    }
  }))
```

## Supabase Realtime Integration

### Subscription Setup

```typescript
function setupTodoSync(userId: string): RealtimeChannel {
  const channel = supabase.channel(`todos:${userId}`)

  // Subscribe to todos table with user filter
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'todos',
    filter: `user_id=eq.${userId}`  // Belt-and-suspenders with RLS
  }, (payload) => {
    useStore.getState()._applyTodoChange(payload)
  })

  // Subscribe to projects table
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    useStore.getState()._applyProjectChange(payload)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await initialLoad(userId)
      useStore.getState()._setConnected(true)
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      useStore.getState()._setConnected(false)
      supabase.removeChannel(channel)
      // Retry with backoff
      setTimeout(() => setupTodoSync(userId), 2000)
    }
  })

  return channel
}
```

### Change Application

```typescript
_applyTodoChange: (payload) => {
  const { eventType, new: newRow, old: oldRow } = payload

  set((state) => {
    const todos = { ...state.entities.todos }

    if (eventType === 'INSERT') {
      todos[newRow.id] = newRow as Todo
    } else if (eventType === 'UPDATE') {
      todos[newRow.id] = newRow as Todo
    } else if (eventType === 'DELETE') {
      delete todos[oldRow.id]
    }

    return { entities: { ...state.entities, todos } }
  })
}
```

### Initial Load / Reconnection

```typescript
async function initialLoad(userId: string) {
  const [todosResult, projectsResult] = await Promise.all([
    supabase.from('todos').select('*').eq('user_id', userId),
    supabase.from('projects').select('*').eq('user_id', userId),
  ])

  if (todosResult.data) {
    useStore.getState()._setTodos(todosResult.data)
  }
  if (projectsResult.data) {
    useStore.getState()._setProjects(projectsResult.data)
  }

  useStore.getState()._setLastSynced(Date.now())
}
```

## Component Integration

### Mutations: Use Existing API Routes

Components perform mutations through the existing API routes. They do NOT write to Zustand directly.

```typescript
// In a component
async function handleCompleteTodo(todoId: string) {
  setIsSaving(true)

  await fetch(`/api/todos`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: todoId, status: 'done' })
  })

  setIsSaving(false)
  // Store is updated via Realtime subscription, not here
}
```

### Optional: Per-Item Loading State

For visual feedback during the API roundtrip:

```typescript
function TodoItem({ id }: { id: string }) {
  const todo = useTodo(id)
  const [isSaving, setIsSaving] = useState(false)

  if (!todo) return null

  const isDone = todo.status === 'done'

  return (
    <div style={{ opacity: isSaving ? 0.6 : 1 }}>
      <Checkbox
        checked={isDone}
        onChange={() => handleComplete(todo.id, setIsSaving)}
      />
      {todo.title}
      {isSaving && <Spinner size="sm" />}
    </div>
  )
}
```

## Initialization

### Where to Initialize the Sync

The Realtime subscription should be initialized after authentication, typically in a React context provider or the root layout.

```typescript
// app/providers/TodoSyncProvider.tsx
'use client'

import { useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'  // Your auth hook
import { setupTodoSync } from '@/lib/sync/realtimeSync'
import { createClient } from '@/lib/supabase/client'

export function TodoSyncProvider({ children }: { children: React.ReactNode }) {
  const user = useUser()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = setupTodoSync(user.id)

    return () => {
      // Cleanup on unmount or user change
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return <>{children}</>
}
```

### Cleanup on Logout

When the user logs out, the channel cleanup happens automatically via the `useEffect` cleanup function (the `user?.id` dependency changes to `undefined`).

For explicit logout handling:

```typescript
async function handleLogout() {
  // Clear Zustand store
  useStore.getState()._setTodos([])
  useStore.getState()._setProjects([])
  useStore.getState()._setConnected(false)

  // Sign out (channel cleanup handled by provider)
  await supabase.auth.signOut()
}
```

## File Structure

```
lib/
  stores/
    todoStore.ts           # Store definition with slices
    selectors.ts           # Exported selector hooks
    types.ts               # TypeScript interfaces
  sync/
    realtimeSync.ts        # Supabase subscription setup
    initialLoad.ts         # Initial data fetch
  utils/
    todoHelpers.ts         # getTabForTodo, sortTodos, etc.
```

## Migration Strategy

### Phase 1: Add Store Infrastructure
- Create Zustand store with normalized structure
- Create selector hooks
- Do NOT change any components yet

### Phase 2: Add Realtime Sync
- Implement Supabase Realtime subscription
- Wire up initial load
- Test that store reflects database state

### Phase 3: Migrate Components
- Update TodoList to use selectors instead of local state + polling
- Remove polling logic
- Keep API calls for mutations unchanged

### Phase 4: Cleanup
- Remove old state management code from components
- Remove polling interval

## Testing Considerations

1. **Selector isolation** - Test that selectors return correct data
2. **Change application** - Test that Realtime payloads update store correctly
3. **Reconnection** - Test that disconnect/reconnect refetches data
4. **Component re-renders** - Verify components only re-render when their data changes

## Prerequisites

Before implementation, install Zustand:

```bash
npm install zustand
```

## References

### Project Documentation

- [Supabase & Zustand Subscription Analysis](./2026-01-11-3a5d-supabase-subscription-analysis.md) - Detailed research on Zustand selectors, Supabase Realtime behavior, pitfalls, and best practices

### External Resources

- [Zustand - Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)
- [Zustand - Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [Supabase Realtime - Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Realtime - Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase Blog - Realtime RLS](https://supabase.com/blog/realtime-row-level-security-in-postgresql)
