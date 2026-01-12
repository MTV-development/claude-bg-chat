# Move to Mastra - Analysis Document

**Created:** 2026-01-12
**Status:** Draft

## Executive Summary

This document analyzes the current GTD Todo Manager implementation to prepare for migration from a Claude CLI-based skill system to a Mastra-based AI agent architecture.

---

## Current Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                        │
│  ┌──────────────────┐              ┌──────────────────────────┐ │
│  │   Chat Panel     │              │     TodoList Panel       │ │
│  │  (Claude Chat)   │              │  Focus|Optional|Later|...│ │
│  └────────┬─────────┘              └────────────┬─────────────┘ │
│           │                                     │               │
│           ▼                                     ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Zustand Store (todoStore.ts)                   ││
│  │         Real-time sync via Supabase subscriptions           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────────┐
│  /api/chat/route.ts  │              │   /api/todos/* routes    │
│  (Claude CLI Adapter)│              │   (REST endpoints)       │
└──────────┬───────────┘              └────────────┬─────────────┘
           │                                       │
           ▼                                       │
┌──────────────────────┐                          │
│   claude-backend/    │                          │
│  ┌────────────────┐  │                          │
│  │  SKILL.md      │  │                          │
│  │  (todo-manager)│  │                          │
│  └───────┬────────┘  │                          │
│          ▼           │                          │
│  ┌────────────────┐  │                          │
│  │ scripts/gtd/   │  │                          │
│  │   cli.ts       │──┼──────────────────────────┤
│  │   commands/*   │  │                          │
│  └────────────────┘  │                          │
└──────────────────────┘                          │
                                                  ▼
                                       ┌──────────────────────────┐
                                       │  lib/services/todos/*    │
                                       │  lib/services/projects/* │
                                       └────────────┬─────────────┘
                                                    ▼
                                       ┌──────────────────────────┐
                                       │       Supabase           │
                                       │  (PostgreSQL + Realtime) │
                                       └──────────────────────────┘
```

### Two Paths to Data

1. **Chat Path**: User → Chat UI → `/api/chat` → Claude CLI → `scripts/gtd/cli.ts` → Services → Supabase
2. **Direct Path**: User → TodoList UI → `/api/todos/*` → Services → Supabase

---

## GTD Domain Model

### Core Entities

| Entity | Description |
|--------|-------------|
| **Todo** | A captured item (raw thought or clarified action) |
| **Project** | A grouping container for related todos |
| **ActivityLog** | Audit trail of all todo mutations |

### Todo Properties

| Property | Type | Purpose |
|----------|------|---------|
| `title` | string | Raw capture - what user originally said |
| `nextAction` | string? | Clarified, concrete action step |
| `status` | enum | `inbox` \| `active` \| `someday` \| `done` |
| `dueDate` | date? | When it needs to be done by |
| `canDoAnytime` | boolean | Marks as "optional" - no deadline pressure |
| `projectId` | UUID? | Links to parent project |
| `postponeCount` | number | How many times postponed (triggers warning at 3+) |

### GTD Tab Logic (View Routing)

```
Todo → Which Tab?

if status === 'done'           → Done
if dueDate <= today            → Focus (urgent)
if canDoAnytime === true       → Optional (do whenever)
if dueDate > today             → Later (scheduled future)
else                           → Inbox (needs clarification)
```

**Clarification Rule**: An inbox item graduates to a real tab when it has BOTH:
1. A `nextAction` (concrete step)
2. Either a `dueDate` OR `canDoAnytime: true`

---

## Current Claude Skill Capabilities

### CLI Commands (What the AI Can Do)

| Command | Purpose | Key Options |
|---------|---------|-------------|
| `add` | Create new task | `--due`, `--project`, `--status`, `--can-do-anytime` |
| `list` | View tasks | `--tab`, `--project`, `--completed`, `--pending` |
| `complete` | Mark done | by ID or title |
| `uncomplete` | Undo completion | by ID or title |
| `clarify` | Set next action | `--next-action`, `--project` |
| `postpone` | Push deadline | `--days N` |
| `update` | Modify any property | all properties available |
| `remove` | Delete task | by ID, title, or `--project` |
| `projects` | List projects | shows counts |

### Skill Behavioral Guidelines

From `claude-backend/.claude/skills/todo-manager/SKILL.md`:

1. **Smart Status Routing**:
   - Clear actions → `status: active` ("buy milk", "call dentist")
   - Vague/project-like → `status: inbox` ("think about career", "plan vacation")

2. **Always Action-Oriented**: Execute a command OR ask a clarifying question, never just acknowledge.

3. **Hide Technical Details**: No CLI syntax, JSON, or internal field names shown to user.

4. **Fresh Data First**: Never assume what tasks exist - always list first.

5. **Clarification Workflow**: When clarifying, ask for next action + timing, then use `update` with both.

---

## UI Capabilities (Direct Manipulation)

### TodoList Actions

| UI Element | Action | API Call |
|------------|--------|----------|
| Checkbox | Complete/uncomplete | `PATCH /api/todos` |
| "Do Today" button | Set dueDate to today | `PATCH /api/todos` |
| Postpone dropdown | Push deadline forward | `POST /api/todos/postpone` |
| Delete button | Remove task | `DELETE /api/todos` |
| Bulk select + Complete | Complete multiple | `PATCH /api/todos` (multiple) |
| Bulk select + Clarify | Opens clarify flow | `PATCH /api/todos` (multiple) |

### AddItemModal Flow

1. Task or Project?
2. If task: Has deadline? (yes → date picker, no → can do anytime?)
3. Optional project assignment
4. Creates via `POST /api/todos/add`

---

## What Needs to Migrate to Mastra

### Current: Claude CLI Skill

```
User Message
    → /api/chat
    → Claude Code CLI (spawned process)
    → SKILL.md instructions
    → Bash commands to scripts/gtd/cli.ts
    → Service layer
    → Supabase
```

### Target: Mastra Agent

```
User Message
    → Mastra Agent
    → Tool calls (add, list, complete, etc.)
    → Service layer (reused)
    → Supabase
```

### Migration Mapping

| Current | Mastra Equivalent |
|---------|-------------------|
| `SKILL.md` | Agent system prompt / instructions |
| CLI commands | Mastra Tools |
| Claude CLI process | Mastra Agent runtime |
| `/api/chat/route.ts` | Mastra API endpoint |
| Streaming response | Mastra streaming |

---

## Required Mastra Tools

Based on current CLI capabilities, we need these Mastra tools:

### 1. `addTodo`
```typescript
{
  title: string;
  dueDate?: string;      // YYYY-MM-DD, "today", "tomorrow", "+N days"
  project?: string;
  status?: 'inbox' | 'active';
  canDoAnytime?: boolean;
}
```

### 2. `listTodos`
```typescript
{
  tab?: 'focus' | 'optional' | 'later' | 'inbox' | 'done';
  project?: string;
  completed?: boolean;
  pending?: boolean;
}
```

### 3. `completeTodo`
```typescript
{
  identifier: string;  // ID or title (partial match supported)
}
```

### 4. `uncompleteTodo`
```typescript
{
  identifier: string;
}
```

### 5. `clarifyTodo`
```typescript
{
  identifier: string;
  nextAction: string;
  project?: string;
}
```

### 6. `postponeTodo`
```typescript
{
  identifier: string;
  days: number;
}
```

### 7. `updateTodo`
```typescript
{
  identifier: string;
  title?: string;
  nextAction?: string;
  dueDate?: string | null;  // null to clear
  project?: string | null;
  status?: 'inbox' | 'active' | 'someday' | 'done';
  canDoAnytime?: boolean;
}
```

### 8. `removeTodo`
```typescript
{
  identifier?: string;
  project?: string;  // remove all in project
}
```

### 9. `listProjects`
```typescript
{}  // no params, returns projects with counts
```

---

## Key Considerations for Migration

### 1. Service Layer Reuse
The `lib/services/todos/*` and `lib/services/projects/*` are clean and can be called directly from Mastra tools. No changes needed.

### 2. User Context
Current system passes `GTD_USER_ID` via environment. Mastra tools will need user context passed differently (likely via tool context or agent state).

### 3. Streaming
Current chat streams responses. Need to understand Mastra's streaming capabilities.

### 4. Session/State
Current system has warm CLI sessions for faster responses. Need to understand Mastra's session model.

### 5. Error Handling
CLI returns structured errors. Mastra tools should return similar error structures for the agent to interpret.

### 6. Confirmation Flows
Postpone 3+ times triggers confirmation. Need to handle multi-turn confirmation in Mastra.

---

## Open Questions

- [ ] What Mastra projects to reference for patterns?
- [ ] How does Mastra handle user authentication/context?
- [ ] Streaming response format in Mastra?
- [ ] How to handle multi-turn flows (like postpone confirmation)?
- [ ] Where will the Mastra agent code live? (replace claude-backend? new directory?)
- [ ] Integration with existing Zustand store and real-time updates?

---

## Mastra Reference Architecture (from aiffirmation-proto)

### Project Structure Pattern

```
src/
├── mastra/
│   ├── index.ts              # Singleton Mastra instance
│   ├── agents/
│   │   └── gtd-agent.ts      # GTD agent definition
│   └── tools/
│       ├── add-todo.ts
│       ├── list-todos.ts
│       ├── complete-todo.ts
│       └── ...
├── lib/
│   └── services/             # (existing - reused)
└── app/
    └── api/
        └── chat/
            └── route.ts      # New Mastra-based endpoint
```

### Mastra Singleton Pattern

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { gtdAgent } from './agents/gtd-agent';

const globalForMastra = globalThis as unknown as {
  mastra: Mastra | undefined;
};

export const mastra =
  globalForMastra.mastra ??
  new Mastra({
    agents: { gtdAgent },
    logger: new PinoLogger({
      name: 'GTD-Mastra',
      level: 'info',
    }),
  });

globalForMastra.mastra = mastra;
```

### Agent Definition Pattern

```typescript
// src/mastra/agents/gtd-agent.ts
import { Agent } from '@mastra/core/agent';
import { addTodo, listTodos, completeTodo, ... } from '../tools';

export const gtdAgent = new Agent({
  id: 'gtd-agent',
  name: 'GTD Assistant',
  instructions: `You are a GTD (Getting Things Done) assistant...

  ## Smart Status Routing
  - Clear actions → status: active ("buy milk", "call dentist")
  - Vague/project-like → status: inbox ("think about career")

  ## Always Action-Oriented
  Execute a command OR ask a clarifying question, never just acknowledge.

  ## Hide Technical Details
  Never show internal IDs, JSON, or technical field names to users.

  ## Fresh Data First
  Always list tasks before assuming what exists.
  `,
  model: 'openai/gpt-4o-mini',  // or via getModel() helper
  tools: { addTodo, listTodos, completeTodo, ... },
});
```

### Tool Definition Pattern

Tools call services directly (no CLI layer):

```typescript
// src/mastra/tools/add-todo.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createTodo } from '@/lib/services/todos/create-todo';
import { getOrCreateProject } from '@/lib/services/projects/get-or-create-project';
import { parseDateInput } from '@/lib/utils/date-parser';

export const addTodo = createTool({
  id: 'add-todo',
  description: 'Add a new task to the GTD system',
  inputSchema: z.object({
    title: z.string().describe('The task title or raw capture'),
    dueDate: z.string().optional().describe('Due date: YYYY-MM-DD, "today", "tomorrow", or "+N days"'),
    project: z.string().optional().describe('Project name to assign to'),
    status: z.enum(['inbox', 'active']).optional().describe('Initial status'),
    canDoAnytime: z.boolean().optional().describe('Mark as optional (no deadline pressure)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    todo: z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ title, dueDate, project, status, canDoAnytime }, { userId }) => {
    try {
      // Resolve project if provided
      let projectId: string | undefined;
      if (project) {
        const proj = await getOrCreateProject({ userId, name: project });
        projectId = proj.id;
      }

      // Parse date input (handles "today", "+3 days", etc.)
      const parsedDate = dueDate ? parseDateInput(dueDate) : undefined;

      // Call service directly
      const todo = await createTodo({
        userId,
        title,
        nextAction: title,  // Default nextAction = title
        dueDate: parsedDate,
        projectId,
        status: status || 'active',
        canDoAnytime: canDoAnytime || false,
      });

      return { success: true, todo: { id: todo.id, title: todo.title, status: todo.status } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});
```

### Server Action Pattern (for API)

```typescript
// app/api/chat/actions.ts
'use server';

import { mastra } from '@/src/mastra';

export async function sendMessage(message: string, userId: string) {
  try {
    const agent = mastra.getAgent('gtd-agent');

    // Pass userId to tools via context
    const result = await agent.generate(message, {
      context: { userId },
    });

    return {
      status: 'success',
      response: result.text,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
    };
  }
}
```

### User Context Handling

From aiffirmation-proto, user context flows through:
1. **API layer** receives userId (from auth/session)
2. **Agent.generate()** accepts context object
3. **Tools** receive context in execute function

For GTD, we need to:
```typescript
// Tool execute signature with context
execute: async (input, { userId }) => {
  // userId available from context
  const todos = await listTodos({ userId, ...input });
  return todos;
}
```

### Key Dependencies

```json
{
  "@mastra/core": "^1.0.0-beta.19",
  "@mastra/loggers": "^1.0.0-beta.3",
  "zod": "^4.x"
}
```

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                        │
│  ┌──────────────────┐              ┌──────────────────────────┐ │
│  │   Chat Panel     │              │     TodoList Panel       │ │
│  │                  │              │  Focus|Optional|Later|...│ │
│  └────────┬─────────┘              └────────────┬─────────────┘ │
│           │                                     │               │
│           ▼                                     ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Zustand Store (todoStore.ts)                   ││
│  │         Real-time sync via Supabase subscriptions           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────────┐
│  /api/chat           │              │   /api/todos/* routes    │
│  ┌────────────────┐  │              │   (REST - unchanged)     │
│  │ getUserId()    │  │              │                          │
│  │      ↓         │  │              │                          │
│  │ createGtdAgent │  │              │                          │
│  │   (userId)     │  │              │                          │
│  └───────┬────────┘  │              └────────────┬─────────────┘
└──────────┼───────────┘                           │
           ▼                                       │
┌──────────────────────┐                          │
│   src/mastra/        │                          │
│  ┌────────────────┐  │                          │
│  │ createGtdAgent │  │                          │
│  │   (userId)     │  │                          │
│  └───────┬────────┘  │                          │
│          ▼           │                          │
│  ┌────────────────┐  │                          │
│  │ createGtdTools │  │                          │
│  │   (userId)     │──┼──────────────────────────┤
│  │  9 tool        │  │                          │
│  │  factories     │  │                          │
│  └────────────────┘  │                          │
└──────────────────────┘                          │
                                                  ▼
                                       ┌──────────────────────────┐
                                       │  lib/services/todos/*    │
                                       │  lib/services/projects/* │
                                       │  lib/utils/date-parser   │
                                       │  (reused)                │
                                       └────────────┬─────────────┘
                                                    ▼
                                       ┌──────────────────────────┐
                                       │       Supabase           │
                                       │  (unchanged)             │
                                       └──────────────────────────┘
```

**Request Flow:**
1. Chat UI sends message to `/api/chat`
2. API extracts `userId` from Supabase auth session
3. `createGtdAgent(userId)` creates agent with userId-bound tools
4. Agent processes message, calls tools as needed
5. Tools call services directly (no CLI)
6. Services persist to Supabase
7. Zustand store receives real-time updates
8. UI reflects changes

---

## Architecture Decision

**Chosen: Single Agent with Tools**

Rationale:
- Simple operations (add, complete, list) are single-turn
- Multi-turn flows (clarification, confirmation) handled naturally by agent conversation
- No need for workflow state persistence - all interactions happen in single session
- Weekly review / inbox processing not currently implemented as structured rituals

**CLI Removal**: The CLI layer (`scripts/gtd/`) is no longer needed. Mastra tools call services directly.

```
Before: Agent → CLI commands → CLI parser → Services → DB
After:  Agent → Tools → Services → DB
```

---

## Migration Plan Summary

### What Gets Removed
- `claude-backend/` directory (entire Claude skill system)
- `scripts/gtd/` directory (entire CLI layer)
- `lib/adapters/` directory (CLI adapter code)
- Dead imports and references to removed code

### What Gets Added
- `src/mastra/index.ts` - Mastra singleton
- `src/mastra/agents/gtd-agent.ts` - Agent factory with GTD instructions
- `src/mastra/tools/*.ts` - 9 tool factories calling services directly
- `lib/utils/date-parser.ts` - Extracted from scripts/gtd/lib/store.ts
- Updated `/api/chat/` - Uses createGtdAgent(userId)

### What Gets Updated
- `docs/current/technical-architecture.md` - New Mastra architecture
- `docs/current/overview.md` - Remove Claude CLI references
- `docs/current/environment-validation.md` - Verify commands still apply

### What Stays the Same
- `lib/services/todos/*` - All service layer code
- `lib/services/projects/*` - Project services
- `lib/stores/todoStore.ts` - Zustand store
- `app/api/todos/*` - REST API endpoints
- `components/*` - All UI components
- `db/schema.ts` - Database schema
- Supabase real-time subscriptions

---

## Decisions

### Model Selection: OpenRouter
Use OpenRouter for model access (consistent with aiffirmation-proto):
```typescript
model: 'openrouter/openai/gpt-4o-mini'
```

### Instructions Storage: Inline
Keep agent instructions inline in code (not KV store). Simpler for this use case.

### Date Parsing: Move to lib/utils
Extract `parseDate()` and `getLocalDateString()` from `scripts/gtd/lib/store.ts` → `lib/utils/date-parser.ts`. Clean utility code, no rewrite needed.

### User Context: Agent Factory Pattern
Create agent per request with userId bound to tools:

```typescript
// src/mastra/index.ts - Mastra singleton (for logging, config)
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

const globalForMastra = globalThis as unknown as { mastra: Mastra | undefined };

export const mastra =
  globalForMastra.mastra ??
  new Mastra({
    logger: new PinoLogger({ name: 'GTD', level: 'info' }),
  });

globalForMastra.mastra = mastra;


// src/mastra/agents/gtd-agent.ts
import { Agent } from '@mastra/core/agent';
import { createGtdTools } from '../tools';

const GTD_INSTRUCTIONS = `You are a GTD (Getting Things Done) assistant...
[instructions here]
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


// src/mastra/tools/index.ts
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


// src/mastra/tools/add-todo.ts (example tool factory)
export function createAddTodoTool(userId: string) {
  return createTool({
    id: 'add-todo',
    description: 'Add a new task to the GTD system',
    inputSchema: z.object({
      title: z.string().describe('The task title'),
      dueDate: z.string().optional(),
      project: z.string().optional(),
      status: z.enum(['inbox', 'active']).optional(),
      canDoAnytime: z.boolean().optional(),
    }),
    execute: async (input) => {
      // userId is bound via closure
      // Note: createTodo takes (userId, input) as separate args
      const todo = await createTodo(userId, {
        title: input.title,
        dueDate: input.dueDate,
        status: input.status,
        canDoAnytime: input.canDoAnytime,
        projectId: input.project ? await getOrCreateProject(userId, input.project) : undefined,
      });
      return { success: true, todo };
    },
  });
}


// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json();
  const userId = await getUserIdFromSession(req);

  const agent = createGtdAgent(userId);
  const result = await agent.generate(message);

  return Response.json({ response: result.text });
}
```

**Why Agent Factory:**
- Explicit - userId bound at tool creation, no magic context passing
- Guaranteed to work - no dependency on Mastra's context forwarding
- Clean - each request gets fresh agent with correct user scope
- Mastra instance still singleton (avoids hot-reload issues)

---

## Open Questions (Resolved)

- [x] What Mastra projects to reference for patterns? → **aiffirmation-proto**
- [x] How to pass userId to tools? → **Agent factory pattern** (tools bound with userId)
- [x] Model selection? → **OpenRouter** (`openrouter/openai/gpt-4o-mini`)
- [x] Where to store agent instructions? → **Inline in code**
- [x] Date parsing? → **Move to `lib/utils/date-parser.ts`**
- [ ] Streaming: Does `agent.generate()` support streaming? (verify during implementation)
- [x] Postpone confirmation flow? → **Natural conversation** (agent asks follow-up)

---

## References

- Current skill: `claude-backend/.claude/skills/todo-manager/SKILL.md`
- CLI implementation: `scripts/gtd/cli.ts`
- Service layer: `lib/services/todos/*`
- Database schema: `db/schema.ts`
- Mastra reference: `C:\git\aiffirmation-proto`
