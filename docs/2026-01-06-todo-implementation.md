# Todo List Manager - Implementation Plan

**Date:** 2026-01-06
**Related:** [Concept](./2026-01-06-todo-concept.md) | [Architecture](./2026-01-06-todo-architecture.md)

## Overview

Phased implementation with testing at each stage. Claude Code performs testing as we progress through each phase.

## Phase Summary

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Skill Creation & CLI Testing | None |
| 2 | Data Directory Setup | Phase 1 |
| 3 | Core Chat Infrastructure | Phase 2 |
| 4 | Integration Testing | Phase 3 |
| 5 | Polish & Edge Cases | Phase 4 |

---

## Phase 1: Skill Creation & CLI Testing

### Objective
Create the todo-manager skill and verify it works via direct CLI invocation.

### Tasks

- [ ] Create `.claude/skills/todo-manager/` directory
- [ ] Write `SKILL.md` with full skill definition
- [ ] Create `/data/` directory
- [ ] Create initial empty `todos.json`

### Implementation

**1.1 Create skill directory structure**
```
.claude/
└── skills/
    └── todo-manager/
        └── SKILL.md
```

**1.2 Write SKILL.md**
Full skill definition as specified in architecture document.

**1.3 Create data directory**
```
data/
└── todos.json  (empty initial state)
```

### Testing (Phase 1)

Claude Code will test directly via CLI:

```bash
# Test 1: Skill activation - adding a task
claude -p "add buy milk to my todo list"

# Test 2: List empty/single item
claude -p "show my todos"

# Test 3: Complete a task
claude -p "mark buy milk as done"

# Test 4: Add another task
claude -p "remind me to call the dentist tomorrow"

# Test 5: List multiple items
claude -p "what's on my list"

# Test 6: Remove a task
claude -p "remove the milk task"

# Test 7: Clear completed
claude -p "clear completed tasks"
```

### Success Criteria (Phase 1)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Add task | Task appears in todos.json | ✅ |
| List tasks | Formatted list displayed | ✅ |
| Complete task | completed=true, completedAt set | ✅ |
| Remove task | Task removed from JSON | ✅ |
| Clear completed | Only pending tasks remain | ✅ |
| Skill activates | Todo-related prompts trigger skill | ✅ |
| Priority parsing | High/low priority detected | ✅ |
| Due date parsing | "tomorrow" → correct date | ✅ |

### Verification
- [x] `todos.json` contains valid JSON after all operations
- [x] No data loss during operations
- [x] Responses are clear and concise

**Phase 1 Complete: 2026-01-06**

---

## Phase 2: Chat Infrastructure Foundation

### Objective
Set up the Next.js project with Vercel AI SDK and basic chat UI.

### Tasks

- [ ] Initialize Next.js project with TypeScript
- [ ] Install dependencies (ai, @ai-sdk/react)
- [ ] Create basic page layout
- [ ] Implement useChat hook with basic UI
- [ ] Create placeholder /api/chat route

### Implementation

**2.1 Project initialization**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
npm install ai @ai-sdk/react
```

**2.2 Basic chat component**
```typescript
// app/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';
// Basic chat UI implementation
```

**2.3 Placeholder API route**
```typescript
// app/api/chat/route.ts
// Returns mock streaming response initially
```

### Testing (Phase 2)

```bash
# Test 1: Dev server starts
npm run dev

# Test 2: Page loads at localhost:3000

# Test 3: Chat input renders and accepts text

# Test 4: Submit triggers API call (check network tab)

# Test 5: Mock response displays in chat
```

### Success Criteria (Phase 2)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Dev server runs | No errors on startup | ⬜ |
| Page renders | Chat UI visible | ⬜ |
| Input works | Can type messages | ⬜ |
| API called | POST to /api/chat | ⬜ |
| Response displays | Mock text appears | ⬜ |

---

## Phase 3: CLI Adapter Implementation

### Objective
Implement the ClaudeAdapter interface and CLIAdapter to connect chat to Claude Code.

### Tasks

- [ ] Create adapter types (`lib/adapters/types.ts`)
- [ ] Implement CLIAdapter (`lib/adapters/cli-adapter.ts`)
- [ ] Create logging service (`lib/services/logger.ts`)
- [ ] Update /api/chat to use adapter
- [ ] Transform Claude output to SSE stream

### Implementation

**3.1 Adapter types**
```typescript
// lib/adapters/types.ts
interface ClaudeAdapter { ... }
interface ClaudeMessage { ... }
```

**3.2 CLI Adapter**
```typescript
// lib/adapters/cli-adapter.ts
export class CLIAdapter implements ClaudeAdapter { ... }
```

**3.3 Logging service**
```typescript
// lib/services/logger.ts
export class SessionLogger { ... }
```

**3.4 API route integration**
```typescript
// app/api/chat/route.ts
// Wire up CLIAdapter with SSE streaming
```

### Testing (Phase 3)

```bash
# Test 1: Adapter spawns claude process
# (Check logs for process spawn)

