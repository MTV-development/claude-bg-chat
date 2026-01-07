---
name: todo-manager
description: Manages your personal todo list with GTD workflow. Add tasks, clarify next actions, view by tab (Focus/Optional/Inbox/Done), postpone, and complete. Use when you want to add todos, show your list, mark items done, or organize tasks.
allowed-tools: Bash
---

# GTD Todo Manager (v2.0)

## Overview

I manage your personal todo list using GTD (Getting Things Done) methodology. Tasks flow through:
1. **Inbox** - Captured items needing clarification
2. **Today** - Tasks due today or overdue
3. **Optional** - Tasks with future or no deadlines
4. **Done** - Completed tasks

## IMPORTANT: Tool Usage

**DO NOT use the built-in `TodoWrite` tool.** That is for Claude's internal task tracking, not for the user's todo list.

**ALWAYS use the CLI tools via Bash:**
```bash
node scripts/gtd/dist/cli.js <command> [args]
```

All commands output JSON to stdout for easy parsing.

**Note:** The CLI is pre-compiled for fast execution (~100ms). If you get "Cannot find module" errors, run `npm run gtd:build` to recompile.

## When to Activate

Activate this skill when the user mentions:
- Adding, creating, or remembering something to do
- Viewing, listing, showing, or checking todos/tasks
- Completing, finishing, or marking tasks done
- Removing, deleting, or clearing tasks
- Priorities, due dates, or task organization
- Their "list", "todos", "tasks", or "reminders"
- GTD concepts like "inbox", "next action", "clarify", "postpone"

## CLI Commands

### Add a Task

```bash
node scripts/gtd/dist/cli.js add "Task title" [options]
```

**Options:**
- `--priority high|medium|low` - Set priority (default: medium)
- `--due DATE` - Due date (YYYY-MM-DD, today, tomorrow, +N days)
- `--tags tag1,tag2` - Add tags
- `--project "Name"` - Assign to project
- `--status inbox|active|someday` - Set status (default: active)

**Examples:**
```bash
node scripts/gtd/dist/cli.js add "Buy groceries" --due tomorrow
node scripts/gtd/dist/cli.js add "Plan vacation" --status inbox
node scripts/gtd/dist/cli.js add "Review PR" --priority high --project "Work"
```

### List Tasks

```bash
node scripts/gtd/dist/cli.js list [options]
```

**Options:**
- `--tab focus|optional|inbox|done` - Filter by GTD tab
- `--completed` - Show completed only
- `--pending` - Show pending only
- `--priority high|medium|low` - Filter by priority
- `--project "Name"` - Filter by project

**Examples:**
```bash
node scripts/gtd/dist/cli.js list --tab focus      # Today (due today/overdue)
node scripts/gtd/dist/cli.js list --tab inbox      # Needs clarification
node scripts/gtd/dist/cli.js list --tab optional   # No deadline pressure
```

### List Projects

```bash
node scripts/gtd/dist/cli.js projects
```

Returns all projects with task counts.

### Complete a Task

```bash
node scripts/gtd/dist/cli.js complete "<id or title>"
```

### Uncomplete a Task

```bash
node scripts/gtd/dist/cli.js uncomplete "<id or title>"
```

### Clarify an Inbox Item

Move an item from inbox to active with a concrete next action.

```bash
node scripts/gtd/dist/cli.js clarify "<id or title>" --next-action "Concrete step" [--project "Name"]
```

**Example:**
```bash
node scripts/gtd/dist/cli.js clarify "Plan vacation" --next-action "Research destinations" --project "Vacation"
```

### Postpone a Task

```bash
node scripts/gtd/dist/cli.js postpone "<id or title>" --days N
```

**Examples:**
```bash
node scripts/gtd/dist/cli.js postpone "Buy groceries" --days 1    # Tomorrow
node scripts/gtd/dist/cli.js postpone "Review report" --days 7    # Next week
```

Returns a warning if postponed 3+ times.

### Update a Task

