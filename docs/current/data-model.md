# GTD Todo Manager - Data Model

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## Overview

The application uses a JSON file-based storage system. All data is persisted in `data/todos.json` with automatic migration support from older schema versions.

## Schema Version

**Current Version**: `2.0`

The version field enables automatic migration when the schema evolves. Version 2.0 introduced GTD-specific fields like `nextAction`, `status`, and `postponeCount`.

## Core Data Structures

### TodoData (Root Object)

The top-level structure containing all application data.

```typescript
interface TodoData {
  version: '2.0'
  lastModified: string          // ISO timestamp of last save
  lastAutoReview: string | null // Timestamp of last auto-review (reserved for future use)
  items: TodoItem[]             // All tasks
  activityLog: ActivityLogEntry[] // Audit trail (max 1000 entries)
}
```

**Location**: `scripts/gtd/lib/types.ts`

### TodoItem

Individual task representation with GTD-specific fields.

```typescript
interface TodoItem {
  id: string                    // 8-character hex identifier
  title: string                 // Raw capture text ("Plan vacation")
  nextAction: string | null     // Clarified next step ("Search flights to Hawaii")
  status: ItemStatus            // 'inbox' | 'active' | 'done' | 'someday'
  completed: boolean            // Legacy compatibility (derived from status === 'done')
  priority: Priority            // 'high' | 'medium' | 'low'
  project: string | null        // Project grouping (e.g., "Home Renovation")
  dueDate: string | null        // Due date in YYYY-MM-DD format
  createdAt: string             // ISO timestamp when created
  completedAt: string | null    // ISO timestamp when completed
  postponeCount: number         // Number of times task was postponed
  tags: string[]                // Array of tag strings
}
```

### Type Enumerations

```typescript
type ItemStatus = 'inbox' | 'active' | 'done' | 'someday'
type Priority = 'high' | 'medium' | 'low'
```

### ActivityLogEntry

Audit trail for task operations.

```typescript
interface ActivityLogEntry {
  timestamp: string             // ISO timestamp
  action: ActivityAction        // Type of action performed
  itemId: string                // ID of affected task
  itemTitle: string             // Title at time of action
  metadata?: {                  // Optional action-specific data
    previousDueDate?: string
    newDueDate?: string
    reason?: string
    field?: string
    oldValue?: string
    newValue?: string
  }
}

type ActivityAction =
  | 'created'
  | 'completed'
  | 'uncompleted'
  | 'clarified'
  | 'postponed'
  | 'deleted'
  | 'updated'
```

## Field Semantics

### ID Generation
- 8 random hexadecimal characters
- Generated via `crypto.randomBytes(4).toString('hex')`
- Must be unique within the items array

### Title vs NextAction
| Field | Purpose | Example |
|-------|---------|---------|
| `title` | Original capture (what user said) | "Plan vacation" |
| `nextAction` | Clarified physical action | "Search flights to Hawaii for March" |

Tasks with `nextAction === null` appear in the Inbox tab.

### Status Transitions

```
       ┌─────────────────────────────────────────┐
       │                                         │
       ▼                                         │
    inbox ───clarify──▶ active ───complete──▶ done
       │                   │                     │
       │                   │                     │
       │                   ▼                     │
       │                someday                  │
       │                   │                     │
       └───────────────────┴─────────────────────┘
                    (uncomplete)
```

### Due Date Format
- Always stored as `YYYY-MM-DD` string
- `null` means no due date
- Parsed and compared as strings (lexicographic comparison works for this format)

### Postpone Count
- Starts at `0` for new tasks
- Incremented each time `postpone` command is called
- At `3+`, UI shows warning badge and confirmation modal

## Storage Implementation

### File Location
```
data/todos.json
```

### Read/Write Operations

**Location**: `scripts/gtd/lib/store.ts`

```typescript
// Load data with auto-migration
function loadTodos(): TodoData

// Save data with timestamp update
function saveTodos(data: TodoData): void

// Generate unique ID
function generateId(): string
```

