# GTD Todo Manager - Technical Architecture

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## System Overview

The application follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────────────────────┬─────────────────────────────┐  │
│  │      Chat Interface         │       TodoList UI           │  │
│  │      (app/page.tsx)         │   (components/TodoList.tsx) │  │
│  └─────────────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                          API LAYER                               │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │ /api/chat   │ /api/todos  │ /api/todos/ │ /api/todos/     │  │
│  │ (Mastra)    │             │ add         │ postpone        │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                         AI AGENT LAYER                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Mastra GTD Agent                          ││
│  │  addTodo | listTodos | completeTodo | clarifyTodo | ...      ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                       SERVICE LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    lib/services/                             ││
│  │  todos: create, update, find, list, delete, postpone        ││
│  │  projects: getOrCreate, list, deleteProjectTodos            ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Drizzle ORM + Supabase Realtime                            ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                        PERSISTENCE                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Supabase PostgreSQL                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 15.1.3 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS | 3.4.1 |
| State Management | Zustand | 5.0.9 |
| Language | TypeScript | 5.x |
| AI Agent | Mastra | 1.0.0-beta.21 |
| AI Memory | Mastra Memory + PostgresStore | 1.0.0-beta |
| Database | Supabase PostgreSQL | - |
| ORM | Drizzle | 0.45.1 |
| Real-time | Supabase Realtime | - |
| Testing | Jest | 30.2.0 |
| E2E Testing | Playwright | 1.57.0 |

## Component Architecture

### Frontend Components

```
app/
├── page.tsx              # Main page (chat + todo split view)
├── layout.tsx            # Root layout with metadata
├── globals.css           # Tailwind imports + global styles
└── api/                  # API routes (see API Layer)

components/
├── TodoList.tsx          # Main todo list with tabs
├── AddItemModal.tsx      # Modal for adding tasks/projects
├── PostponeDropdown.tsx  # Dropdown for postpone actions
└── ConfirmationModal.tsx # Reusable confirmation dialog
```

### Mastra AI Agent (`src/mastra/`)

```
src/mastra/
├── index.ts              # Mastra singleton with PinoLogger
├── memory.ts             # Memory configuration with PostgresStore
├── agents/
│   └── gtd-agent.ts      # GTD Agent factory with instructions + memory
└── tools/
    ├── index.ts          # createGtdTools(userId) factory
    ├── add-todo.ts       # Add new tasks
    ├── list-todos.ts     # List/filter tasks
    ├── complete-todo.ts  # Mark task complete
    ├── uncomplete-todo.ts # Undo completion
    ├── clarify-todo.ts   # Set next action
    ├── postpone-todo.ts  # Delay due date
    ├── update-todo.ts    # Modify any field
    ├── remove-todo.ts    # Delete task(s)
    └── list-projects.ts  # List projects
```

### Service Layer (`lib/services/`)

```
lib/services/
├── todos/
│   ├── create-todo.ts    # Create new todo
│   ├── update-todo.ts    # Update todo fields
│   ├── find-todo.ts      # Flexible todo lookup
│   ├── list-todos.ts     # List with tab filtering
│   ├── delete-todo.ts    # Delete single todo
│   └── postpone-todo.ts  # Postpone with tracking
├── projects/
│   ├── get-or-create-project.ts
│   ├── list-projects.ts
│   └── delete-project-todos.ts
├── auth/
│   ├── get-current-user.ts
│   └── sync-user.ts
└── logger.ts             # Session logging (JSONL)
```

## API Layer

### Endpoints

| Method | Path | Purpose | Handler |
|--------|------|---------|---------|
| POST | `/api/chat` | Mastra agent conversation | `app/api/chat/route.ts` |
| GET | `/api/todos` | List tasks (with tab filter) | `app/api/todos/route.ts` |
| PATCH | `/api/todos` | Update task | `app/api/todos/route.ts` |
| DELETE | `/api/todos` | Remove task | `app/api/todos/route.ts` |
| POST | `/api/todos/add` | Create task | `app/api/todos/add/route.ts` |
| POST | `/api/todos/postpone` | Postpone task | `app/api/todos/postpone/route.ts` |
| GET | `/api/todos/projects` | List projects | `app/api/todos/projects/route.ts` |