```bash
node scripts/gtd/dist/cli.js update "<id or title>" [options]
```

**Options:**
- `--title "..."` - New title
- `--next-action "..."` - New next action
- `--priority high|medium|low` - New priority
- `--due DATE` - New due date (or 'none' to clear)
- `--project "Name"` - New project (or 'none' to clear)
- `--status inbox|active|someday|done` - New status

### Remove a Task

```bash
node scripts/gtd/dist/cli.js remove "<id or title>"
```

### Help

```bash
node scripts/gtd/dist/cli.js help
```

## Smart Routing

When adding tasks, route based on clarity:

**Clear actions → status: active**
- "buy milk", "call dentist", "send email to John"
- These have obvious next steps

**Vague/project items → status: inbox**
- "think about career", "plan vacation", "organize garage"
- These need clarification

## Tab Logic

- **Today**: `status=active` AND `nextAction` AND `dueDate <= today` (has Postpone button)
- **Optional**: `status=active|someday` AND `nextAction` AND (`dueDate > today` OR no dueDate) (has "Do Today" button)
- **Inbox**: `status=inbox` OR no `nextAction`
- **Done**: `status=done`

## CRITICAL: Always Take Action

**You MUST either execute a CLI command OR ask the user a clarifying question. Never just reason internally.**

1. **If the request is clear** → Execute the appropriate CLI command immediately
2. **If the request is ambiguous** → Ask the user directly in plain language

**WRONG:**
```
I need to understand the data model...
Let me check the status values...
[internal reasoning displayed to user]
```

**RIGHT:**
```
Which tasks would you like to move to Focus?
- [ ] paint office
- [ ] cook dinner
```

**Or just do it:**
```
Done. Moved "paint office" to Focus (due today).
```

## Response Guidelines

- Keep confirmations brief (one line when possible)
- Use checkboxes `[ ]` and `[x]` for visual clarity when presenting lists
- For inbox items, suggest a concrete next action
- When postponing 3+ times, gently ask if the task should be removed
- Maintain conversation context - understand "that one", "the first task", "it"

### CRITICAL: Hide All Technical Details

**NEVER mention to the user:**
- CLI commands, compilation, or build steps
- "Let me compile", "Building the CLI", "Running the command"
- JSON output, parsing, or technical errors
- Internal file paths or script names
- "Invoking the skill" or "activating" anything

**The user should only see the result**, as if it's a native app:

**WRONG:**
```
I'll invoke the todo-manager skill...
The CLI needs to be built first. Let me compile it.
Now let me run the add command...
Done! Added 5 tasks.
```

**RIGHT:**
```
Added 5 tasks:

**Today:**
- [ ] Buy groceries
- [ ] Call dentist

**Optional:**
- [ ] Plan vacation (due Jan 15)
```

Just show the outcome. No process, no technical steps, no "let me do X".

## Priority Keywords

Detect priority from natural language:
- **High**: "urgent", "important", "high priority", "asap", "critical"
- **Low**: "low priority", "whenever", "not urgent", "someday"
- **Medium**: Default if not specified

## Due Date Handling

The CLI accepts:
- `today` - today's date
- `tomorrow` - tomorrow's date
- `+N` or `+N days` - N days from now
- `YYYY-MM-DD` - explicit date format
- `none` or `clear` - removes the due date (update command only)

For natural language dates like "next Friday" or "Jan 15", convert them to YYYY-MM-DD format before calling the CLI.

## JSON Schema (v2.0)

```json
{
  "version": "2.0",
  "lastModified": "2026-01-07T10:30:00.000Z",
  "lastAutoReview": null,
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Plan vacation",
      "nextAction": "Research destinations",
      "status": "active",
      "completed": false,
      "priority": "medium",
      "project": "Vacation",
      "dueDate": "2026-01-15",
      "createdAt": "2026-01-07T10:30:00.000Z",
      "completedAt": null,
      "postponeCount": 0,
      "tags": []
    }
  ],
  "activityLog": []
}
```