### Auto-Migration

When loading data, the system checks the `version` field:

```typescript
function ensureV2(data: any): TodoData {
  if (data.version === '2.0') return data

  // Migrate from v1.0 or unversioned
  return {
    version: '2.0',
    lastModified: new Date().toISOString(),
    lastAutoReview: null,
    items: data.items.map(migrateItem),
    activityLog: data.activityLog || []
  }
}

function migrateItem(item: any): TodoItem {
  return {
    ...item,
    nextAction: item.nextAction ?? item.title,  // Copy title to nextAction
    status: item.status ?? (item.completed ? 'done' : 'active'),
    postponeCount: item.postponeCount ?? 0,
    tags: item.tags ?? []
  }
}
```

## Activity Log

### Purpose
Provides an audit trail of all operations for debugging and potential future features (undo, analytics).

### Constraints
- Maximum 1000 entries (oldest removed when exceeded)
- Entries are append-only (never modified)
- Stored within the same JSON file

### Example Entries

**Task Created**:
```json
{
  "timestamp": "2025-01-08T10:30:00.000Z",
  "action": "created",
  "itemId": "a1b2c3d4",
  "itemTitle": "Buy groceries"
}
```

**Task Postponed**:
```json
{
  "timestamp": "2025-01-08T14:00:00.000Z",
  "action": "postponed",
  "itemId": "a1b2c3d4",
  "itemTitle": "Buy groceries",
  "metadata": {
    "previousDueDate": "2025-01-08",
    "newDueDate": "2025-01-10"
  }
}
```

**Task Clarified**:
```json
{
  "timestamp": "2025-01-08T11:00:00.000Z",
  "action": "clarified",
  "itemId": "e5f6g7h8",
  "itemTitle": "Plan vacation",
  "metadata": {
    "field": "nextAction",
    "newValue": "Search flights to Hawaii"
  }
}
```

## Tab Filtering Logic

Each tab applies specific filters to the items array:

| Tab | Filter Criteria |
|-----|----------------|
| **Today** | `status === 'active' && nextAction !== null && (dueDate <= today OR dueDate === null)` |
| **Optional** | `(status === 'active' OR status === 'someday') && nextAction !== null && dueDate > today` |
| **Inbox** | `status === 'inbox' OR nextAction === null` |
| **Projects** | Grouped by `project` field (non-null) |
| **Done** | `status === 'done'` |

### Sorting

1. **Priority**: high → medium → low
2. **Due Date**: Overdue first, then by date ascending
3. **Created Date**: Oldest first (within same priority/due date)

## Sample Data File

```json
{
  "version": "2.0",
  "lastModified": "2025-01-08T15:30:00.000Z",
  "lastAutoReview": null,
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Buy groceries",
      "nextAction": "Go to Trader Joe's and buy milk, eggs, bread",
      "status": "active",
      "completed": false,
      "priority": "medium",
      "project": null,
      "dueDate": "2025-01-08",
      "createdAt": "2025-01-07T10:00:00.000Z",
      "completedAt": null,
      "postponeCount": 0,
      "tags": ["errands"]
    },
    {
      "id": "e5f6g7h8",
      "title": "Plan vacation",
      "nextAction": null,
      "status": "inbox",
      "completed": false,
      "priority": "low",
      "project": "2025 Travel",
      "dueDate": null,
      "createdAt": "2025-01-08T09:00:00.000Z",
      "completedAt": null,
      "postponeCount": 0,
      "tags": []
    }
  ],
  "activityLog": [
    {
      "timestamp": "2025-01-07T10:00:00.000Z",
      "action": "created",
      "itemId": "a1b2c3d4",
      "itemTitle": "Buy groceries"
    }
  ]
}
```

## Related Documentation

- [Overview](./overview.md) - Project introduction
- [High-Level Concept](./high-level-concept.md) - GTD workflow design
- [Technical Architecture](./technical-architecture.md) - System components
