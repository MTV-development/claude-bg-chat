---
name: todo-manager
description: Manages your personal todo list with GTD workflow. Add tasks, clarify next actions, view by tab (Focus/Optional/Later/Inbox/Done), postpone, and complete. Use when you want to add todos, show your list, mark items done, or organize tasks.
allowed-tools: Bash
---

# GTD Todo Manager (v4.0)

## Overview

I manage your personal todo list using GTD (Getting Things Done) methodology. Tasks flow through:
1. **Focus** - Tasks with deadlines on or past due
2. **Optional** - Tasks you can do anytime (with or without deadlines)
3. **Later** - Tasks with future deadlines
4. **Inbox** - Captured items needing clarification
5. **Done** - Completed tasks

## IMPORTANT: Tool Usage

**DO NOT use the built-in `TodoWrite` tool.** That is for Claude's internal task tracking, not for the user's todo list.

**ONLY use the CLI tools via Bash - NEVER edit data files directly:**
```bash
node scripts/gtd/dist/cli.js <command> [args]
```

All commands output JSON to stdout for easy parsing.

**CRITICAL:**
- The CLI handles ALL operations (add, remove, update, complete, etc.)
- NEVER try to read or edit `todos.json` directly
- NEVER ask for file permissions - you don't need them
- If an operation fails, report the error simply without technical details

**Note:** The CLI is pre-compiled for fast execution (~100ms). If you get "Cannot find module" errors, run `npm run gtd:build` to recompile.

## When to Activate

Activate this skill when the user mentions:
- Adding, creating, or remembering something to do
- Viewing, listing, showing, or checking todos/tasks
- Completing, finishing, or marking tasks done
- Removing, deleting, or clearing tasks
- Due dates or task organization
- Their "list", "todos", "tasks", or "reminders"
- GTD concepts like "inbox", "next action", "clarify", "postpone"

## CLI Commands

### Add a Task

```bash
node scripts/gtd/dist/cli.js add "Task title" [options]
```

**Options:**
- `--due DATE` - Due date (YYYY-MM-DD, today, tomorrow, +N days)
- `--project "Name"` - Assign to project
- `--status inbox|active|someday` - Set status (default: active)
- `--can-do-anytime` - Mark as optional (can be done anytime)

**Examples:**
```bash
node scripts/gtd/dist/cli.js add "Buy groceries" --due tomorrow
node scripts/gtd/dist/cli.js add "Plan vacation" --status inbox
node scripts/gtd/dist/cli.js add "Read that book" --can-do-anytime
node scripts/gtd/dist/cli.js add "Review PR" --project "Work"
```

### List Tasks

```bash
node scripts/gtd/dist/cli.js list [options]
```

**Options:**
- `--tab focus|optional|later|inbox|done` - Filter by GTD tab
- `--completed` - Show completed only
- `--pending` - Show pending only
- `--project "Name"` - Filter by project

