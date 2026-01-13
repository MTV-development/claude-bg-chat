# Implementation Plan: Move to Mastra

**Spec:** [2026-01-12-277d-move-to-mastra-spec.md](./2026-01-12-277d-move-to-mastra-spec.md)
**Created:** 2026-01-12
**Status:** Not Started

## Overview

Migrate the GTD Todo Manager from Claude CLI-based skills to Mastra AI agent architecture. Replace the CLI command layer with 9 Mastra tools that call services directly, wrapped in a single agent with GTD instructions.

## Environment Validation

Per `/docs/current/environment-validation.md`:

**Pre-flight commands:**
```bash
npm run build          # Build check
npx tsc --noEmit       # Full type check
npm test               # Test suite
```

**Expected results:**
| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

**Known issues:** None documented. All checks should pass.

## Test Strategy

Testing is phased - each phase must pass before proceeding:

| Phase | Test Type | Method |
|-------|-----------|--------|
| P0 | Environment | Run pre-flight commands |
| P1 | Infrastructure | Mastra initializes, date parser works |
| P2 | Unit | Each tool tested in isolation via code |
| P3 | Integration | Agent tested via code (not UI) |
| P4 | API | Endpoint tested via curl/Postman |
| P5 | Build | No dead code errors |
| P6 | E2E | Full UI flow tested manually |

---

## Phase 0: Environment Validation

**Goal:** Establish healthy baseline before making changes
**Verification:** All pre-flight commands pass

### P0.1: Run Pre-flight Commands

Run all validation commands:
```bash
npm run build && npx tsc --noEmit && npm test
```

### P0.2: Document Baseline

Record results in progress log. Note any pre-existing issues.

### P0 Checkpoint

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Results documented in progress log

---

## Phase 1: Setup Mastra Infrastructure

**Goal:** Install Mastra and create foundational files
**Verification:** `npm run build` passes, Mastra singleton initializes

### P1.1: Install Dependencies

**Changes:** Add Mastra packages
```bash
npm install @mastra/core @mastra/loggers
```

**Acceptance:** Packages appear in package.json, no install errors

### P1.2: Create Mastra Singleton

**Files:** `src/mastra/index.ts` (new)

**Changes:** Create singleton pattern for Mastra instance with PinoLogger

**Acceptance:** File created, no TypeScript errors

### P1.3: Extract Date Parser

**Files:**
- `scripts/gtd/lib/store.ts` (source - read only)
- `lib/utils/date-parser.ts` (new)

**Changes:** Extract `parseDate()` and `getLocalDateString()` functions to new utils file

**Acceptance:**
- New file created with both functions
- Functions handle: "today", "tomorrow", "+N days", "YYYY-MM-DD"
- `npx tsc --noEmit` passes

### P1 Checkpoint

- [ ] Mastra packages installed
- [ ] `src/mastra/index.ts` created
- [ ] `lib/utils/date-parser.ts` created
- [ ] `npm run build` passes
- [ ] Quick test: import mastra singleton, verify no errors

---

## Phase 2: Create Tool Factories

**Goal:** Implement all 9 Mastra tools
**Verification:** Each tool tested in isolation via test script

### P2.1: Create Tool Index

**Files:** `src/mastra/tools/index.ts` (new)

**Changes:** Create `createGtdTools(userId)` factory that returns all tools

**Acceptance:** File compiles (tools will be stubs initially)

### P2.2: Implement addTodo Tool

**Files:** `src/mastra/tools/add-todo.ts` (new)

**Changes:**
- Create `createAddTodoTool(userId)` factory
- Input: title, dueDate?, project?, status?, canDoAnytime?
- Calls: `getOrCreateProject`, `createTodo`
- Uses `parseDate()` for date handling

**Acceptance:**
- Tool creates todo in database
- Date parsing works ("today", "+3 days")
- Project auto-created if needed

### P2.3: Implement listTodos Tool

