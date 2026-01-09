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
│  │             │             │ add         │ postpone        │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       BUSINESS LOGIC LAYER                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    CLI Commands                              ││
│  │  add | list | complete | clarify | postpone | remove | ...  ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    store.ts                                  ││
│  │              loadTodos() / saveTodos()                       ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                        PERSISTENCE                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  data/todos.json                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 15.1.3 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS | 3.4.1 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | - |
| Testing | Jest | 30.2.0 |
| AI Integration | Claude CLI | via adapter |

## Component Architecture

### Frontend Components

```
app/
├── page.tsx              # Main page (chat + todo split view)
├── layout.tsx            # Root layout with metadata
├── globals.css           # Tailwind imports + global styles
└── api/                  # API routes (see API Layer)

components/
├── TodoList.tsx          # Main todo list with tabs (31KB)
├── AddItemModal.tsx      # Modal for adding tasks/projects
├── PostponeDropdown.tsx  # Dropdown for postpone actions
└── ConfirmationModal.tsx # Reusable confirmation dialog
```

### TodoList Component (`components/TodoList.tsx`)

The largest component, handling the entire todo management UI.

**State Management**:
```typescript
// Tab state
const [activeTab, setActiveTab] = useState<Tab>('focus')
const [items, setItems] = useState<TodoItem[]>([])

// Bulk selection
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
const [bulkLoading, setBulkLoading] = useState(false)

// Tab counts for badges
const [tabCounts, setTabCounts] = useState<Record<Tab, number>>({})

// Modal states
const [showAddModal, setShowAddModal] = useState(false)
const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null)
```

**Key Features**:
- Parallel tab count fetching
- 2-second auto-refresh polling
- Bulk action processing (sequential to avoid race conditions)
- Tab-specific rendering and filtering
- Always-visible action button bar with tab-specific labels (Complete/Clarify/Undo)
- Individual Clarify buttons on Inbox tasks that populate the chat input

### CLI Commands (`scripts/gtd/commands/`)

Each command is a separate module exporting a handler function:

| Command | File | Purpose |
|---------|------|---------|
| `add` | `add.ts` | Create new tasks |
| `list` | `list.ts` | Query tasks with filters |
| `complete` | `complete.ts` | Mark task as done |
| `uncomplete` | `uncomplete.ts` | Mark task as not done |
| `clarify` | `clarify.ts` | Set next action |
| `postpone` | `postpone.ts` | Move due date forward |
| `remove` | `remove.ts` | Delete task |
| `update` | `update.ts` | Modify task properties |

**CLI Entry Point** (`scripts/gtd/cli.ts`):
```typescript
const commands = {
  add: addCommand,
  list: listCommand,
  complete: completeCommand,
  // ...
}

const [command, ...args] = process.argv.slice(2)
const handler = commands[command]
await handler(args)
```

## API Layer

### Endpoints

| Method | Path | Purpose | Handler |
|--------|------|---------|---------|
| POST | `/api/chat` | Claude conversation | `app/api/chat/route.ts` |
| GET | `/api/todos` | List tasks (with tab filter) | `app/api/todos/route.ts` |
| PATCH | `/api/todos` | Update task | `app/api/todos/route.ts` |
| DELETE | `/api/todos` | Remove task | `app/api/todos/route.ts` |
| POST | `/api/todos/add` | Create task | `app/api/todos/add/route.ts` |
| POST | `/api/todos/postpone` | Postpone task | `app/api/todos/postpone/route.ts` |
| GET | `/api/todos/projects` | List projects | `app/api/todos/projects/route.ts` |

### Chat API Flow

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌─────────┐
│ Browser│────▶│ /api/chat  │────▶│ CLIAdapter │────▶│ Claude  │
│        │◀────│            │◀────│            │◀────│ CLI     │
└────────┘     └────────────┘     └────────────┘     └─────────┘
     │                                   │
     │                                   ▼
     │                            ┌────────────┐
     │                            │ Logger     │
     │                            │ (JSONL)    │
     │                            └────────────┘
     │
     ▼
┌─────────────┐
│ TodoList    │ (polls /api/todos every 2s)
│ Component   │
└─────────────┘
```

### CLI Adapter (`lib/adapters/cli-adapter.ts`)

Spawns Claude CLI as a child process and streams responses:

```typescript
class CLIAdapter {
  async chat(options: ChatOptions): AsyncGenerator<string> {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--prompt', options.prompt,
      '--allowedTools', options.allowedTools.join(',')
    ]

    if (options.sessionId) {
      args.push('--resume', options.sessionId)
    }

    const child = spawn('claude', args)

    for await (const chunk of child.stdout) {
      yield parseStreamChunk(chunk)
    }
  }
}
```

**Warm Sessions**: The adapter supports session resumption via `--resume` flag, allowing faster subsequent responses by reusing Claude's context.

## Data Flow

### Task Creation Flow

```
User types in chat
        │
        ▼
┌───────────────┐
│  /api/chat    │
│  (POST)       │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐
│  CLIAdapter   │────▶│  Claude CLI   │
└───────────────┘     └───────┬───────┘
                              │
                              │ Claude calls gtd:add
                              ▼
                      ┌───────────────┐
                      │  Skill Tool   │
                      │  (gtd add)    │
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │  store.ts     │
                      │  saveTodos()  │
                      └───────┬───────┘
                              │
                              ▼
                      ┌───────────────┐
                      │ todos.json    │
                      └───────────────┘
