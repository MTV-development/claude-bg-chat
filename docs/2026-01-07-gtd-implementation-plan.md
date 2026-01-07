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

---

## Phase 1: Data Model Migration + Tab UI

### 1.1 Update Data Schema

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

### 1.2 Update API Routes

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

### 1.3 Update TodoList Component

**File:** `components/TodoList.tsx`

**New Features:**
- Tab navigation (Focus, Optional, Inbox, Projects, Done)
- Active tab state management
- Different item rendering per tab
- Tab badges (count, overdue indicator)

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

### 1.4 Update Skill Definition

**File:** `.claude/skills/todo-manager/SKILL.md`

**Tasks:**
- [ ] Update JSON schema documentation
- [ ] Add `nextAction` field handling
- [ ] Update "Adding a Task" to set `nextAction` for clear items
- [ ] Add routing logic (clear → active, vague → inbox)
- [ ] Document new status values

---

## Phase 2: Postpone Flow

### 2.1 Postpone API

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

### 2.2 Postpone UI Component

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

### 2.3 Confirmation Modal

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

## Phase 3: Projects Tab

### 3.1 Projects API

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

### 3.2 Projects Tab UI

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

## Phase 4: Smart Capture (AI Routing)

### 4.1 Update Skill for Routing

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

### 4.2 Clarification Flow

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

## Phase 5: Background Review Agent

### 5.1 Review Logic

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

### 5.2 Review API

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

### 5.3 Chat Integration

**Tasks:**
- [ ] On page load, check `/api/review/status`
- [ ] If `needsReview`, show banner in chat
- [ ] "Review now" or "Later" buttons
- [ ] If "Later", track and re-offer after task completion
- [ ] Walk through clarifications conversationally

---

## Phase 6: Polish

### 6.1 Visual Enhancements

**Tasks:**
- [ ] Overdue badge on Focus tab
- [ ] "All done for today!" empty state
- [ ] Postpone count styling (warning at 2+)
- [ ] Project progress indicators
- [ ] Smooth tab transitions

### 6.2 Edge Cases

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

## Implementation Order

```
Week 1: Phase 1 (Data + Tabs)
├── Day 1-2: Data model + migration + tests
├── Day 3-4: API updates + tests
└── Day 5: TodoList tabs + tests

Week 2: Phase 2 (Postpone)
├── Day 1-2: Postpone API + tests
├── Day 3-4: Postpone UI + tests
└── Day 5: Integration + confirmation modal

Week 3: Phase 3-4 (Projects + Smart Capture)
├── Day 1-2: Projects API + UI + tests
├── Day 3-4: Skill routing updates
└── Day 5: Clarification flow

Week 4: Phase 5-6 (Review + Polish)
├── Day 1-2: Review agent + tests
├── Day 3-4: Chat integration
└── Day 5: Polish + final testing
```

---

## Definition of Done (Per Phase)

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Documentation updated
