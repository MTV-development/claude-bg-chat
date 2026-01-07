# GTD Implementation Plan

## Current Architecture

```
claude-bg-chat/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Chat API (Claude CLI adapter)
│   │   └── todos/route.ts         # Todo CRUD API
│   ├── layout.tsx
│   └── page.tsx                   # Two-panel layout (Chat + TodoList)
├── components/
│   └── TodoList.tsx               # Right panel component
├── data/
│   └── todos.json                 # Todo data store
├── lib/
│   ├── adapters/
│   │   ├── cli-adapter.ts         # Claude Code CLI integration
│   │   └── types.ts
│   └── services/
│       └── logger.ts              # Session logging
├── .claude/
│   └── skills/
│       └── todo-manager/
│           └── SKILL.md           # Claude skill definition
└── docs/
```

## Target Architecture

```
claude-bg-chat/
├── scripts/
│   └── gtd/
│       ├── cli.ts                 # Entry point
│       ├── commands/
│       │   ├── add.ts
│       │   ├── list.ts
│       │   ├── complete.ts
│       │   ├── uncomplete.ts
│       │   ├── remove.ts
│       │   ├── update.ts
│       │   ├── postpone.ts        # Phase 2
│       │   ├── clarify.ts         # Phase 2
│       │   └── review.ts          # Phase 5
│       ├── lib/
│       │   ├── store.ts           # Single read/write layer
│       │   └── types.ts           # Shared types
│       └── __tests__/
│           ├── add.test.ts
│           ├── list.test.ts
│           └── ...
├── app/
│   └── api/
│       └── todos/route.ts         # Uses store.ts (not direct file access)
└── .claude/
    └── skills/
        └── todo-manager/
            └── SKILL.md           # Documents CLI usage (no Read/Write)
```

---

## Phase 1: CLI Tools Foundation (Re-implement Current System)

**Goal:** Replace direct Read/Write file access with testable CLI tools.
Same functionality, new architecture. Test thoroughly before GTD changes.

### 1.1 Setup Test Infrastructure

**Tasks:**
- [ ] Install Jest: `npm install -D jest ts-jest @types/jest`
- [ ] Create `jest.config.js`
- [ ] Create `scripts/gtd/__tests__/` directory
- [ ] Add npm scripts: `"test": "jest"`, `"test:watch": "jest --watch"`
- [ ] Create test data fixtures

**File:** `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts/gtd'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

---

### 1.2 Create Store Module

**File:** `scripts/gtd/lib/store.ts`

Single source of truth for reading/writing todos.json.

```typescript
import { promises as fs } from 'fs';
import path from 'path';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  tags: string[];
}

