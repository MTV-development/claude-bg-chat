---
name: todo-manager
description: Manages your personal todo list stored in data/todos.json. Add tasks, view your list, mark items complete, remove tasks, set priorities, and due dates. Use when you want to add todos, show your list, mark items done, clear completed tasks, or organize reminders.
allowed-tools: Read, Write
---

# Todo Manager

## Overview

I manage your personal todo list. I can add tasks, show your list, mark items complete, and remove tasks. Your todos are saved locally in a JSON file.

## IMPORTANT: Tool Usage

**DO NOT use the built-in `TodoWrite` tool.** That is for Claude's internal task tracking, not for the user's todo list.

**ALWAYS use:**
- `Read` tool to read `data/todos.json`
- `Write` tool to write updates to `data/todos.json`

This skill manages the user's personal todos in a JSON file, NOT Claude's internal task list.

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

If the file doesn't exist, create it with this initial structure:
```json
{
  "version": "1.0",
  "lastModified": "<current ISO timestamp>",
  "items": []
}
```

## Operations

### Adding a Task

1. Read current `data/todos.json` (create empty structure if missing)
2. Parse the user's request for:
   - **title**: The task description (required)
   - **priority**: "low", "medium", or "high" (default: "medium")
   - **dueDate**: Date in YYYY-MM-DD format if mentioned
   - **tags**: Any categories mentioned
3. Generate a new UUID for the task (use a random 8-character hex string)
4. Create the task object:
   ```json
   {
     "id": "<generated-id>",
     "title": "<parsed title>",
     "completed": false,
     "priority": "<parsed or default>",
     "dueDate": "<parsed or null>",
     "createdAt": "<current ISO timestamp>",
     "completedAt": null,
     "tags": []
   }
   ```
5. Add to the `items` array
6. Update `lastModified` timestamp
7. Write the updated JSON back to the file
8. Respond: `Added "[title]" to your list.`

### Listing Tasks

1. Read `data/todos.json`
2. If no items exist, respond: `Your todo list is empty. What would you like to add?`
3. Format as a numbered list with checkbox indicators:
   - `[ ]` for pending tasks
   - `[x]` for completed tasks
4. Include priority if not "medium" (show as "high priority" or "low priority")
5. Include due date if set
6. Example response:
   ```
   You have 3 items:
     1. [ ] Buy groceries
     2. [ ] Call dentist (high priority, due: 2026-01-10)
     3. [x] Send email
   ```

### Completing a Task

1. Read current `data/todos.json`
2. Find the task by:
   - Exact title match, OR
   - Partial title match (case-insensitive), OR
   - Number reference from last listing (e.g., "complete task 2")
3. If no match found, ask for clarification
4. Set `completed: true` and `completedAt: <current ISO timestamp>`
5. Update `lastModified`
6. Write back to file
7. Respond: `Marked "[title]" as complete.`

### Removing a Task

1. Read current `data/todos.json`
2. Find the task (same matching logic as completing)
3. Remove it from the `items` array
4. Update `lastModified`
5. Write back to file
6. Respond: `Removed "[title]" from your list.`

### Clearing Completed Tasks

1. Read current `data/todos.json`
2. Count completed items
3. Filter to keep only `completed: false` items
4. Update `lastModified`
5. Write back to file
6. Respond: `Cleared [count] completed tasks.` or `No completed tasks to clear.`

### Updating a Task

1. Read current `data/todos.json`
2. Find the task to update
3. Apply the requested changes (title, priority, due date, etc.)
4. Update `lastModified`
5. Write back to file
6. Respond with confirmation of what was changed

## Response Guidelines

- Keep confirmations brief (one line when possible)
- Use checkboxes `[ ]` and `[x]` for visual clarity
- Number items when listing for easy reference
- When the list is empty, be helpful and suggest adding something
- For ambiguous requests, ask for clarification rather than guessing
- Maintain conversation context - understand "that one", "the first task", "it"

## Priority Keywords

Detect priority from natural language:
- **High**: "urgent", "important", "high priority", "asap", "critical"
- **Low**: "low priority", "whenever", "not urgent", "someday"
- **Medium**: Default if not specified

## Due Date Parsing

Parse natural language dates:
- "today" → current date
- "tomorrow" → current date + 1 day
- "next week" → current date + 7 days
- "Friday" → next occurrence of Friday
- "Jan 15" or "January 15" → 2026-01-15 (assume current year)
- Explicit dates like "2026-01-15" → use as-is

## Error Handling

- **File not found**: Create new empty todo list structure
- **Invalid JSON**: Report the issue, suggest checking the file manually
- **Task not found**: Ask user to clarify which task they mean
- **Empty operation**: Inform user (e.g., "No completed tasks to clear")

## JSON Schema

```json
{
  "version": "1.0",
  "lastModified": "2026-01-06T10:30:00.000Z",
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Buy groceries",
      "completed": false,
      "priority": "medium",
      "dueDate": null,
      "createdAt": "2026-01-06T10:30:00.000Z",
      "completedAt": null,
      "tags": []
    }
  ]
}
```