### Chat API Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌─────────────┐
│ Browser│────▶│ /api/chat  │────▶│ Mastra     │────▶│ OpenRouter  │
│        │◀────│            │◀────│ GTD Agent  │◀────│ GPT-4o-mini │
└────────┘     └────────────┘     └────────────┘     └─────────────┘
     │                                   │
     │ message + threadId                │ Tool calls
     │                                   ▼
     │                            ┌─────────────────┐
     │                            │ Service Layer   │
     │                            │ lib/services/*  │
     │                            └────────┬────────┘
     │                                     │
     │                                     ▼
     │                            ┌─────────────────┐
     └────────────────────────────│ Supabase        │
          Mastra Memory           │ PostgreSQL      │
          (conversation history)  └─────────────────┘
```

The chat API:
1. Authenticates user via Supabase
2. Creates a GTD agent bound to the user's ID with Mastra Memory
3. Accepts `message` + optional `threadId` (generates new threadId if not provided)
4. Streams the agent response back to the client with threadId in metadata
5. Agent tools directly call service layer functions
6. Conversation history is automatically stored and retrieved via Mastra Memory

## State Management

### Zustand Store (`lib/stores/`)

The frontend uses Zustand for reactive state management:

- **Normalized entity storage**: Todos and projects stored by ID
- **Supabase Realtime**: Subscribes to database changes
- **Selectors**: Tab filtering, project grouping

```typescript
interface TodoStore {
  entities: {
    todos: Record<string, Todo>;
    projects: Record<string, Project>;
  };
  isConnected: boolean;
  lastSyncedAt: number | null;
  // Internal actions for sync layer
  _setTodos: (todos: Todo[]) => void;
  _applyTodoChange: (payload: RealtimePayload) => void;
  // ... etc
}
```

## Data Flow

### Task Creation via Chat

```
User types "add buy milk tomorrow"
        │
        ▼
┌───────────────┐
│  /api/chat    │
│  (POST)       │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐
│ GTD Agent     │────▶│ addTodo Tool  │
└───────────────┘     └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │ createTodo    │
                      │ service       │
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │ Supabase DB   │
                      └───────┬───────┘
                              │ Realtime
                              ▼
                      ┌───────────────┐
                      │ Zustand Store │
                      │ UI updates    │
                      └───────────────┘
```

### Real-time Updates

Supabase Realtime pushes database changes to the client:

```
Database change
        │
        ▼
┌───────────────┐
│ Supabase      │
│ Realtime      │
└───────┬───────┘
        │ WebSocket
        ▼
┌───────────────┐
│ Store sync    │
│ layer         │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Zustand       │
│ selectors     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ React         │
│ re-render     │
└───────────────┘
```

## Error Handling

### API Error Responses

```typescript
// Standard error format
return Response.json(
  { error: 'Task not found' },
  { status: 404 }
)
```

### Mastra Tool Errors

In Mastra v1, tools throw errors instead of returning error responses:
```typescript
if (!todo) {
  throw new Error(`Could not find task matching "${identifier}"`);
}
```

The agent interprets thrown errors and provides natural language responses to users.

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `OPENROUTER_API_KEY` | OpenRouter API for LLM |

### Build Configuration

**TypeScript** (`tsconfig.json`):
- Strict mode enabled
- ES2017 target
- Path alias: `@/*` → `./`

**Tailwind** (`tailwind.config.ts`):
- Content: `app/`, `components/`, `pages/`

## Testing & Environment Validation

See [Environment Validation](./environment-validation.md) for:
- Pre-flight commands to verify codebase health
- Test structure and running tests
- Known issues and how to handle validation failures

## Security Considerations

### Authentication
- Supabase Auth for user management
- Row-level security in database
- User ID binding in agent tools

### Input Validation
- Zod schemas for all tool inputs
- Service layer validates ownership

### AI Integration
- Tools explicitly bound to authenticated user
- No arbitrary code execution

## Related Documentation

- [Overview](./overview.md) - Project introduction
- [High-Level Concept](./high-level-concept.md) - GTD workflow design
- [Data Model](./data-model.md) - Data structures and storage