export interface TodoData {
  version: string;
  lastModified: string;
  items: TodoItem[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'todos.json');

export async function loadTodos(): Promise<TodoData>;
export async function saveTodos(data: TodoData): Promise<void>;
export function generateId(): string;
```

**Tasks:**
- [ ] Create `scripts/gtd/lib/types.ts` with interfaces
- [ ] Create `scripts/gtd/lib/store.ts` with load/save functions
- [ ] Handle file not found (create empty structure)
- [ ] Handle invalid JSON (throw meaningful error)
- [ ] Auto-update `lastModified` on save

**Tests:** `scripts/gtd/__tests__/store.test.ts`
- [ ] loadTodos returns data when file exists
- [ ] loadTodos creates empty structure when file missing
- [ ] saveTodos writes valid JSON
- [ ] saveTodos updates lastModified
- [ ] generateId returns unique 8-char hex

---

### 1.3 Create CLI Entry Point

**File:** `scripts/gtd/cli.ts`

```typescript
#!/usr/bin/env npx ts-node
import { add } from './commands/add';
import { list } from './commands/list';
import { complete } from './commands/complete';
// ...

const [command, ...args] = process.argv.slice(2);

async function main() {
  try {
    let result;
    switch (command) {
      case 'add': result = await add(args); break;
      case 'list': result = await list(args); break;
      case 'complete': result = await complete(args); break;
      case 'uncomplete': result = await uncomplete(args); break;
      case 'remove': result = await remove(args); break;
      case 'update': result = await update(args); break;
      default: result = { error: `Unknown command: ${command}` };
    }
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
```

**Tasks:**
- [ ] Create `scripts/gtd/cli.ts`
- [ ] Parse command and args
- [ ] Route to command handlers
- [ ] Output JSON to stdout
- [ ] Handle errors gracefully

---

### 1.4 Implement `add` Command

**File:** `scripts/gtd/commands/add.ts`

```bash
# Usage
node scripts/gtd/cli.ts add "Buy groceries"
node scripts/gtd/cli.ts add "Call dentist" --priority high
node scripts/gtd/cli.ts add "Pay bills" --due 2026-01-15
node scripts/gtd/cli.ts add "Meeting" --priority high --due tomorrow

# Output
{"success":true,"item":{"id":"a1b2c3d4","title":"Buy groceries",...}}
```

**Tasks:**
- [ ] Parse title from args
- [ ] Parse `--priority` flag (default: medium)
- [ ] Parse `--due` flag (support: YYYY-MM-DD, "today", "tomorrow")
- [ ] Parse `--tags` flag (comma-separated)
- [ ] Generate ID, create item, save
- [ ] Return created item as JSON

**Tests:** `scripts/gtd/__tests__/add.test.ts`
- [ ] Adds item with title only
- [ ] Adds item with priority
- [ ] Adds item with due date (ISO format)
- [ ] Adds item with due date (relative: tomorrow)
- [ ] Adds item with tags
- [ ] Fails gracefully on missing title

---

### 1.5 Implement `list` Command

**File:** `scripts/gtd/commands/list.ts`

```bash
# Usage
node scripts/gtd/cli.ts list
node scripts/gtd/cli.ts list --completed
node scripts/gtd/cli.ts list --pending
node scripts/gtd/cli.ts list --priority high

# Output
{"items":[...],"count":5}
```

**Tasks:**
- [ ] Load all items
- [ ] Filter by `--completed` / `--pending`
- [ ] Filter by `--priority`
- [ ] Return items array and count

**Tests:** `scripts/gtd/__tests__/list.test.ts`
- [ ] Returns all items
- [ ] Filters completed only
- [ ] Filters pending only
- [ ] Filters by priority
- [ ] Returns empty array when no items

---

### 1.6 Implement `complete` Command

**File:** `scripts/gtd/commands/complete.ts`

```bash
# Usage
node scripts/gtd/cli.ts complete a1b2c3d4
node scripts/gtd/cli.ts complete "Buy groceries"  # Match by title

# Output
{"success":true,"item":{...}}
```

**Tasks:**
- [ ] Find item by ID or title (partial match)
- [ ] Set `completed: true`
- [ ] Set `completedAt` timestamp
- [ ] Save and return updated item
- [ ] Error if not found

**Tests:** `scripts/gtd/__tests__/complete.test.ts`
- [ ] Completes by ID
- [ ] Completes by exact title
- [ ] Completes by partial title match
- [ ] Fails if item not found
- [ ] Fails if already completed (or succeeds silently?)

---

### 1.7 Implement `uncomplete` Command

**File:** `scripts/gtd/commands/uncomplete.ts`

```bash
node scripts/gtd/cli.ts uncomplete a1b2c3d4
{"success":true,"item":{...}}
```

**Tasks:**
- [ ] Find item by ID or title
- [ ] Set `completed: false`
- [ ] Set `completedAt: null`
- [ ] Save and return updated item

**Tests:** `scripts/gtd/__tests__/uncomplete.test.ts`
- [ ] Uncompletes by ID
- [ ] Uncompletes by title
- [ ] Fails if not found

---

### 1.8 Implement `remove` Command

**File:** `scripts/gtd/commands/remove.ts`

```bash
node scripts/gtd/cli.ts remove a1b2c3d4
{"success":true,"removed":{"id":"a1b2c3d4","title":"..."}}
```

**Tasks:**
- [ ] Find item by ID or title
- [ ] Remove from items array
- [ ] Save and return removed item
- [ ] Error if not found

**Tests:** `scripts/gtd/__tests__/remove.test.ts`
- [ ] Removes by ID
- [ ] Removes by title
- [ ] Fails if not found

---

### 1.9 Implement `update` Command

**File:** `scripts/gtd/commands/update.ts`

```bash
node scripts/gtd/cli.ts update a1b2c3d4 --title "New title"
node scripts/gtd/cli.ts update a1b2c3d4 --priority high
node scripts/gtd/cli.ts update a1b2c3d4 --due 2026-01-20
{"success":true,"item":{...}}
```

**Tasks:**
- [ ] Find item by ID
- [ ] Update provided fields only
- [ ] Save and return updated item

**Tests:** `scripts/gtd/__tests__/update.test.ts`
- [ ] Updates title
- [ ] Updates priority
- [ ] Updates due date
- [ ] Updates multiple fields
- [ ] Fails if not found

---

### 1.10 Update API Routes to Use Store

**File:** `app/api/todos/route.ts`

**Tasks:**
- [ ] Import `loadTodos`, `saveTodos` from store
- [ ] Replace direct `fs.readFile` with `loadTodos()`
- [ ] Replace direct `fs.writeFile` with `saveTodos()`
- [ ] Ensure API and CLI use same store module

**Tests:** (existing API tests should still pass)

---

### 1.11 Update Skill Definition

**File:** `.claude/skills/todo-manager/SKILL.md`

```markdown
---
name: todo-manager
description: Manages your personal todo list via CLI commands.
allowed-tools: Bash
---

# Todo Manager

## Commands

Use the Bash tool to run these commands:

### Add a task
\`\`\`bash
node scripts/gtd/cli.ts add "Task title"
node scripts/gtd/cli.ts add "Task title" --priority high --due tomorrow
\`\`\`

### List tasks
\`\`\`bash
node scripts/gtd/cli.ts list
node scripts/gtd/cli.ts list --pending
\`\`\`

### Complete a task
\`\`\`bash
node scripts/gtd/cli.ts complete <id-or-title>
\`\`\`

... etc
```

**Tasks:**
- [ ] Change `allowed-tools` from `Read, Write` to `Bash`
- [ ] Document all CLI commands with examples
- [ ] Document JSON output format
- [ ] Remove old Read/Write instructions

---

### 1.12 Integration Testing

**Manual Tests:**
- [ ] Run each CLI command manually, verify output
- [ ] Use chat to add task, verify in panel
- [ ] Complete task in panel, verify via CLI
- [ ] Complete task via chat, verify in panel

**Automated Integration:** `scripts/gtd/__tests__/integration.test.ts`
- [ ] Full workflow: add → list → complete → list
- [ ] Concurrent access simulation

---

### Phase 1 Checklist

```
[ ] Jest setup working
[ ] store.ts implemented + tested
[ ] cli.ts entry point working
[ ] add command + tests
[ ] list command + tests
[ ] complete command + tests
[ ] uncomplete command + tests
[ ] remove command + tests
[ ] update command + tests
[ ] API routes updated to use store
[ ] Skill updated for CLI usage
[ ] Manual testing passed
[ ] Integration tests passed
```

---

## Phase 2: GTD Data Model + Tabs

**Goal:** Extend the CLI tools with GTD-specific features. Add tabs to UI.

### 2.1 Update Data Schema

**File:** `data/todos.json`

```json
{
  "version": "2.0",
  "lastModified": "...",
  "lastAutoReview": null,
  "items": [...],
  "activityLog": [...]
}
```

**New Item Schema:**
```typescript
interface GTDItem {
  id: string;
  title: string;              // Raw capture
  nextAction: string | null;  // Clarified action (null = inbox)
  status: 'inbox' | 'active' | 'done' | 'someday';
  priority: 'high' | 'medium' | 'low';
  project: string | null;
  dueDate: string | null;     // ISO date, tickler
  createdAt: string;
  completedAt: string | null;
  postponeCount: number;      // Track postponements
}

interface ActivityLogEntry {
  id: string;
  itemId: string;
  action: 'created' | 'postponed' | 'completed' | 'clarified' | 'deleted';
  timestamp: string;
  details: {
    fromDate?: string;
    toDate?: string;
    reason?: string;
  };
}

interface GTDData {
  version: string;
  lastModified: string;
  lastAutoReview: string | null;
  items: GTDItem[];
  activityLog: ActivityLogEntry[];
}
```

**Tasks:**
- [ ] Create `lib/types/gtd.ts` with TypeScript interfaces
- [ ] Create migration script `scripts/migrate-v1-to-v2.ts`
- [ ] Add `postponeCount` field to items
- [ ] Add `nextAction` field (default: copy from title for existing)
- [ ] Add `activityLog` array
- [ ] Add `lastAutoReview` field

**Tests:**
- [ ] `__tests__/data/migration.test.ts` - v1 to v2 migration
- [ ] `__tests__/data/schema.test.ts` - validate GTDData structure

---

### 2.2 Add `list --tab` to CLI

**File:** `scripts/gtd/commands/list.ts`

```bash
node scripts/gtd/cli.ts list --tab focus     # Due today or overdue
node scripts/gtd/cli.ts list --tab optional  # Future/no deadline
node scripts/gtd/cli.ts list --tab inbox     # Needs clarification
node scripts/gtd/cli.ts list --tab done      # Completed
```

**Tasks:**
- [ ] Add `--tab` flag parsing
- [ ] Implement filter logic per tab
- [ ] Update store types for GTD fields

**Tests:**
- [ ] `__tests__/list.test.ts` - Tab filtering

---

### 2.3 Add `clarify` Command

**File:** `scripts/gtd/commands/clarify.ts`

```bash
node scripts/gtd/cli.ts clarify abc123 --next-action "Call dentist office"
node scripts/gtd/cli.ts clarify abc123 --next-action "..." --project "Health"
```

**Tasks:**
- [ ] Set nextAction on item
- [ ] Move status from inbox to active
- [ ] Optionally set project
- [ ] Log 'clarified' activity

**Tests:**
- [ ] `__tests__/clarify.test.ts` - Sets nextAction
- [ ] `__tests__/clarify.test.ts` - Changes status to active

---

### 2.4 Update API Routes for Tabs

**File:** `app/api/todos/route.ts`

**New Endpoints:**
```typescript
GET    /api/todos              // List all items
GET    /api/todos?tab=focus    // Filter by tab
GET    /api/todos?tab=optional
GET    /api/todos?tab=inbox
GET    /api/todos?tab=done
GET    /api/todos?project=X    // Filter by project
PATCH  /api/todos              // Update item (complete, clarify, etc.)
POST   /api/todos/postpone     // Postpone item (new)
GET    /api/activity           // Get activity log (new)
```

**Tasks:**
- [ ] Add tab filtering logic to GET
- [ ] Create `POST /api/todos/postpone` endpoint
- [ ] Create `GET /api/activity` endpoint
- [ ] Update PATCH to handle clarification (setting nextAction)
- [ ] Add activity logging to all mutations

**Filter Logic:**
```typescript
function filterByTab(items: GTDItem[], tab: string): GTDItem[] {
  const today = new Date().toISOString().split('T')[0];

  switch (tab) {
    case 'focus':
      // Due today or overdue, has nextAction
      return items.filter(i =>
        i.status === 'active' &&
        i.nextAction &&
        i.dueDate &&
        i.dueDate <= today
      );
    case 'optional':
      // Has nextAction, future or no deadline
      return items.filter(i =>
        i.status === 'active' &&
        i.nextAction &&
        (!i.dueDate || i.dueDate > today)
      );
    case 'inbox':
      return items.filter(i => i.status === 'inbox' || !i.nextAction);
    case 'done':
      return items.filter(i => i.status === 'done');
    default:
      return items.filter(i => i.status !== 'done');
  }
}
```

**Tests:**
- [ ] `__tests__/api/todos.test.ts` - CRUD operations
- [ ] `__tests__/api/todos-filter.test.ts` - Tab filtering logic
- [ ] `__tests__/api/postpone.test.ts` - Postpone endpoint
- [ ] `__tests__/api/activity.test.ts` - Activity log endpoint

---

### 2.5 Update TodoList Component for Tabs

**File:** `components/TodoList.tsx`

**Tasks:**
- [ ] Add tab state: `const [activeTab, setActiveTab] = useState('focus')`
- [ ] Create `TabBar` component with badges
- [ ] Update fetch to include `?tab=` parameter
- [ ] Show `nextAction` instead of `title` in Focus/Optional
- [ ] Show `title` in Inbox (pending clarification)
- [ ] Add overdue styling for Focus items

**Tests:**
- [ ] `__tests__/components/TodoList.test.tsx` - Renders tabs
- [ ] `__tests__/components/TodoList.test.tsx` - Tab switching
- [ ] `__tests__/components/TodoList.test.tsx` - Correct items per tab

---

### 2.6 Update Skill for GTD Commands

**File:** `.claude/skills/todo-manager/SKILL.md`

**Tasks:**
- [ ] Add `clarify` command documentation
- [ ] Add `--tab` flag documentation
- [ ] Document smart routing (clear → active, vague → inbox)
- [ ] Add examples for GTD workflow

---

### Phase 2 Checklist

```
[ ] Migration script working + tested
[ ] Store updated with GTD types
[ ] list --tab working + tested
[ ] clarify command working + tested
[ ] API routes support tab filtering
[ ] TodoList has tab UI
[ ] Skill updated for GTD commands
```

---

## Phase 3: Postpone Flow

### 3.1 Add `postpone` Command

**File:** `scripts/gtd/commands/postpone.ts`

```bash
node scripts/gtd/cli.ts postpone abc123 --days 1
node scripts/gtd/cli.ts postpone abc123 --days 7
```

**Tasks:**
- [ ] Parse `--days` flag
- [ ] Update item's dueDate to today + days
- [ ] Increment postponeCount
- [ ] Log 'postponed' activity with fromDate/toDate
- [ ] Return warning if postponeCount >= 3

**Tests:**
- [ ] `__tests__/postpone.test.ts` - Basic postpone
- [ ] `__tests__/postpone.test.ts` - Increments count
- [ ] `__tests__/postpone.test.ts` - Activity logging
- [ ] `__tests__/postpone.test.ts` - Warning at 3+

---

### 3.2 Postpone API

**File:** `app/api/todos/postpone/route.ts`

```typescript
POST /api/todos/postpone
Body: { id: string, days: number }

Response: {
  success: boolean,
  item: GTDItem,
  postponeCount: number,
  needsConfirmation: boolean  // true if 3+ postponements
}
```

**Tasks:**
- [ ] Create postpone route
- [ ] Update item's `dueDate` to today + days
- [ ] Increment `postponeCount`
- [ ] Log activity with fromDate/toDate
- [ ] Return `needsConfirmation` flag if count >= 3

**Tests:**
- [ ] `__tests__/api/postpone.test.ts` - Basic postpone
- [ ] `__tests__/api/postpone.test.ts` - Activity logging
- [ ] `__tests__/api/postpone.test.ts` - 3+ triggers confirmation flag

---

### 3.3 Postpone UI Component

**File:** `components/PostponeDropdown.tsx`

```typescript
interface Props {
  itemId: string;
  postponeCount: number;
  onPostpone: (days: number) => void;
  onRemove: () => void;
}
```

**Tasks:**
- [ ] Create dropdown component
- [ ] Options: +1, +2, +3, +7, +14, +30 days
- [ ] Show postpone count badge if > 0
- [ ] Trigger confirmation modal at 3+ postponements
- [ ] Integrate into TodoList item rendering

**Tests:**
- [ ] `__tests__/components/PostponeDropdown.test.tsx` - Renders options
- [ ] `__tests__/components/PostponeDropdown.test.tsx` - Calls onPostpone
- [ ] `__tests__/components/PostponeDropdown.test.tsx` - Shows badge
- [ ] `__tests__/components/PostponeDropdown.test.tsx` - Confirmation at 3+

---

### 3.4 Confirmation Modal

**File:** `components/ConfirmationModal.tsx`

**Tasks:**
- [ ] Create reusable modal component
- [ ] "Keep it" / "Remove" buttons
- [ ] Use for postpone confirmation
- [ ] Animate in/out

**Tests:**
- [ ] `__tests__/components/ConfirmationModal.test.tsx` - Renders
- [ ] `__tests__/components/ConfirmationModal.test.tsx` - Button callbacks

---

### Phase 3 Checklist

```
[ ] postpone CLI command + tests
[ ] postpone API endpoint + tests
[ ] PostponeDropdown component + tests
[ ] ConfirmationModal component + tests
[ ] Integration: postpone from UI works
```

---

## Phase 4: Projects Tab

### 4.1 Add `projects` Command

**File:** `scripts/gtd/commands/projects.ts`

```bash
node scripts/gtd/cli.ts projects              # List all projects
node scripts/gtd/cli.ts projects "Health"     # List tasks in project
```

**Tasks:**
- [ ] Aggregate items by project field
- [ ] Return project list with counts
- [ ] Filter by project name

**Tests:**
- [ ] `__tests__/projects.test.ts` - Lists projects
- [ ] `__tests__/projects.test.ts` - Shows project tasks

---

### 4.2 Projects API

**File:** `app/api/projects/route.ts`

```typescript
GET /api/projects
Response: {
  projects: Array<{
    name: string;
    taskCount: number;
    completedCount: number;
    hasNextAction: boolean;
  }>
}
```

**Tasks:**
- [ ] Create projects endpoint
- [ ] Aggregate items by `project` field
- [ ] Calculate counts and status
- [ ] Sort by activity or alphabetically

**Tests:**
- [ ] `__tests__/api/projects.test.ts` - Lists projects
- [ ] `__tests__/api/projects.test.ts` - Correct counts
- [ ] `__tests__/api/projects.test.ts` - Empty project handling

---

### 4.3 Projects Tab UI

**File:** `components/ProjectsView.tsx`

**Tasks:**
- [ ] Project list view with task counts
- [ ] Click project → show tasks
- [ ] Back button to project list
- [ ] "No next action" warning indicator
- [ ] Progress bar per project

**Tests:**
- [ ] `__tests__/components/ProjectsView.test.tsx` - List render
- [ ] `__tests__/components/ProjectsView.test.tsx` - Drill down
- [ ] `__tests__/components/ProjectsView.test.tsx` - Back navigation

---

### Phase 4 Checklist

```
[ ] projects CLI command + tests
[ ] projects API endpoint + tests
[ ] ProjectsView component + tests
[ ] Tab integration working
```

---

## Phase 5: Smart Capture (AI Routing)

### 5.1 Update Skill for Routing

**File:** `.claude/skills/todo-manager/SKILL.md`

**Routing Rules:**
```
Clear action items → status: 'active', nextAction: <parsed>
  Examples: "buy milk", "call dentist", "send email to John"

Vague/project items → status: 'inbox', nextAction: null
  Examples: "think about career", "plan vacation", "organize garage"

Items with dates → Extract and set dueDate
  Examples: "call mom tomorrow", "review report by Friday"
```

**Tasks:**
- [ ] Document routing decision tree
- [ ] Add examples for each route
- [ ] Update skill to set status correctly
- [ ] AI suggests nextAction for vague items

**Tests:**
- [ ] Manual testing with various inputs
- [ ] Document test cases in skill file

---

### 5.2 Clarification Flow

**Skill behavior for inbox items:**
```
User: "prepare for performance review"
AI: Added to Inbox. What's one concrete next step?
    Maybe "List accomplishments from Q4"?
User: "yeah"
AI: ✓ Moved to Focus: "List accomplishments from Q4"
    Project: "Performance Review Prep"
```

**Tasks:**
- [ ] Update skill to offer clarification
- [ ] Support "clarify <item>" command
- [ ] Move item from inbox to active on clarification

---

### Phase 5 Checklist

```
[ ] Skill routing rules documented
[ ] Manual testing of routing
[ ] Clarification flow working via chat
```

---

## Phase 6: Background Review Agent

### 6.1 Add `review` Command

**File:** `scripts/gtd/commands/review.ts`

```bash
node scripts/gtd/cli.ts review --status       # Check if review needed
node scripts/gtd/cli.ts review --run          # Run review, return issues
```

**Tasks:**
- [ ] Check lastAutoReview timestamp
- [ ] Return needsReview boolean
- [ ] Run review checks, return clarifications

**Tests:**
- [ ] `__tests__/review.test.ts` - Status check
- [ ] `__tests__/review.test.ts` - Detects issues
- [ ] `__tests__/review.test.ts` - Returns empty when clean

---

### 6.2 Review Logic

**File:** `lib/services/review-agent.ts`

```typescript
interface ReviewResult {
  hasIssues: boolean;
  clarifications: Array<{
    itemId: string;
    issue: 'overdue' | 'stale_inbox' | 'repeat_postpone' | 'stale_optional' | 'no_next_action';
    suggestion: string;
  }>;
}

async function runReview(data: GTDData): Promise<ReviewResult> {
  const clarifications = [];

  // Check overdue items
  // Check inbox items > 3 days old
  // Check items postponed 3+ times
  // Check optional items > 2 weeks untouched
  // Check projects without next action

  return { hasIssues: clarifications.length > 0, clarifications };
}
```

**Tasks:**
- [ ] Create review service
- [ ] Implement each check
- [ ] Return structured clarification list
- [ ] Update `lastAutoReview` timestamp

**Tests:**
- [ ] `__tests__/services/review-agent.test.ts` - Detects overdue
- [ ] `__tests__/services/review-agent.test.ts` - Detects stale inbox
- [ ] `__tests__/services/review-agent.test.ts` - Detects repeat postpone
- [ ] `__tests__/services/review-agent.test.ts` - Returns empty when clean

---

### 6.3 Review API

**File:** `app/api/review/route.ts`

```typescript
GET /api/review/status
Response: {
  lastReview: string | null,
  needsReview: boolean,        // >1 day since last
  pendingClarifications: number
}

POST /api/review/run
Response: ReviewResult
```

**Tasks:**
- [ ] Create review status endpoint
- [ ] Create review run endpoint
- [ ] Store clarifications for chat to consume

**Tests:**
- [ ] `__tests__/api/review.test.ts` - Status endpoint
- [ ] `__tests__/api/review.test.ts` - Run endpoint

---

### 6.4 Chat Integration

**Tasks:**
- [ ] On page load, check `/api/review/status`
- [ ] If `needsReview`, show banner in chat
- [ ] "Review now" or "Later" buttons
- [ ] If "Later", track and re-offer after task completion
- [ ] Walk through clarifications conversationally

---

### Phase 6 Checklist

```
[ ] review CLI command + tests
[ ] review-agent service + tests
[ ] review API endpoints + tests
[ ] Chat startup integration
[ ] "Later" re-offer logic
```

---

## Phase 7: Polish

### 7.1 Visual Enhancements

**Tasks:**
- [ ] Overdue badge on Focus tab
- [ ] "All done for today!" empty state
- [ ] Postpone count styling (warning at 2+)
- [ ] Project progress indicators
- [ ] Smooth tab transitions

### 7.2 Edge Cases

**Tasks:**
- [ ] Handle empty states gracefully
- [ ] Offline handling
- [ ] Concurrent edit protection
- [ ] Large dataset performance

**Tests:**
- [ ] `__tests__/edge-cases.test.ts` - Empty data
- [ ] `__tests__/edge-cases.test.ts` - Malformed data recovery

---

## Test Infrastructure

### Setup

**File:** `jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**File:** `jest.setup.js`
```javascript
// Mock fetch for API tests
// Setup test data utilities
```

**Tasks:**
- [ ] Install Jest + React Testing Library
- [ ] Configure for TypeScript
- [ ] Create test utilities for GTD data
- [ ] Add npm scripts: `test`, `test:watch`, `test:coverage`

---

### Phase 7 Checklist

```
[ ] Visual polish complete
[ ] Edge cases handled
[ ] All tests passing
[ ] Manual end-to-end testing complete
```

---

## Implementation Order

```
Phase 1: CLI Tools Foundation
├── Jest setup
├── store.ts + tests
├── All CRUD commands + tests (add, list, complete, uncomplete, remove, update)
├── API routes use store
├── Skill updated for CLI
└── Integration tests

Phase 2: GTD Data Model + Tabs
├── Migration script + tests
├── GTD types (nextAction, status, etc.)
├── list --tab + tests
├── clarify command + tests
├── Tab UI component
└── Skill updated

Phase 3: Postpone Flow
├── postpone command + tests
├── postpone API + tests
├── PostponeDropdown + tests
├── ConfirmationModal + tests
└── Integration

Phase 4: Projects Tab
├── projects command + tests
├── projects API + tests
├── ProjectsView + tests
└── Tab integration

Phase 5: Smart Capture
├── Skill routing documentation
├── Manual testing
└── Clarification flow

Phase 6: Background Review
├── review command + tests
├── review-agent service + tests
├── review API + tests
├── Chat integration
└── Re-offer logic

Phase 7: Polish
├── Visual enhancements
├── Edge case handling
└── Final testing
```

---

## Definition of Done (Per Phase)

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Documentation updated
