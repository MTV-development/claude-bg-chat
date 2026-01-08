# Implementation Plan: New Task Model

## High-Level Summary

We're updating the task model to use two explicit boolean properties (`hasDeadline`, `canDoAnytime`) instead of inferring task categorization from `dueDate` and `status`. This affects:

1. **Data model** - Add two new properties to `TodoItem`
2. **Tab logic** - Rewrite `getItemTab()` and `filterByTab()`
3. **Tab naming** - "Today" → "Focus", "Optional" → "Might Do"
4. **Task creation** - Prompt users for the two new properties
5. **Migration** - Convert existing tasks to new model

---

## Implementation Tasks

### 1. Update Type Definitions
**File:** `scripts/gtd/lib/types.ts`

- Add `hasDeadline: boolean` to `TodoItem`
- Add `canDoAnytime: boolean` to `TodoItem`
- Change `TabType` from `'focus' | 'optional'` to `'focus' | 'mightdo'`
- Bump data version to "3.0"

### 2. Update Store Logic
**File:** `scripts/gtd/lib/store.ts`

- Rewrite `getItemTab()`:
  - **Focus**: `hasDeadline && dueDate <= today`
  - **Might Do**: `canDoAnytime === true`
  - **Inbox**: `!hasDeadline && !canDoAnytime`
  - **Done**: `status === 'done'`
  - **Projects**: unchanged (project grouping)
- Update `filterByTab()` to match
- Add migration function v2 → v3:
  - `hasDeadline = dueDate !== null`
  - `canDoAnytime = status === 'someday' || (!dueDate && status !== 'inbox')`

### 3. Update UI Tab Labels
**File:** `components/TodoList.tsx`

- Change tab display: "Today" → "Focus"
- Change tab display: "Optional" → "Might Do"
- Update tab key from `optional` to `mightdo`

### 4. Update Add Item Modal
**File:** `components/AddItemModal.tsx`

- Add question: "Does this have a deadline?" (yes/no)
- Add question: "Can this be done anytime?" (yes/no)
- Only show date picker if `hasDeadline === true`
- Pass new properties to API

### 5. Update Add API Route
**File:** `app/api/todos/add/route.ts`

- Accept `hasDeadline` and `canDoAnytime` in request body
- Set defaults based on provided values
- Validate: if `hasDeadline === true`, require `dueDate`

### 6. Update CLI Add Command
**File:** `scripts/gtd/commands/add.ts`

- Add `--has-deadline` flag
- Add `--can-do-anytime` flag
- Update help text

### 7. Update Other CLI Commands
**Files:** `scripts/gtd/commands/update.ts`, `list.ts`

- Allow updating `hasDeadline` and `canDoAnytime`
- Update list filtering to use new tab names

### 8. Update API Filter Endpoints
**File:** `app/api/todos/route.ts`

- Accept `mightdo` as tab parameter (in addition to legacy `optional`)
- Update filter logic to use new properties

### 9. Update Tests (if any)
- Update any existing tests to use new properties and tab names

### 10. Data Migration
**File:** `scripts/gtd/lib/store.ts`

- Auto-migrate on load when version < "3.0"
- Log migration activity
- Preserve all existing data

---

## Property Behavior Matrix

| hasDeadline | canDoAnytime | Tab |
|-------------|--------------|-----|
| true | true | Might Do (until deadline reached, then Focus) |
| true | false | Focus (when deadline reached) |
| false | true | Might Do |
| false | false | Inbox |

Note: Tasks with `hasDeadline && canDoAnytime` appear in "Might Do" until their deadline is reached, then move to "Focus".