**Files:** `src/mastra/tools/list-todos.ts` (new)

**Changes:**
- Create `createListTodosTool(userId)` factory
- Input: tab?, project?
- Calls: `listTodos`

**Acceptance:** Returns todos filtered by tab/project

### P2.4: Implement completeTodo Tool

**Files:** `src/mastra/tools/complete-todo.ts` (new)

**Changes:**
- Create `createCompleteTodoTool(userId)` factory
- Input: identifier (ID, title, or partial match)
- Calls: `findTodo`, `updateTodo`

**Acceptance:** Finds and completes todo by various identifiers

### P2.5: Implement uncompleteTodo Tool

**Files:** `src/mastra/tools/uncomplete-todo.ts` (new)

**Changes:**
- Create `createUncompleteTodoTool(userId)` factory
- Input: identifier
- Calls: `findTodo`, `updateTodo`

**Acceptance:** Reverts completed todo to active

### P2.6: Implement clarifyTodo Tool

**Files:** `src/mastra/tools/clarify-todo.ts` (new)

**Changes:**
- Create `createClarifyTodoTool(userId)` factory
- Input: identifier, nextAction, project?
- Calls: `findTodo`, `getOrCreateProject`, `updateTodo`

**Acceptance:** Sets nextAction and moves to active status

### P2.7: Implement postponeTodo Tool

**Files:** `src/mastra/tools/postpone-todo.ts` (new)

**Changes:**
- Create `createPostponeTodoTool(userId)` factory
- Input: identifier, days
- Calls: `findTodo`, `postponeTodo`
- Returns `needsConfirmation: true` if postponeCount >= 3

**Acceptance:** Postpones task, returns confirmation flag when appropriate

### P2.8: Implement updateTodo Tool

**Files:** `src/mastra/tools/update-todo.ts` (new)

**Changes:**
- Create `createUpdateTodoTool(userId)` factory
- Input: identifier, title?, nextAction?, dueDate?, project?, status?, canDoAnytime?
- Calls: `findTodo`, `getOrCreateProject`, `updateTodo`

**Acceptance:** Updates any combination of fields

### P2.9: Implement removeTodo Tool

**Files:** `src/mastra/tools/remove-todo.ts` (new)

**Changes:**
- Create `createRemoveTodoTool(userId)` factory
- Input: identifier? OR project?
- Calls: `findTodo`, `deleteTodo` OR `deleteProjectTodos`

**Acceptance:** Removes single todo or all in project

### P2.10: Implement listProjects Tool

**Files:** `src/mastra/tools/list-projects.ts` (new)

**Changes:**
- Create `createListProjectsTool(userId)` factory
- No input
- Calls: `listProjects`

**Acceptance:** Returns projects with task counts

### P2 Checkpoint

- [ ] All 9 tools implemented
- [ ] Each tool tested individually via test script
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

**Test script example:**
```typescript
// scripts/test-tools.ts
const userId = 'test-user-id';
const addTool = createAddTodoTool(userId);
const result = await addTool.execute({ title: 'test', dueDate: 'tomorrow' });
console.log(result);
```

---

## Phase 3: Create GTD Agent

**Goal:** Create agent with tools and GTD instructions
**Verification:** Agent tested via code, correctly calls tools

### P3.1: Create Agent Factory

**Files:** `src/mastra/agents/gtd-agent.ts` (new)

**Changes:**
- Create `createGtdAgent(userId)` factory
- Define GTD_INSTRUCTIONS constant with behavioral guidelines
- Wire up all tools from `createGtdTools(userId)`
- Use model: `openrouter/openai/gpt-4o-mini`

**Acceptance:** Agent compiles without errors

### P3.2: Test Agent Tool Calling

**Changes:** Create test script to verify agent calls correct tools

**Test cases:**
- "Add buy milk for tomorrow" → addTodo tool
- "What's on my focus list?" → listTodos tool
- "Complete the milk task" → completeTodo tool
- "Postpone dentist by 3 days" → postponeTodo tool

