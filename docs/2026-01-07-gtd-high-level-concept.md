# GTD Chat: High-Level Concept

## Vision

**"The AI does the GTD work, the user just talks and acts."**

A conversational GTD system where users capture thoughts naturally via chat,
and AI handles all the methodology—clarification, organization, review.
The system stays clean without user effort.

---

## Core Principles

1. **Capture = just say it** — "buy milk", "think about career", "call mom Tuesday"
2. **AI routes intelligently** — Clear items → Focus, Vague items → Inbox
3. **Tickler model** — Items surface in Focus only when their date arrives
4. **Invisible review** — AI reviews daily, surfaces only what matters
5. **Panel for doing, Chat for thinking** — Quick actions vs. discussions

---

## Data Model

```
Item {
  id: string
  title: string                    // Raw capture (what user said)
  nextAction: string | null        // Clarified physical next step
  status: 'inbox' | 'active' | 'done' | 'someday'
  priority: 'high' | 'medium' | 'low'
  project: string | null           // AI-inferred grouping
  dueDate: Date | null             // Tickler date (when it surfaces)
  createdAt: Date
  completedAt: Date | null
}

ActivityLog {
  id: string
  itemId: string
  action: 'created' | 'postponed' | 'completed' | 'clarified' | 'deleted'
  timestamp: Date
  details: { fromDate?, toDate?, reason? }
}

SystemMeta {
  lastAutoReview: Date
}
```

**Key insight:** `title` vs `nextAction`
- "Plan vacation" (title) → "Search flights to Barcelona" (nextAction)
- No nextAction = stays in Inbox

---

## Panel Design

### Tabs

| Tab | Shows | Purpose |
|-----|-------|---------|
| **Focus** | Due today or overdue | Must do today |
| **Optional** | Has nextAction, future/no deadline | Could do |
| **Inbox** | No nextAction yet | Needs clarification |
| **Projects** | Project list → drill to tasks | Grouped view |
| **Done** | Completed items | Reference |

### Interactions

| Action | UI |
|--------|-----|
| Complete | Click checkbox |
| Uncomplete | Click green check |
| Postpone | Dropdown: +1, +2, +3, +7, +14, +30 days |

---

## AI Behaviors

### Smart Capture
```
"buy groceries"           → Focus (clear action)
"think about switching jobs"  → Inbox (vague, needs clarification)
"call dentist by Friday"  → Focus with due date
```

### Postponement Intelligence
- Shows badge: "(2x postponed)"
- After 3+ postponements: "Still want this, or should we remove it?"

### Background Review Agent
- Triggers on session start if >1 day since last review
- Runs silently, creates clarification list
- Chat offers: "Review now, or after your task?"

---

## What We're NOT Building (Yet)

- Contexts (@home, @work)
- Recurring tasks
- Time estimates
- Subtasks
- Waiting-for tracking
- Areas of focus / horizons

---

## Success Metrics

1. **Capture friction** — Time from thought to captured item
2. **Focus accuracy** — % of Focus items actually done that day
3. **Inbox decay** — Items clarified within 3 days
4. **Postpone patterns** — Items removed after repeated postponement
5. **Review engagement** — % of offered reviews accepted
