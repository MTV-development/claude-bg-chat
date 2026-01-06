# Todo List Manager - Technical Architecture

**Date:** 2026-01-06
**Related:** [Concept Document](./2026-01-06-todo-concept.md)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chat Interface                           │
│                                                                  │
│   User: "add buy milk to my list"                               │
│                                                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                             │
│                                                                  │
│   1. Receives prompt                                            │
│   2. Matches against skill description                          │
│   3. Loads todo-manager skill                                   │
│                                                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Todo Manager Skill                            │
│                                                                  │
│   .claude/skills/todo-manager/SKILL.md                          │
│                                                                  │
│   - Interprets user intent                                      │
│   - Instructs Claude to use Read/Write tools                    │
│   - Defines response format                                     │
│                                                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     File Operations                              │
│                                                                  │
│   Read tool  ──►  /data/todos.json  ◄──  Write tool             │
│                                                                  │
│   - JSON parsing/serialization                                  │
│   - Atomic updates                                              │
│   - Create if not exists                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Claude Skill: Todo Manager

**Location:** `.claude/skills/todo-manager/SKILL.md`

**Purpose:** Teaches Claude how to manage the todo list through natural language.

**Skill Structure:**
```markdown
# Todo Manager Skill

## Description
Manages a personal todo list stored in /data/todos.json.
Handles adding, listing, completing, and removing tasks.

## Activation
This skill activates when the user wants to:
- Add, create, or remember tasks
- View, list, or check their todos
- Mark tasks as done or complete
- Remove or delete tasks
- Update or modify existing tasks

## Instructions
[Detailed instructions for Claude on how to handle each operation]

## Data Location
/data/todos.json

## Response Format
[Guidelines for formatting responses]
```

### 2. Data File

**Location:** `/data/todos.json`

**Schema:**
```typescript
interface TodoFile {
  version: string;          // Schema version for migrations
  lastModified: string;     // ISO timestamp
  items: TodoItem[];
}

interface TodoItem {
  id: string;               // UUID v4
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;   // YYYY-MM-DD
  createdAt: string;        // ISO timestamp
  completedAt: string | null;
  tags: string[];
}
```

**Initial State (empty list):**
```json
{
  "version": "1.0",
  "lastModified": "2026-01-06T00:00:00Z",
  "items": []
}
```

### 3. File Operations

Claude uses built-in tools for file access:

| Operation | Tool | Usage |
|-----------|------|-------|
| Read list | `Read` | Read /data/todos.json |
| Write list | `Write` | Write updated JSON to /data/todos.json |
| Check exists | `Read` | Attempt read, handle "not found" |

**Concurrency Note:** Since this is single-user local operation, we don't need complex locking. The skill instructs Claude to always read-before-write.

## Skill Implementation

### SKILL.md Content

```markdown
# Todo Manager

## Description
I manage your personal todo list. I can add tasks, show your list,
mark items complete, and remove tasks. Your todos are saved locally.

## When to Activate
Activate this skill when the user mentions:
- Adding, creating, or remembering something to do
- Viewing, listing, or checking todos/tasks
- Completing, finishing, or marking tasks done
- Removing, deleting, or clearing tasks
- Priorities, due dates, or task organization

## Data File
The todo list is stored at: /data/todos.json

## Operations

### Adding a Task
1. Read current /data/todos.json (create empty structure if missing)
2. Parse the user's request for: title, priority, due date, tags
3. Generate a new UUID for the task
4. Add to items array with createdAt timestamp
5. Write updated JSON back to file
6. Confirm: "Added '[title]' to your list."

### Listing Tasks
1. Read /data/todos.json
2. If empty: "Your todo list is empty. What would you like to add?"
3. Format as numbered list with checkbox indicators:
   - [ ] for pending
   - [x] for completed
4. Include priority/due date if set

### Completing a Task
1. Read current todos
2. Find task by title match (fuzzy) or number reference
3. Set completed=true and completedAt=now
4. Write back
5. Confirm: "Marked '[title]' as complete."

### Removing a Task
1. Read current todos
2. Find and remove matching task
3. Write back
4. Confirm: "Removed '[title]' from your list."

### Clearing Completed
1. Read current todos
2. Filter out completed items
3. Write back
4. Confirm: "Cleared X completed tasks."

## Response Guidelines
- Keep confirmations brief (one line)
- Use checkboxes for visual clarity: [ ] and [x]
- When listing, number items for easy reference
- Suggest next actions when appropriate
- Handle empty states gracefully

## Error Handling
- File not found: Create new empty todo list
- Parse error: Report issue, don't lose data
- Task not found: Ask for clarification

## JSON Structure
{
  "version": "1.0",
  "lastModified": "ISO-timestamp",
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "completed": false,
      "priority": "low|medium|high",
      "dueDate": "YYYY-MM-DD|null",
      "createdAt": "ISO-timestamp",
      "completedAt": "ISO-timestamp|null",
      "tags": ["string"]
    }
  ]
}
```

## Directory Structure

```
claude-bg-chat/
├── .claude/
│   └── skills/
│       └── todo-manager/
│           └── SKILL.md          # Skill definition
├── data/
│   └── todos.json                # Todo data (created on first use)
├── app/                          # Next.js chat interface
├── lib/                          # Adapters, services
├── logs/                         # Session logs
└── docs/
    ├── 2026-01-06-todo-concept.md
    ├── 2026-01-06-todo-architecture.md
    └── 2026-01-06-todo-implementation.md
```

## Integration with Chat Interface

The todo manager works through the existing chat architecture:

```
Chat UI (useChat)
    │
    ▼
/api/chat
    │
    ▼
CLIAdapter
    │
    ▼
claude -p "add milk to my list" --output-format stream-json
    │
    ▼
Claude Code loads todo-manager skill
    │
    ▼
Claude uses Read/Write tools on /data/todos.json
    │
    ▼
Response streamed back to chat
```

## Security Considerations

- **File access:** Skill only accesses `/data/todos.json`
- **No code execution:** Only file read/write operations
- **Local only:** Data stays on user's machine
- **No external calls:** Skill doesn't use web tools

## Testing Points

1. **Skill activation:** Does Claude recognize todo-related prompts?
2. **File creation:** Is empty JSON created on first use?
3. **CRUD operations:** Add, read, update, delete work correctly?
4. **Data integrity:** Is JSON valid after operations?
5. **Edge cases:** Empty list, duplicate titles, fuzzy matching?
6. **Chat integration:** Does streaming work for todo responses?
