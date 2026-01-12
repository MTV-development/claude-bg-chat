# Move to Mastra - Implementation Specification

**Created:** 2026-01-12
**Status:** Draft
**Analysis:** [2026-01-12-277d-move-to-mastra-analysis.md](./2026-01-12-277d-move-to-mastra-analysis.md)

---

## Spec Validation Report

**Validated:** 2026-01-12
**Status:** READY (after fixes applied)

### Summary
The spec was validated and issues were fixed. Ready for implementation.

### Consistency Check
- [x] Referenced service files exist
- [ ] APIs/interfaces are accurate (some signatures wrong)
- [x] Naming conventions match codebase

### Technology Alignment
- [x] Uses existing tech stack appropriately
- [x] No conflicts with current choices
- [x] Follows established patterns

### Environment Validation
- [x] `/docs/current/environment-validation.md` exists with commands
- Validation commands: `npm run build`, `npx tsc --noEmit`, `npm test`

### Issues Found

#### Critical (Fixed)

1. ~~**Wrong date parser source path**~~ ✓ Fixed
   - Updated to: `scripts/gtd/lib/store.ts` → extract `parseDate()` and `getLocalDateString()`

2. ~~**Service function signatures mismatch**~~ ✓ Fixed in analysis doc
   - Corrected to: `createTodo(userId, input)` and `getOrCreateProject(userId, projectName)`

#### Warnings (Noted)

3. **lib/utils/ directory doesn't exist** - will be created in Phase 1

4. **Streaming** - verify `agent.stream()` during Phase 4 implementation

### Pre-Implementation Checklist

- [ ] Run environment validation: `npm run build && npx tsc --noEmit && npm test`
- [ ] Verify Mastra streaming API docs
- [ ] Create lib/utils/ directory

---

## Overview

Migrate the GTD Todo Manager from Claude CLI-based skills to Mastra AI agent architecture. The service layer remains unchanged; only the AI interface layer is replaced.

**Key Changes:**
- Replace `claude-backend/` with `src/mastra/`
- Replace CLI commands with Mastra tools
- Remove `scripts/gtd/` CLI layer
- Tools call services directly

---

## Implementation Plan

**Testing Philosophy:** Test extensively at each phase before moving on. Each tool must be verified working in isolation before integrating into the agent. The chat UI E2E test is the final validation, not the first.

### Phase 1: Setup Mastra Infrastructure

#### 1.1 Install Dependencies

```bash
npm install @mastra/core @mastra/loggers
```

#### 1.2 Create Mastra Singleton

**File:** `src/mastra/index.ts`

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

const globalForMastra = globalThis as unknown as { mastra: Mastra | undefined };

export const mastra =
  globalForMastra.mastra ??
  new Mastra({
    logger: new PinoLogger({ name: 'GTD', level: 'info' }),
  });

globalForMastra.mastra = mastra;
```

#### 1.3 Move Date Parser

**From:** `scripts/gtd/lib/store.ts` (extract `parseDate` and `getLocalDateString` functions)
**To:** `lib/utils/date-parser.ts`

Extract the `parseDate` function and its helper `getLocalDateString` from the store module. No modifications needed to the logic.

**Phase 1 Checkpoint:** Verify Mastra initializes without errors. Check logs.

---

### Phase 2: Create Tool Factories

Each tool is a factory function that takes `userId` and returns a Mastra tool.

#### 2.1 Tool Index

**File:** `src/mastra/tools/index.ts`

```typescript
import { createAddTodoTool } from './add-todo';
import { createListTodosTool } from './list-todos';
import { createCompleteTodoTool } from './complete-todo';
import { createUncompleteTodoTool } from './uncomplete-todo';
import { createClarifyTodoTool } from './clarify-todo';
import { createPostponeTodoTool } from './postpone-todo';
import { createUpdateTodoTool } from './update-todo';
import { createRemoveTodoTool } from './remove-todo';
import { createListProjectsTool } from './list-projects';

