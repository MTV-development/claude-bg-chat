---
name: todo-manager
description: Manages your personal todo list stored in data/todos.json. Add tasks, view your list, mark items complete, remove tasks, set priorities, and due dates. Use when you want to add todos, show your list, mark items done, clear completed tasks, or organize reminders.
allowed-tools: Bash
---

# Todo Manager

## Overview

I manage your personal todo list. I can add tasks, show your list, mark items complete, and remove tasks. Your todos are saved locally in a JSON file.

## IMPORTANT: Tool Usage

**DO NOT use the built-in `TodoWrite` tool.** That is for Claude's internal task tracking, not for the user's todo list.

**ALWAYS use the CLI tools via Bash:**
```bash
node scripts/gtd/dist/cli.js <command> [args]
```

All commands output JSON to stdout for easy parsing. This skill manages the user's personal todos in a JSON file, NOT Claude's internal task list.

**Note:** The CLI is pre-compiled for fast execution (~100ms). If you get "Cannot find module" errors, run `npm run gtd:build` to recompile.

## When to Activate

Activate this skill when the user mentions:
- Adding, creating, or remembering something to do
- Viewing, listing, showing, or checking todos/tasks
- Completing, finishing, or marking tasks done
- Removing, deleting, or clearing tasks
- Priorities, due dates, or task organization
- Their "list", "todos", "tasks", or "reminders"

## Data File

The todo list is stored at: `data/todos.json`

The CLI tools handle file creation automatically if it doesn't exist.

## CLI Commands

### Add a Task

```bash
node scripts/gtd/dist/cli.js add "Task title" [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow] [--tags tag1,tag2]
```

**Examples:**
```bash
node scripts/gtd/dist/cli.js add "Buy groceries"
node scripts/gtd/dist/cli.js add "Call dentist" --priority high --due tomorrow
node scripts/gtd/dist/cli.js add "Review PR" --tags work,urgent
```

**Output:**
```json
{
  "success": true,
  "item": {
    "id": "a1b2c3d4",
    "title": "Buy groceries",
    "completed": false,
    "priority": "medium",
    "dueDate": null,
    "createdAt": "2026-01-07T10:30:00.000Z",
    "completedAt": null,
    "tags": []
  }
}
```

### List Tasks

```bash
node scripts/gtd/dist/cli.js list [--completed] [--pending] [--priority high|medium|low]
```

**Examples:**
```bash
node scripts/gtd/dist/cli.js list                    # All items
node scripts/gtd/dist/cli.js list --pending          # Pending only
node scripts/gtd/dist/cli.js list --completed        # Completed only
node scripts/gtd/dist/cli.js list --priority high    # High priority only
```

**Output:**
```json
{
  "success": true,
  "items": [...],
  "count": 3
}
```

### Complete a Task

```bash
node scripts/gtd/dist/cli.js complete "<id or partial title>"
```

**Examples:**
```bash
node scripts/gtd/dist/cli.js complete "a1b2c3d4"     # By ID
node scripts/gtd/dist/cli.js complete "groceries"    # By partial title match
node scripts/gtd/dist/cli.js complete "Buy groceries" # By exact title
```

**Output:**
```json
{
  "success": true,
  "item": { ... }
}
```

### Uncomplete a Task

```bash
node scripts/gtd/dist/cli.js uncomplete "<id or partial title>"
```

Marks a completed task as pending again.

### Remove a Task

```bash
node scripts/gtd/dist/cli.js remove "<id or partial title>"
```

**Output:**
```json
{
  "success": true,
  "removed": { ... }
}
```

### Update a Task

```bash
node scripts/gtd/dist/cli.js update "<id or partial title>" [--title "New title"] [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow|none]
```

**Examples:**
```bash
node scripts/gtd/dist/cli.js update "groceries" --priority high
node scripts/gtd/dist/cli.js update "a1b2c3d4" --title "Updated title" --due tomorrow
node scripts/gtd/dist/cli.js update "task" --due none   # Clear due date
```

**Output:**
```json
{
  "success": true,
  "item": { ... }
}
```

### Help

```bash
node scripts/gtd/dist/cli.js help
```

## Response Guidelines

- Keep confirmations brief (one line when possible)
- Use checkboxes `[ ]` and `[x]` for visual clarity when presenting lists
- Number items when listing for easy reference
- When the list is empty, be helpful and suggest adding something
- For ambiguous requests, ask for clarification rather than guessing
- Maintain conversation context - understand "that one", "the first task", "it"

## Priority Keywords

Detect priority from natural language:
- **High**: "urgent", "important", "high priority", "asap", "critical"
- **Low**: "low priority", "whenever", "not urgent", "someday"
- **Medium**: Default if not specified

## Due Date Handling

The CLI accepts:
- `today` - today's date
- `tomorrow` - tomorrow's date
- `YYYY-MM-DD` - explicit date format
- `none` or `clear` - removes the due date (update command only)

For natural language dates like "next Friday" or "Jan 15", convert them to YYYY-MM-DD format before calling the CLI.

## Error Handling

All CLI commands return JSON with a `success` field:

**Success:**
```json
{
  "success": true,
  "item": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Item not found: \"nonexistent\""
}
```

Handle errors gracefully and inform the user what went wrong.

## JSON Schema

The todo data follows this structure:

```json
{
  "version": "1.0",
  "lastModified": "2026-01-07T10:30:00.000Z",
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Buy groceries",
      "completed": false,
      "priority": "medium",
      "dueDate": null,
      "createdAt": "2026-01-07T10:30:00.000Z",
      "completedAt": null,
      "tags": []
    }
  ]
}
```