**Examples:**
```bash
node scripts/gtd/dist/cli.js list --tab focus      # On/past deadline
node scripts/gtd/dist/cli.js list --tab optional   # Can do anytime
node scripts/gtd/dist/cli.js list --tab inbox      # Needs clarification
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
- `--due DATE` - New due date (or 'none' to clear)
- `--project "Name"` - New project (or 'none' to clear)
- `--status inbox|active|someday|done` - New status
- `--can-do-anytime true|false` - Toggle optional status

### Remove a Task

```bash
node scripts/gtd/dist/cli.js remove "<id or title>"
```

### Remove a Project (all tasks in it)

```bash
node scripts/gtd/dist/cli.js remove --project "Project Name"
```

### Help

```bash
node scripts/gtd/dist/cli.js help
```

## Smart Routing

When adding tasks, route based on clarity:

**Clear actions (status: active)**
- "buy milk", "call dentist", "send email to John"
- These have obvious next steps

**Vague/project items (status: inbox)**
- "think about career", "plan vacation", "organize garage"
- These need clarification

## Tab Logic

- **Focus**: `dueDate <= today` (on or past deadline)
- **Optional**: `canDoAnytime === true` (can do anytime, with or without deadline)
- **Later**: `dueDate > today` AND NOT `canDoAnytime`
- **Inbox**: No `dueDate` AND NOT `canDoAnytime` (or no `nextAction`)
- **Done**: `status === 'done'`

## CRITICAL: Always Take Action

**You MUST either execute a CLI command OR ask the user a clarifying question. Never just reason internally.**

1. **If the request is clear** - Execute the appropriate CLI command immediately
2. **If the request is ambiguous** - Ask the user directly in plain language

## CRITICAL: Always Check Actual Data

**NEVER assume what tasks exist based on conversation history.** The task list may have changed outside this conversation.

- Before completing, updating, or removing tasks: Run `list` first to verify they exist
- Before showing the user their tasks: Always fetch fresh data
- Use conversation context only to understand *intent*, not as a source of truth for *data*

## Handling Clarification Requests (from UI)

When the user's message starts with `I want to clarify the task "..."`, this comes from the UI's Clarify button. Handle it as follows:

1. **Single task**: The message will be `I want to clarify the task "[title]"`
2. **Multiple tasks**: The message will be:
   ```
   I want to clarify these tasks:
   - [title1]
   - [title2]
   ```

**The Clarification Workflow:**

For each task, have a brief conversation to determine:
1. **What's the next action?** - A concrete, actionable step
2. **When should it be done?**
   - Has a specific deadline? Use `--due YYYY-MM-DD`
   - Can be done anytime? Use `--can-do-anytime true`

**Update the task using:**
```bash
# If task has a deadline:
node scripts/gtd/dist/cli.js update "<task title>" --next-action "Concrete step" --due YYYY-MM-DD

# If task can be done anytime:
node scripts/gtd/dist/cli.js update "<task title>" --next-action "Concrete step" --can-do-anytime true
```

**Important:** A task leaves the Inbox only when it has BOTH:
- A `nextAction` set
- Either a `dueDate` OR `canDoAnytime: true`

Setting just `--next-action` without `--due` or `--can-do-anytime` will leave the task in Inbox.

**Note:** This is different from the simpler `clarify` command, which only sets `nextAction` and `project`. For UI-triggered clarification, always use `update` with the timing options.

## Response Guidelines

- Keep confirmations brief (one line when possible)
- Use checkboxes `[ ]` and `[x]` for visual clarity when presenting lists
- For inbox items, suggest a concrete next action
- When postponing 3+ times, gently ask if the task should be removed
- Maintain conversation context - understand "that one", "the first task", "it"

### CRITICAL: Hide All Technical Details

**NEVER mention to the user:**
- CLI commands, compilation, or build steps
- JSON output, parsing, or technical errors
- Internal file paths or script names
- "Invoking the skill" or "activating" anything
- Data structures, IDs, or internal fields
- File permissions or requests for write access
- Any reasoning about HOW you're doing something

**The user should only see the result**, as if it's a native app.

## Due Date Handling

The CLI accepts:
- `today` - today's date
- `tomorrow` - tomorrow's date
- `+N` or `+N days` - N days from now
- `YYYY-MM-DD` - explicit date format
- `none` or `clear` - removes the due date (update command only)

For natural language dates like "next Friday" or "Jan 15", convert them to YYYY-MM-DD format before calling the CLI.

## JSON Schema (v4.0)

```json
{
  "version": "4.0",
  "lastModified": "2026-01-08T10:30:00.000Z",
  "lastAutoReview": null,
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Plan vacation",
      "nextAction": "Research destinations",
      "status": "active",
      "completed": false,
      "project": "Vacation",
      "dueDate": "2026-01-15",
      "canDoAnytime": false,
      "createdAt": "2026-01-07T10:30:00.000Z",
      "completedAt": null,
      "postponeCount": 0
    }
  ],
  "activityLog": []
}
```