# Test 2: JSON streaming parses correctly
# Send: "hello"
# Verify: Claude response streams to frontend

# Test 3: Session logging works
# Check: logs/session-*.jsonl created

# Test 4: Multiple messages in session
# Send: "hi" then "how are you"
# Verify: Context maintained
```

### Success Criteria (Phase 3)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Process spawns | Claude CLI executes | ⬜ |
| JSON parses | Messages extracted | ⬜ |
| SSE streams | Real-time display | ⬜ |
| Logs created | JSONL file written | ⬜ |
| Session works | Context preserved | ⬜ |

---

## Phase 4: Full Integration Testing

### Objective
Test the complete flow: Chat UI → API → Claude CLI → Todo Skill → File Operations → Response

### Tasks

- [ ] Verify skill loads through chat interface
- [ ] Test all CRUD operations via chat
- [ ] Verify logging captures tool use
- [ ] Test error handling
- [ ] Performance check (response time)

### Testing (Phase 4)

**Full flow tests via chat UI:**

```
Test 4.1: Add task through chat
├─ Input: "add buy groceries to my list"
├─ Expected: Confirmation message
├─ Verify: todos.json updated
└─ Status: ⬜

Test 4.2: List tasks through chat
├─ Input: "show my todos"
├─ Expected: Formatted list
├─ Verify: All items displayed
└─ Status: ⬜

Test 4.3: Complete task through chat
├─ Input: "mark groceries as done"
├─ Expected: Confirmation
├─ Verify: completed=true in JSON
└─ Status: ⬜

Test 4.4: Remove task through chat
├─ Input: "delete the groceries task"
├─ Expected: Confirmation
├─ Verify: Item removed from JSON
└─ Status: ⬜

Test 4.5: Multi-turn conversation
├─ Input: "add task A" → "add task B" → "show list"
├─ Expected: Both tasks visible
├─ Verify: Session context preserved
└─ Status: ⬜

Test 4.5b: Contextual follow-ups (KEY TEST)
├─ Input sequence:
│   1. "add buy milk"
│   2. "actually make that oat milk"  ← contextual edit
│   3. "and make it high priority"    ← continued context
│   4. "show my list"
├─ Expected: Single task "buy oat milk" with high priority
├─ Verify: Claude resolved "that" and "it" from context
└─ Status: ⬜

Test 4.5c: Pronoun resolution
├─ Input: "add call dentist" → "when is that due?"
├─ Expected: Claude asks about/reports due date for "call dentist"
├─ Verify: "that" resolves to most recent task
└─ Status: ⬜

Test 4.6: Logging verification
├─ Action: Perform several operations via chat
├─ Verify: logs/session-{id}-{timestamp}.jsonl exists
├─ Log must contain (in order):
│   - {"type":"session_start",...}
│   - {"type":"user","content":"add buy milk"}
│   - {"type":"tool_use","tool":"Read",...}
│   - {"type":"tool_result","tool":"Read",...}
│   - {"type":"tool_use","tool":"Write",...}
│   - {"type":"tool_result","tool":"Write",...}
│   - {"type":"assistant","content":"Added..."}
│   - {"type":"session_end",...}
├─ Each entry must have: ts, sessionId, type
└─ Status: ⬜

Test 4.7: Log readability check
├─ Action: Feed session JSONL to Claude
├─ Prompt: "Convert this session log to readable markdown"
├─ Verify: Output is human-readable summary
└─ Status: ⬜
```

### Success Criteria (Phase 4)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Add via chat | Task in JSON | ⬜ |
| List via chat | Formatted display | ⬜ |
| Complete via chat | Status updated | ⬜ |
| Delete via chat | Task removed | ⬜ |
| Session context | Multi-turn works | ⬜ |
| Contextual edits | "make that..." resolves | ⬜ |
| JSONL logging | All events in log file | ⬜ |
| Log completeness | tool_use + tool_result pairs | ⬜ |

---

## Phase 5: Polish & Edge Cases

### Objective
Handle edge cases, improve UX, and ensure robustness.

### Tasks

- [ ] Handle empty todo list gracefully
- [ ] Fuzzy task matching (typos, partial names)
- [ ] Priority and due date parsing
- [ ] Error recovery (corrupted JSON)
- [ ] UI polish (loading states, error display)

### Testing (Phase 5)

```
Test 5.1: Empty list handling
├─ Input: "show my todos" (with empty list)
├─ Expected: Friendly empty state message
└─ Status: ⬜