export function createGtdTools(userId: string) {
  return {
    addTodo: createAddTodoTool(userId),
    listTodos: createListTodosTool(userId),
    completeTodo: createCompleteTodoTool(userId),
    uncompleteTodo: createUncompleteTodoTool(userId),
    clarifyTodo: createClarifyTodoTool(userId),
    postponeTodo: createPostponeTodoTool(userId),
    updateTodo: createUpdateTodoTool(userId),
    removeTodo: createRemoveTodoTool(userId),
    listProjects: createListProjectsTool(userId),
  };
}
```

#### 2.2 Tool Specifications

##### addTodo

**File:** `src/mastra/tools/add-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Task title or raw capture |
| dueDate | string | No | YYYY-MM-DD, "today", "tomorrow", "+N days" |
| project | string | No | Project name (creates if not exists) |
| status | 'inbox' \| 'active' | No | Default: 'active' |
| canDoAnytime | boolean | No | Default: false |

**Returns:** `{ success, todo: { id, title, status }, error? }`

**Services Called:**
- `getOrCreateProject` (if project specified)
- `createTodo`

##### listTodos

**File:** `src/mastra/tools/list-todos.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tab | 'focus' \| 'optional' \| 'later' \| 'inbox' \| 'done' | No | Filter by tab |
| project | string | No | Filter by project name |

**Returns:** `{ todos: Array<{ id, title, nextAction, dueDate, status, project?, tab }> }`

**Services Called:**
- `listTodos`

##### completeTodo

**File:** `src/mastra/tools/complete-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Task ID, title, or partial match |

**Returns:** `{ success, todo?, error? }`

**Services Called:**
- `findTodo`
- `updateTodo` (set status='done', completedAt)

##### uncompleteTodo

**File:** `src/mastra/tools/uncomplete-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Task ID, title, or partial match |

**Returns:** `{ success, todo?, error? }`

**Services Called:**
- `findTodo`
- `updateTodo` (set status='active', clear completedAt)

##### clarifyTodo

**File:** `src/mastra/tools/clarify-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Task ID, title, or partial match |
| nextAction | string | Yes | Concrete next action |
| project | string | No | Assign to project |

**Returns:** `{ success, todo?, error? }`

**Services Called:**
- `findTodo`
- `getOrCreateProject` (if project specified)
- `updateTodo` (set nextAction, status='active')

##### postponeTodo

**File:** `src/mastra/tools/postpone-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Task ID, title, or partial match |
| days | number | Yes | Days to postpone |

**Returns:** `{ success, todo?, needsConfirmation?, postponeCount?, error? }`

**Services Called:**
- `findTodo`
- `postponeTodo`

**Note:** Returns `needsConfirmation: true` if postponeCount >= 3. Agent should ask user to confirm.

##### updateTodo

**File:** `src/mastra/tools/update-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Task ID, title, or partial match |
| title | string | No | New title |
| nextAction | string | No | New next action |
| dueDate | string \| null | No | New due date, null to clear |
| project | string \| null | No | New project, null to clear |
| status | 'inbox' \| 'active' \| 'someday' \| 'done' | No | New status |
| canDoAnytime | boolean | No | Optional flag |

**Returns:** `{ success, todo?, error? }`

**Services Called:**
- `findTodo`
- `getOrCreateProject` (if project specified)
- `updateTodo`

##### removeTodo

**File:** `src/mastra/tools/remove-todo.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | No | Task ID, title, or partial match |
| project | string | No | Remove all tasks in project |

**Returns:** `{ success, count?, error? }`

**Services Called:**
- `findTodo` (if identifier)
- `deleteTodo` or `deleteProjectTodos`

##### listProjects

**File:** `src/mastra/tools/list-projects.ts`

No input parameters.

**Returns:** `{ projects: Array<{ id, name, taskCount }> }`

**Services Called:**
- `listProjects`

**Phase 2 Checkpoint:** Test each tool in isolation (see Testing Strategy). All 9 tools must work correctly before proceeding.

---

### Phase 3: Create GTD Agent

**File:** `src/mastra/agents/gtd-agent.ts`

```typescript
import { Agent } from '@mastra/core/agent';
import { createGtdTools } from '../tools';

