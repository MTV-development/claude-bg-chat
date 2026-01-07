# GTD Chat: System Overview

## Vision

**"Talk to add tasks, click to complete them."**

A conversational GTD system where you capture thoughts naturally via chat,
and the AI handles organization. The panel shows what needs doing.

---

## How It Works

### Adding Tasks
Just type naturally in the chat:
- "buy groceries" → Goes to Today (clear action)
- "think about career" → Goes to Inbox (needs clarification)
- "call dentist tomorrow" → Goes to Optional until tomorrow

### The Four Tabs

| Tab | What's Here | Actions Available |
|-----|-------------|-------------------|
| **Today** | Due today or overdue | Postpone (+1 day, +1 week, etc.) |
| **Optional** | Future deadlines or no deadline | "Do Today" button |
| **Inbox** | Needs clarification | Clarify via chat |
| **Done** | Completed tasks | Reference only |

### Completing Tasks
- Click the circle to complete
- Click the green check to uncomplete

### Moving Tasks Between Tabs
- **Optional → Today**: Click "Do Today"
- **Today → Optional**: Postpone to a future date
- **Inbox → Today/Optional**: Clarify with a next action via chat

---

## Data Model

```
Item {
  id: string
  title: string              // What user said
  nextAction: string | null  // Concrete next step
  status: 'inbox' | 'active' | 'done' | 'someday'
  priority: 'high' | 'medium' | 'low'
  project: string | null
  dueDate: string | null     // YYYY-MM-DD
  postponeCount: number      // Tracks repeated postponements
  tags: string[]
}
```

**Key concept:** `title` vs `nextAction`
- "Plan vacation" (title) → "Search flights to Barcelona" (nextAction)
- Items without a nextAction stay in Inbox

---

## Tab Logic

- **Today**: Has nextAction + dueDate <= today
- **Optional**: Has nextAction + (no dueDate OR dueDate > today)
- **Inbox**: No nextAction OR status = 'inbox'
- **Done**: status = 'done'

---

## Postpone Behavior

When a task is postponed 3+ times:
- Badge turns orange
- Modal asks: "Remove this task or keep it?"

This prevents tasks from being endlessly postponed.

---

## CLI Commands

All operations use the CLI via chat:

```bash
# Add
node scripts/gtd/dist/cli.js add "Task" --due tomorrow

# List
node scripts/gtd/dist/cli.js list --tab focus

# Complete
node scripts/gtd/dist/cli.js complete "Task"

# Postpone
node scripts/gtd/dist/cli.js postpone "Task" --days 7

# Clarify (inbox → active)
node scripts/gtd/dist/cli.js clarify "Task" --next-action "First step"
```

---

## Not Yet Implemented

- Projects tab (grouping view)
- Background review agent
- Contexts (@home, @work)
- Recurring tasks
- Time estimates