```

### UI Update Flow

```
┌───────────────┐
│  TodoList     │
│  useEffect    │
└───────┬───────┘
        │ every 2 seconds
        ▼
┌───────────────┐     ┌───────────────┐
│  fetch()      │────▶│  /api/todos   │
│               │◀────│  (GET)        │
└───────┬───────┘     └───────────────┘
        │
        ▼
┌───────────────┐
│  setItems()   │
│  re-render    │
└───────────────┘
```

## Session Management

### Chat Session Logger (`lib/services/logger.ts`)

All chat interactions are logged for debugging and potential analytics:

```typescript
class SessionLogger {
  private logPath: string

  constructor(sessionId: string) {
    this.logPath = `logs/session-${sessionId}-${Date.now()}.jsonl`
  }

  log(entry: LogEntry): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry
    })
    appendFileSync(this.logPath, line + '\n')
  }
}
```

**Log Entry Types**:
- `session_start` / `session_end`
- `user_message`
- `assistant_response`
- `tool_use` / `tool_result`
- `error`

### Session ID Format

```typescript
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${random}`
}
// Example: "m2k9x5a-j7f3k2"
```

## Error Handling

### API Error Responses

```typescript
// Standard error format
return NextResponse.json(
  { error: 'Task not found', code: 'NOT_FOUND' },
  { status: 404 }
)
```

### Frontend Error Handling

```typescript
// Chat errors trigger retry UI
const [error, setError] = useState<Error | null>(null)

if (error) {
  return <RetryButton onClick={handleRetry} />
}
```

### CLI Error Handling

```typescript
// CLI outputs errors as JSON to stdout
try {
  await handler(args)
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exit(1)
}
```

## Configuration

### Environment Configuration

| Setting | Location | Purpose |
|---------|----------|---------|
| Port | Next.js default (3000) | Web server port |
| Data file | `data/todos.json` | Task storage |
| Log directory | `logs/` | Session logs |

### Build Configuration

**TypeScript** (`tsconfig.json`):
- Strict mode enabled
- ES2017 target
- Path alias: `@/*` → `./`

**Tailwind** (`tailwind.config.ts`):
- Content: `app/`, `components/`, `pages/`
- No custom theme extensions

### Scripts (`package.json`)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "jest",
  "gtd:build": "tsc --project scripts/gtd/tsconfig.json",
  "gtd": "node scripts/gtd/dist/cli.js",
  "gtd:dev": "tsx scripts/gtd/cli.ts"
}
```

## Testing

### Test Structure

```
scripts/gtd/__tests__/
├── store.test.ts         # Data layer tests
├── commands.test.ts      # CLI command tests
└── migration.test.ts     # Schema migration tests

components/__tests__/
├── ThemeToggle.test.tsx  # Component tests (React Testing Library)
```

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Important: Jest vs TypeScript

Jest uses Babel for transpilation, which means **TypeScript errors in test files won't cause test failures**. A test file can have type errors but still pass all tests. Always run the full type check (see Environment Validation below) to catch these issues.

## Environment Validation

Before starting implementation work, verify the codebase is healthy by running these checks.

### Pre-flight Commands

```bash
# 1. Build check - ensures production build works
npm run build

# 2. Full type check - catches ALL TypeScript errors including test files
npx tsc --noEmit

# 3. Test suite - ensures tests pass
npm test
```

### Expected Results

| Check | Healthy State |
|-------|---------------|
| `npm run build` | Completes with no errors |
| `npx tsc --noEmit` | No output (no type errors) |
| `npm test` | All tests pass |

### Known Issues

Pre-existing failures that implementers should be aware of:

| Check | Issue | Status | Notes |
|-------|-------|--------|-------|
| `npx tsc --noEmit` | `@testing-library/jest-dom` matcher types not recognized | Known | Errors like `toBeInTheDocument`, `toHaveClass` not found. Tests still run - Jest uses Babel. |

### What To Do If Validation Fails

1. **Pre-existing issue (listed above)**: Note it in your progress log and proceed
2. **New failure**: Investigate before proceeding - don't start work on an unhealthy codebase
3. **Unclear**: Ask before proceeding

## Security Considerations

### Input Validation
- Task titles sanitized before storage
- Due dates validated for format
- Priority values constrained to enum

### File System
- Data file accessed via controlled functions
- No user-provided paths executed
- Logs written to designated directory only

### Claude Integration
- Allowed tools explicitly whitelisted
- Tool results parsed, not executed directly

## Performance

### Polling Strategy
- 2-second interval for todo list refresh
- Parallel fetching of tab counts
- Cleanup on component unmount

### Bulk Operations
- Sequential processing to prevent race conditions
- Optimistic UI updates considered for future

### Data Loading
- Single JSON file read per operation
- In-memory processing for filtering/sorting
- No caching layer (file is source of truth)

## Future Considerations

Areas identified for potential enhancement:

1. **Database Migration**: Move from JSON to SQLite or PostgreSQL
2. **Real-time Updates**: WebSocket instead of polling
3. **Undo System**: Leverage activity log for undo/redo
4. **Offline Support**: Service worker with sync queue
5. **Multi-user**: Authentication and user-scoped data

## Related Documentation

- [Overview](./overview.md) - Project introduction
- [High-Level Concept](./high-level-concept.md) - GTD workflow design
- [Data Model](./data-model.md) - Data structures and storage