const GTD_INSTRUCTIONS = `You are a GTD (Getting Things Done) assistant helping users manage their tasks.

## Your Capabilities
You can add, list, complete, clarify, postpone, update, and remove tasks. You can also manage projects.

## Smart Status Routing
When adding tasks, determine the appropriate status:
- Clear, actionable items → status: active
  Examples: "buy milk", "call dentist", "send email to John"
- Vague, multi-step, or project-like items → status: inbox
  Examples: "think about career", "plan vacation", "organize garage"

## Behavioral Guidelines

1. **Always Take Action**: Either execute a tool OR ask a clarifying question. Never just acknowledge without acting.

2. **Hide Technical Details**: Never show internal IDs, JSON, field names, or tool syntax to users. Speak naturally.

3. **Fresh Data First**: When asked about tasks, always use listTodos first. Never assume what tasks exist.

4. **Clarification Workflow**: When helping clarify an inbox item, ask:
   - "What's the concrete next action?"
   - "When should it be done? (specific date, or can do anytime?)"
   Then use updateTodo with both nextAction and either dueDate or canDoAnytime.

5. **Postpone Confirmation**: If postponeTodo returns needsConfirmation=true (postponed 3+ times), ask the user: "This task has been postponed [N] times. Do you want to postpone it again, or should we reconsider it?"

6. **Concise Responses**: Keep responses brief. "Done!" or "Added 'buy milk' for tomorrow" is better than verbose confirmations.

## Tab System
Tasks appear in different tabs based on their properties:
- Focus: Due today or overdue
- Optional: Can do anytime (no deadline pressure)
- Later: Due in the future
- Inbox: Needs clarification (no due date AND not optional)
- Done: Completed tasks
`;

export function createGtdAgent(userId: string) {
  return new Agent({
    id: 'gtd-agent',
    name: 'GTD Assistant',
    instructions: GTD_INSTRUCTIONS,
    model: 'openrouter/openai/gpt-4o-mini',
    tools: createGtdTools(userId),
  });
}
```

**Phase 3 Checkpoint:** Test agent via code (not UI). Verify it calls tools correctly and follows instructions. See Testing Strategy.

---

### Phase 4: Update API Layer

**File:** `app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createGtdAgent } from '@/src/mastra/agents/gtd-agent';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from users table (maps auth.uid to our user.id)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { message } = await req.json();

    // Create agent with user-bound tools
    const agent = createGtdAgent(userData.id);
    const result = await agent.generate(message);

    return NextResponse.json({ response: result.text });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Phase 4 Checkpoint:** Test API endpoint directly (curl/Postman). Verify auth, response format, error handling. See Testing Strategy.

---

### Phase 5: Cleanup & Documentation

#### 5.1 Remove Old Code

```bash
# Remove Claude backend
rm -rf claude-backend/

# Remove CLI scripts
rm -rf scripts/gtd/

# Remove CLI adapter
rm -rf lib/adapters/
```

#### 5.2 Clean Dead Code

Search for and remove any remaining references to the old implementation:
- Imports from deleted modules
- Unused types/interfaces related to CLI
- Any orphaned test files

```bash
# Find potential dead imports
grep -r "claude-backend" --include="*.ts" --include="*.tsx" .
grep -r "cli-adapter" --include="*.ts" --include="*.tsx" .
grep -r "scripts/gtd" --include="*.ts" --include="*.tsx" .
```

#### 5.3 Update .gitignore

Remove any Claude-specific ignores if no longer needed.

#### 5.4 Update package.json

Remove any CLI-related scripts.

#### 5.5 Update /docs/current/

Update documentation to reflect the new Mastra architecture:

- `docs/current/technical-architecture.md` - Update system diagrams and component descriptions
- `docs/current/overview.md` - Update if it references Claude CLI
- `docs/current/environment-validation.md` - Verify commands still apply

**Phase 5 Checkpoint:** All dead code removed. `npm run build && npx tsc --noEmit` passes with no errors referencing deleted modules.

---

### Phase 6: Final Validation & E2E Testing

**Only proceed here after Phases 1-5 are complete and verified.**

**Pre-E2E Checklist:**
- [ ] All old code removed (claude-backend/, scripts/gtd/, lib/adapters/)
- [ ] No dead imports or references remain
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes (update/remove tests for deleted code)
- [ ] `/docs/current/` updated to reflect new architecture

This is the final validation phase. Test the complete user flow through the chat UI.

