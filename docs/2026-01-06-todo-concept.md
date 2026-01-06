# Todo List Manager - Concept Document

**Date:** 2026-01-06
**Status:** Draft
**Purpose:** First use case for the Claude Code Chat Interface

## Overview

A simple todo list manager where:
- Users interact via natural language chat
- A Claude skill handles todo list operations
- Data persists in a JSON file at `/data/todos.json`

This serves as a proof-of-concept for the chat interface, demonstrating:
1. Skill-based interaction
2. Local file persistence
3. Natural language task management

## User Experience

### Example Interactions

```
User: Add "buy groceries" to my list
Claude: Added "buy groceries" to your todo list.

User: What's on my list?
Claude: You have 3 items:
  1. [ ] Buy groceries
  2. [ ] Call dentist
  3. [x] Send email to Bob

User: Mark the groceries one as done
Claude: Marked "buy groceries" as complete.

User: Remove the completed tasks
Claude: Removed 2 completed tasks. You have 1 remaining item.

User: Add "pick up prescription" with high priority for tomorrow
Claude: Added "pick up prescription" (high priority, due: 2026-01-07).
```

### Key Capabilities

| Action | Example Phrases |
|--------|-----------------|
| Add task | "add...", "remind me to...", "I need to..." |
| List tasks | "show my list", "what's pending", "todos" |
| Complete task | "mark X done", "finished X", "completed X" |
| Delete task | "remove X", "delete X" |
| Edit task | "change X to Y", "update X" |
| Filter | "show completed", "what's due today", "high priority items" |

## Data Model

### Todo Item Structure

```json
{
  "id": "uuid-v4",
  "title": "Buy groceries",
  "completed": false,
  "priority": "medium",
  "dueDate": "2026-01-07",
  "createdAt": "2026-01-06T10:30:00Z",
  "completedAt": null,
  "tags": ["shopping"]
}
```

### Full Data File (`/data/todos.json`)

```json
{
  "version": "1.0",
  "lastModified": "2026-01-06T10:30:00Z",
  "items": [
    {
      "id": "a1b2c3",
      "title": "Buy groceries",
      "completed": false,
      "priority": "medium",
      "dueDate": null,
      "createdAt": "2026-01-06T10:30:00Z",
      "completedAt": null,
      "tags": []
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| title | string | Yes | Task description |
| completed | boolean | Yes | Completion status |
| priority | enum | No | "low", "medium", "high" (default: "medium") |
| dueDate | string | No | ISO date (YYYY-MM-DD) |
| createdAt | string | Yes | ISO timestamp |
| completedAt | string | No | ISO timestamp when completed |
| tags | string[] | No | Categorization tags |

## Claude Skill Design

### Skill Purpose

The skill teaches Claude how to:
1. Understand todo-related intents from natural language
2. Read and parse the JSON data file
3. Perform CRUD operations
4. Format responses for chat display

### Skill Behavior

**Read Operations:**
- Always read the current file before responding about list state
- Handle missing file gracefully (initialize empty list)

**Write Operations:**
- Preserve existing data when adding/modifying
- Update `lastModified` timestamp
- Generate UUIDs for new items

**Response Style:**
- Concise confirmations for actions
- Formatted lists for viewing todos
- Helpful suggestions when list is empty

## Scope & Constraints

### In Scope (v1)
- Add, list, complete, delete tasks
- Basic priority levels
- Due dates
- Simple tag support

### Out of Scope (v1)
- Multiple lists
- Recurring tasks
- Reminders/notifications
- Subtasks
- Sharing/collaboration
- Search across history

### Constraints
- Single JSON file (no database)
- Local file access only
- No authentication (single user)
- English language only

## Session & Conversation Context

### Key Requirement: Dialogue Continuity

Within a chat session, Claude maintains full conversation context. This enables natural follow-up interactions:

```
User: "add buy milk"
Claude: Added "buy milk" to your list.

User: "actually make that oat milk"       ← understands "that" = buy milk
Claude: Updated to "buy oat milk".

User: "and make it high priority"         ← continues same context
Claude: Set "buy oat milk" to high priority.

User: "now add eggs"                      ← new task, but session continues
Claude: Added "eggs" to your list.

User: "what's on my list?"                ← remembers entire conversation
Claude: You have 2 items:
  1. [ ] Buy oat milk (high priority)
  2. [ ] Eggs
```

### How It Works

- Each chat session = one Claude Code session (via `--resume` flag)
- All messages in a chat share the same session context
- Claude remembers: previous tasks mentioned, recent operations, user preferences
- Pronouns resolve naturally: "that one", "the first task", "it"

### Session vs Data Persistence

| Aspect | Behavior |
|--------|----------|
| **Conversation context** | Lives in Claude session, lost when chat ends |
| **Todo data** | Persists in JSON file, survives across sessions |
| **New chat session** | Fresh context, but todos still there from file |

## Success Criteria

1. **Natural interaction**: User can manage todos without learning commands
2. **Conversation continuity**: Follow-ups work naturally within a session
3. **Data persistence**: Todos survive between sessions
4. **Reliability**: No data loss on concurrent operations
5. **Skill activation**: Claude correctly identifies todo-related requests
6. **Graceful handling**: Clear feedback on errors or empty states

## Related Documents

- [Technical Architecture](./2026-01-06-todo-architecture.md)
- [Implementation Plan](./2026-01-06-todo-implementation.md)