**Acceptance:** Agent selects correct tools for each request

### P3.3: Test Agent Behavioral Guidelines

**Test cases:**
- Verify agent doesn't show IDs in responses
- Verify agent asks for clarification on vague inputs
- Verify postpone confirmation flow

**Acceptance:** Agent follows instructions naturally

### P3 Checkpoint

- [ ] Agent factory created
- [ ] Agent calls correct tools
- [ ] Agent follows behavioral guidelines
- [ ] `npm run build` passes

---

## Phase 4: Update API Layer

**Goal:** Replace Claude CLI adapter with Mastra agent
**Verification:** API endpoint tested via curl

### P4.1: Update Chat Route

**Files:** `app/api/chat/route.ts` (modify)

**Changes:**
- Remove CLIAdapter import and usage
- Import `createGtdAgent`
- Get userId from Supabase auth
- Call `agent.generate(message)`
- Return response

**Acceptance:** Endpoint compiles without errors

### P4.2: Test API Auth

**Test:** Call endpoint without auth cookie
**Expected:** 401 Unauthorized

### P4.3: Test API Success Path

**Test:** Call endpoint with valid auth and message
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"message": "Add test task"}'
```
**Expected:** JSON response with agent's reply

### P4.4: Verify Streaming (if needed)

**Check:** Does current UI expect streaming?
**If yes:** Update to use `agent.stream()` instead of `agent.generate()`

**Acceptance:** Response format matches UI expectations

### P4 Checkpoint

- [ ] API route updated
- [ ] Auth works correctly
- [ ] Success path returns response
- [ ] Streaming verified (if applicable)
- [ ] `npm run build` passes

---

## Phase 5: Cleanup & Documentation

**Goal:** Remove old code, update docs
**Verification:** Build passes with no dead code errors

### P5.1: Remove Claude Backend

**Files:** `claude-backend/` (delete entire directory)

**Acceptance:** Directory removed, no remaining references

### P5.2: Remove CLI Scripts

**Files:** `scripts/gtd/` (delete entire directory)

**Acceptance:** Directory removed, no remaining references

### P5.3: Remove CLI Adapter

**Files:** `lib/adapters/` (delete entire directory)

**Acceptance:** Directory removed, no remaining references

### P5.4: Find and Fix Dead Imports

**Check:**
```bash
grep -r "claude-backend" --include="*.ts" --include="*.tsx" .
grep -r "cli-adapter" --include="*.ts" --include="*.tsx" .
grep -r "scripts/gtd" --include="*.ts" --include="*.tsx" .
grep -r "CLIAdapter" --include="*.ts" --include="*.tsx" .
```

**Changes:** Remove any found references

**Acceptance:** No matches found

### P5.5: Update/Remove Tests

**Files:** Any test files that reference deleted code

**Changes:**
- Remove tests for CLI commands
- Remove tests for CLI adapter
- Keep service layer tests (unchanged)

**Acceptance:** `npm test` passes

### P5.6: Update package.json

**Files:** `package.json`

**Changes:** Remove any CLI-related scripts

**Acceptance:** No scripts reference deleted code

### P5.7: Update .gitignore

**Files:** `.gitignore`

**Changes:** Remove Claude-specific ignores if present

### P5.8: Update /docs/current/

**Files:**
- `docs/current/technical-architecture.md`
- `docs/current/overview.md`
- `docs/current/environment-validation.md`

**Changes:** Update to reflect Mastra architecture, remove Claude CLI references

**Acceptance:** Docs accurately describe new architecture

### P5 Checkpoint

- [ ] `claude-backend/` removed
- [ ] `scripts/gtd/` removed
- [ ] `lib/adapters/` removed
- [ ] No dead imports remain
- [ ] Tests updated/removed
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `/docs/current/` updated

---

## Phase 6: Final Validation & E2E Testing

**Goal:** Verify complete system works end-to-end
**Verification:** Manual E2E tests through chat UI

### P6.1: Pre-E2E Verification

Run full validation:
```bash
npm run build && npx tsc --noEmit && npm test
```

**Acceptance:** All pass

### P6.2: Start Dev Server

```bash
npm run dev
```

**Acceptance:** Server starts without errors

### P6.3: E2E Test - Basic Operations

**Tests:**
1. "Add buy milk for tomorrow" → Task appears in Focus tab
2. "What's on my focus list?" → Lists the milk task
3. "Complete the milk task" → Task moves to Done tab
4. "Undo that" → Task returns to Focus tab

**Acceptance:** All operations work, UI updates in real-time

### P6.4: E2E Test - Clarification Flow

**Tests:**
1. "Add plan vacation" → Task appears in Inbox
2. "Help me clarify the vacation task"
3. Verify agent asks for next action
4. Provide next action
5. Verify agent asks for timing
6. Provide timing
7. Task moves to appropriate tab

**Acceptance:** Clarification flow works naturally

### P6.5: E2E Test - Postpone Confirmation

**Tests:**
1. Create task with due date
2. Postpone it 3+ times
3. On 4th postpone, verify agent asks for confirmation

**Acceptance:** Confirmation prompt appears

### P6.6: E2E Test - Project Management

**Tests:**
1. "Add task to Project X" → Task created, project auto-created
2. "Show me all projects" → Lists projects
3. "What tasks are in Project X?" → Shows tasks in project

**Acceptance:** Project operations work

### P6.7: Verify Real-time Updates

**Test:** In two browser tabs:
1. Tab A: Send chat message to add task
2. Tab B: Verify TodoList updates without refresh

**Acceptance:** Real-time sync works via Supabase

### P6 Checkpoint

- [ ] All E2E tests pass
- [ ] Real-time updates work
- [ ] No console errors
- [ ] Documentation current
- [ ] Migration complete

---

## Phase 7: E2E Tests for Add via Chat Tab Placement

**Goal:** Verify that "Add via Chat" buttons create tasks in the correct tabs
**Verification:** All Playwright E2E tests pass

### Context

The "Add via Chat" button sends tab-specific prompts to the agent:
- **Focus (Today):** "Add to my todo list: I need to do something today. Ask me what."
- **Optional:** "Add to my todo list: something I can do anytime. Ask me what."
- **Later:** "Add to my todo list: something I can't do until a future date. Ask me what and when."
- **Inbox:** "Add to my todo list: I have a vague idea I want to capture. Ask me what."

The agent must correctly interpret these prompts and set the right properties:
- Focus → `dueDate: "today"`
- Optional → `canDoAnytime: true`
- Later → `dueDate: <future date>`
- Inbox → no dueDate, `canDoAnytime: false`

### P7.1: Review Existing Tests

**Files:** `e2e/chat-ui-integration.spec.ts`

**Check:**
- Existing "Add via Chat - Tab Placement" tests
- Coverage gaps (Later tab test may be missing)

### P7.2: Add Missing Tab Tests

**Files:** `e2e/chat-ui-integration.spec.ts`

**Changes:** Add test for Later tab if missing:
```typescript
test('Add via Chat from Later tab creates task in Later tab', async ({ page }) => {
  // Click Later tab
  // Click Add via Chat button
  // Provide a task name
  // Verify task appears in Later tab
});
```

### P7.3: Run E2E Tests

**Command:**
```bash
npx playwright test e2e/chat-ui-integration.spec.ts --workers=1
```

**Acceptance:** All "Add via Chat - Tab Placement" tests pass

### P7.4: Fix Agent Instructions if Needed

**Files:** `src/mastra/agents/gtd-agent.ts`

**If tests fail:** Update GTD_INSTRUCTIONS to better handle the tab-specific prompts

### P7.5: Commit Phase 7

**Commit when:** All E2E tests pass

```bash
git add -A && git commit -m "Phase 7: E2E tests for Add via Chat tab placement"
```

### P7 Checkpoint

- [ ] All existing "Add via Chat" tests pass
- [ ] Later tab test added and passes
- [ ] Agent correctly routes tasks to tabs based on prompts
- [ ] Committed

---

## Phase 8: Upgrade to Latest Mastra v1

**Goal:** Update to latest Mastra version with improved APIs
**Verification:** All tests pass, E2E chat works correctly

### Current State

- `@mastra/core: ^0.24.9`
- `@mastra/loggers: ^0.10.19`

### Target State

- `@mastra/core: ^1.0.0-beta.21` (or latest beta)
- `@mastra/memory: ^0.15.13` (for Phase 9)
- `@mastra/libsql: ^0.16.4` (for Phase 9)

### P8.1: Check Latest Mastra Version

**Reference:** https://mastra.ai/docs/v1/getting-started/start

**Commands:**
```bash
npm view @mastra/core versions --json | tail -10
```

### P8.2: Update Dependencies

**Files:** `package.json`

**Changes:**
```bash
npm install @mastra/core@beta @mastra/loggers@latest
```

### P8.3: Fix Breaking Changes

**Check:**
- Agent API changes
- Tool API changes
- Stream API changes

**Files to update if needed:**
- `src/mastra/index.ts`
- `src/mastra/agents/gtd-agent.ts`
- `src/mastra/tools/*.ts`
- `app/api/chat/route.ts`

### P8.4: Verify Type Check

**Command:**
```bash
npx tsc --noEmit
```

**Acceptance:** No type errors

### P8.5: Run Unit Tests

**Command:**
```bash
npm test
```

**Acceptance:** All tests pass

### P8.6: Run E2E Tests

**Command:**
```bash
npx playwright test e2e/chat-ui-integration.spec.ts --workers=1
```

**Acceptance:** All tests pass, especially "Add via Chat" tests

### P8.7: Commit Phase 8

**Commit when:** All tests pass

```bash
git add -A && git commit -m "Phase 8: Upgrade to Mastra v1"
```

### P8 Checkpoint

- [ ] Latest Mastra packages installed
- [ ] Breaking changes fixed
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] E2E tests pass
- [ ] Committed

---

## Phase 9: Implement Mastra Sessions for Message History

**Goal:** Replace client-side message history with Mastra's built-in memory/sessions
**Verification:** Message history persists across page refreshes, E2E tests pass

### Current State

Message history is managed client-side:
1. Client stores messages in React state
2. On each request, full message array is sent to `/api/chat`
3. No server-side persistence

### Target State

Use Mastra's Memory system:
1. Each conversation has a `threadId`
2. Messages are stored server-side via LibSQLStore or similar
3. History is automatically loaded by Mastra
4. Client only sends new message, not full history

### P9.1: Install Memory Dependencies

**Command:**
```bash
npm install @mastra/memory @mastra/pg
```

### P9.2: Create Memory Configuration

**Files:** `src/mastra/memory.ts` (new)

**Note:** Use PostgreSQL (Supabase) for storage. Environment variables are in `.env.local`.

**Changes:**
```typescript
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";

export function createMemory() {
  return new Memory({
    storage: new PostgresStore({
      id: "gtd-memory",
      connectionString: process.env.DATABASE_URL!,
    }),
    options: {
      lastMessages: 20,
      generateTitle: true,
    },
  });
}
```

### P9.3: Update GTD Agent to Use Memory

**Files:** `src/mastra/agents/gtd-agent.ts`

**Changes:**
```typescript
import { createMemory } from '../memory';

export function createGtdAgent(userId: string) {
  return new Agent({
    id: 'gtd-agent',
    name: 'GTD Assistant',
    instructions: GTD_INSTRUCTIONS,
    model: 'openrouter/openai/gpt-4o-mini',
    tools: createGtdTools(userId),
    memory: createMemory(),
  });
}
```

### P9.4: Update Chat Route for Sessions

**Files:** `app/api/chat/route.ts`

**Changes:**
- Accept `threadId` from client (or generate new one)
- Pass `resource` (userId) and `thread` (threadId) to agent
- Return `threadId` in response for client to track

**New request format:**
```typescript
interface ChatRequest {
  message: string;      // Just the new message
  threadId?: string;    // Optional, generated if not provided
}
```

**Agent call:**
```typescript
const response = await agent.stream(message, {
  memory: {
    resource: userId,
    thread: threadId,
  },
});
```

### P9.5: Update Client Chat Component

**Files:** `components/ChatPanel.tsx` (or similar)

**Changes:**
- Store `threadId` in state
- On "New Chat", clear `threadId` to start fresh thread
- Send only new message (not full history) to API
- Receive and store `threadId` from API response

### P9.6: Add Message History Persistence Tests

**Files:** `e2e/chat-ui-integration.spec.ts`

**New tests:**
```typescript
test.describe('Message History Persistence', () => {
  test('messages persist after page refresh', async ({ page }) => {
    // Send a message
    // Refresh page
    // Verify previous messages are still visible
  });

  test('New Chat button starts fresh conversation', async ({ page }) => {
    // Send a message
    // Click "New Chat"
    // Verify old messages are cleared
    // Send another message
    // Verify only new message visible
  });

  test('conversation context is preserved', async ({ page }) => {
    // Send "Remember my favorite color is blue"
    // Wait for response
    // Send "What is my favorite color?"
    // Verify agent responds with "blue"
  });
});
```

### P9.7: Run All Tests

**Commands:**
```bash
npx tsc --noEmit
npm test
npx playwright test e2e/chat-ui-integration.spec.ts --workers=1
```

**Acceptance:** All pass

### P9.8: E2E Test Add via Chat Buttons

**Command:**
```bash
npx playwright test e2e/chat-ui-integration.spec.ts --grep "Add via Chat" --workers=1
```

**Acceptance:** All "Add via Chat - Tab Placement" tests still pass

### P9.9: Ensure Consistent Tool Implementation

**Goal:** Ensure all 9 tools use consistent patterns with the latest Mastra API

**Files:** `src/mastra/tools/*.ts`

**Changes:**
- Review all tools for consistency
- Ensure all tools use the same Mastra v1 API patterns
- Update any tools that use deprecated or inconsistent patterns
- Verify consistent error handling across all tools
- Ensure consistent logging patterns

**Acceptance:** All tools follow the same implementation pattern

### P9.10: Commit Phase 9

**Commit when:** All tests pass

```bash
git add -A && git commit -m "Phase 9: Implement Mastra sessions for message history"
```

### P9 Checkpoint

- [ ] Memory packages installed
- [ ] Memory configuration created
- [ ] Agent uses memory
- [ ] Chat route updated for sessions
- [ ] Client updated to use threadId
- [ ] Message history persists (E2E test)
- [ ] New Chat clears thread (E2E test)
- [ ] Context preserved in conversation (E2E test)
- [ ] Add via Chat still works correctly
- [ ] All tools use consistent implementation patterns
- [ ] Committed

---

## Final Checklist

- [ ] All phases complete (P0-P9)
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] `/docs/current/` updated
- [ ] Old code removed
- [ ] Ready for review

---

## Risk Areas

1. **Mastra API changes** - Beta library, APIs may differ from docs
2. **Streaming** - May need `agent.stream()` vs `agent.generate()`
3. **OpenRouter model string** - Format may need adjustment
4. **Tool execution context** - Verify userId flows correctly

---

## Rollback Plan

If critical issues arise:
1. Git revert to pre-migration commit
2. Or: restore deleted directories from backup branch
3. Service layer unchanged - rollback isolated to AI interface