Test 5.2: Fuzzy matching
├─ Input: "complete the grocery task" (actual: "buy groceries")
├─ Expected: Matches and completes correct task
└─ Status: ⬜

Test 5.3: Priority parsing
├─ Input: "add urgent: call doctor"
├─ Expected: priority="high" in JSON
└─ Status: ⬜

Test 5.4: Due date parsing
├─ Input: "add submit report by Friday"
├─ Expected: dueDate set to next Friday
└─ Status: ⬜

Test 5.5: Corrupted JSON recovery
├─ Action: Manually corrupt todos.json
├─ Input: "show my todos"
├─ Expected: Error message, option to reset
└─ Status: ⬜

Test 5.6: Non-todo prompts
├─ Input: "what's the weather like?"
├─ Expected: Normal response (skill not activated)
└─ Status: ⬜
```

### Success Criteria (Phase 5)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Empty state | Helpful message | ⬜ |
| Fuzzy match | Finds similar tasks | ⬜ |
| Priority | Parsed correctly | ⬜ |
| Due dates | Dates extracted | ⬜ |
| Error recovery | Graceful handling | ⬜ |
| Skill boundary | Only activates for todos | ⬜ |

---

## Implementation Order

```
Week 1: Phase 1 (Skill) + Phase 2 (Chat Foundation)
        └─ Parallel work possible

Week 2: Phase 3 (Adapter)
        └─ Depends on Phase 2

Week 3: Phase 4 (Integration) + Phase 5 (Polish)
        └─ Sequential testing
```

## Test Results Log

### Phase 1 Results
```
Date: 2026-01-06
Tester: Claude Code

Test 1.1 - Add task:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: add buy milk'
  Result: PASS
  Output: Added "Buy milk" to your list.
  Verified: data/todos.json updated with new task

Test 1.2 - List tasks:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: show my todos'
  Result: PASS
  Output: You have 1 item:
            1. [ ] Buy milk

Test 1.3 - Complete task:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: mark buy milk as done'
  Result: PASS
  Output: Marked "Buy milk" as complete.
  Verified: completed=true, completedAt set in JSON

Test 1.4 - Add task with priority/due date:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: add call dentist tomorrow, high priority'
  Result: PASS
  Output: Added "Call dentist" to your list (high priority, due: 2026-01-07).
  Verified: priority="high", dueDate="2026-01-07" in JSON

Test 1.5 - List multiple items:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: show my list'
  Result: PASS
  Output: You have 2 items:
            1. [x] Buy milk
            2. [ ] Call dentist (high priority, due: 2026-01-07)

Test 1.6 - Remove task:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: remove buy milk'
  Result: PASS
  Output: Removed "Buy milk" from your list.
  Verified: Task removed from JSON

Test 1.7 - Clear completed:
  Command: claude -p 'Use Skill tool to invoke "todo-manager" with: clear completed tasks'
  Result: PASS
  Output: Cleared 1 completed task.
  Verified: Only pending tasks remain in JSON

Note: Skill must be invoked via Skill tool explicitly, or will auto-activate
      when skill description matches user intent.
```

### Phase 2 Results
```
Date: [TBD]
Tester: Claude Code

[To be filled during implementation]
```

### Phase 3 Results
```
Date: [TBD]
Tester: Claude Code

[To be filled during implementation]
```

### Phase 4 Results
```
Date: [TBD]
Tester: Claude Code

[To be filled during implementation]
```

### Phase 5 Results
```
Date: [TBD]
Tester: Claude Code

[To be filled during implementation]
```

---

## Rollback Plan

If issues arise:

1. **Skill issues:** Disable skill by renaming `.claude/skills/todo-manager/`
2. **Data corruption:** Restore from `data/todos.json.backup` (created before operations)
3. **Chat issues:** Fall back to direct CLI testing
4. **Full rollback:** Git reset to last known good state

## Definition of Done

- [ ] All Phase 1-5 tests passing
- [ ] Todo operations work end-to-end via chat
- [ ] Session logs capture all activity
- [ ] No data loss scenarios
- [ ] Documentation updated with final state
- [ ] Code committed and pushed to GitHub