See Testing Strategy → "Phase 6: Chat UI E2E Testing" for detailed test cases.

**Phase 6 Checkpoint:** All E2E tests pass. Real-time updates work. Documentation current. Migration complete.

---

## File Structure (Final)

```
src/
└── mastra/
    ├── index.ts                    # Mastra singleton
    ├── agents/
    │   └── gtd-agent.ts           # createGtdAgent factory
    └── tools/
        ├── index.ts               # createGtdTools factory
        ├── add-todo.ts
        ├── list-todos.ts
        ├── complete-todo.ts
        ├── uncomplete-todo.ts
        ├── clarify-todo.ts
        ├── postpone-todo.ts
        ├── update-todo.ts
        ├── remove-todo.ts
        └── list-projects.ts

lib/
├── utils/
│   └── date-parser.ts             # Moved from scripts/gtd/lib/
└── services/                      # Unchanged
    ├── todos/
    └── projects/

app/
└── api/
    └── chat/
        └── route.ts               # Updated to use Mastra
```

---

## Testing Strategy

**Critical:** Test extensively at each phase. Do not proceed to the next phase until current phase is verified working.

### Phase 2 Testing: Individual Tools

Test each tool factory in isolation before integrating into agent.

```typescript
// Example: Test addTodo tool directly
const tool = createAddTodoTool(testUserId);
const result = await tool.execute({ title: 'test task', dueDate: 'tomorrow' });
console.log(result); // Verify success, check DB
```

**For each tool, verify:**
- [ ] Tool executes without error
- [ ] Correct data written to/read from Supabase
- [ ] Error cases handled (not found, invalid input)
- [ ] Date parsing works ("today", "+3 days", etc.)

### Phase 3 Testing: Agent with Tools

Test agent via code (not UI) to verify tool calling works.

```typescript
// Example: Test agent directly
const agent = createGtdAgent(testUserId);
const result = await agent.generate('Add buy milk for tomorrow');
console.log(result.text); // Verify natural response
// Check DB for created todo
```

**Verify:**
- [ ] Agent calls correct tools for different requests
- [ ] Agent handles multi-tool conversations
- [ ] Agent follows instructions (status routing, hiding IDs, etc.)
- [ ] Postpone confirmation flow works (needsConfirmation → agent asks)

### Phase 4 Testing: API Layer

Test the `/api/chat` endpoint directly (curl, Postman, or test script).

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"message": "Add test task"}'
```

**Verify:**
- [ ] Auth works (userId extracted correctly)
- [ ] Response format correct
- [ ] Errors handled gracefully

### Phase 6: Chat UI E2E Testing (Final Phase)

**Only after all previous phases pass**, test the full UI flow.

**Manual E2E Tests:**

1. **Basic Operations**
   - "Add buy milk for tomorrow"
   - "What's on my focus list?"
   - "Complete the milk task"
   - "Undo that"

2. **Clarification Flow**
   - Add vague item: "plan vacation"
   - Ask to clarify: "Help me clarify the vacation task"
   - Verify agent asks for next action + timing

3. **Postpone Confirmation**
   - Postpone a task 3+ times
   - Verify agent asks for confirmation

4. **Project Management**
   - "Add task to Project X"
   - "Show me all projects"
   - "What tasks are in Project X?"

**Verify Real-time Updates:**
After each agent action:
1. Check that Zustand store receives update
2. Check that TodoList panel reflects change without refresh
3. Verify correct tab placement (Focus/Optional/Later/Inbox)

---

## Rollback Plan

If issues arise:
1. Revert API route to use Claude CLI adapter
2. Keep `claude-backend/` and `scripts/gtd/` in a backup branch
3. The service layer is unchanged, so rollback is isolated to the AI interface

---

## Open Items

- [ ] Verify streaming support: `agent.stream()` vs `agent.generate()`
- [ ] Test OpenRouter model string format
- [ ] Verify Mastra tool context passing works as expected
- [ ] Performance: compare response time with Claude CLI

---

## References

- [Analysis Document](./2026-01-12-277d-move-to-mastra-analysis.md)
- [Mastra Reference Project](C:\git\aiffirmation-proto)
- [Current Skill](../../claude-backend/.claude/skills/todo-manager/SKILL.md)
