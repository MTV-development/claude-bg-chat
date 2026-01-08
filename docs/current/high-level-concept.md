# GTD Todo Manager - High-Level Concept

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## Design Philosophy

This application implements David Allen's Getting Things Done (GTD) methodology through a conversational AI interface. The core insight is that task management friction often comes from two sources:

1. **Capture Friction**: It's hard to write down tasks quickly
2. **Clarification Friction**: Vague tasks ("plan vacation") create cognitive load

By using Claude as the primary interface, we reduce capture friction (natural language) and actively assist with clarification (AI-guided next action definition).

## GTD Workflow Implementation

### The Five Stages

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ CAPTURE │───>│ CLARIFY │───>│ ORGANIZE│───>│ REFLECT │───>│ ENGAGE  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
   Chat          Inbox          Tabs         Projects         Today
   Input        Review        System         View            Tab
```

### 1. Capture
Users chat with Claude using natural language:
- "Buy groceries" (clear action - goes directly to Today)
- "Plan vacation" (vague - goes to Inbox for clarification)

The system intelligently routes based on task clarity.

### 2. Clarify
Tasks in Inbox need a defined **next action** - the specific physical step to move forward:
- "Plan vacation" → Next Action: "Search flights to Hawaii for March"
- "Fix the bug" → Next Action: "Reproduce the error in dev environment"

Clarification moves tasks from Inbox to Today or Optional.

### 3. Organize
The tab system provides automatic organization:

| Tab | Items Shown | GTD Concept |
|-----|-------------|-------------|
| **Today** | Clarified tasks due today/overdue | Next Actions (time-sensitive) |
| **Optional** | Clarified tasks without urgent dates | Next Actions (anytime) |
| **Inbox** | Unclarified captures | Processing Queue |
| **Projects** | Multi-task groupings | Project Lists |
| **Done** | Completed tasks | Reference/Archive |

### 4. Reflect
- **Projects View**: See all initiatives and their progress
- **Postpone Tracking**: Identify tasks being avoided (3+ postponements trigger a confirmation)
- **Activity Log**: Audit trail of all task operations

### 5. Engage
- **Today Tab**: Focus on what's actionable now
- **Bulk Actions**: Quickly complete multiple related tasks
- **Do Today Button**: Pull Optional tasks into Today when ready

## Task Lifecycle

```
                    ┌──────────────┐
                    │   CAPTURE    │
                    │  (via Chat)  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │   INBOX     │           │   TODAY     │
       │ (unclarified)│          │ (clarified) │
       └──────┬──────┘           └──────┬──────┘
              │                         │
              │ clarify                 │
              ▼                         │
       ┌─────────────┐                  │
       │  OPTIONAL   │◄─────────────────┤
       │ (no due date)│                 │
       └──────┬──────┘                  │
              │                         │
              │ "Do Today"              │
              └─────────────┬───────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │    DONE     │
                     │ (completed) │
                     └─────────────┘
```

## Postponement Philosophy

Repeated postponement is a signal, not a sin. When a task is postponed 3+ times, the system prompts:

> "This task has been postponed multiple times. Would you like to remove it or keep it?"

This implements the GTD principle: if you keep deferring something, either:
- It's not actually important (remove it)
- It needs re-clarification (the next action isn't right)
- It should be a "someday/maybe" item

## Project Concept

A **project** in GTD is any outcome requiring more than one action. In this system:

- Tasks can be assigned to projects via `--project "Name"`
- Projects are automatically created when first referenced
- The Projects tab shows:
  - All projects with active/done counts
  - Which projects have a defined next action
  - Quick access to project-specific task lists

Projects without next actions are flagged - every active project should have at least one defined next step.

## Status Model

Tasks have four possible statuses:

| Status | Meaning | Visible In |
|--------|---------|------------|
| `inbox` | Newly captured, needs clarification | Inbox tab |
| `active` | Clarified and actionable | Today or Optional |
| `someday` | Deferred, not currently active | Optional tab |
| `done` | Completed | Done tab |

## Priority System

Three priority levels affect display ordering:

- **High**: Displayed with warning icon, sorted first
- **Medium**: Default priority, no special indicator
- **Low**: Displayed with down-arrow icon, sorted last

Within each priority level, tasks are sorted by due date (overdue first).

## Conversational Interface Design

Claude serves as both:
1. **Input Method**: Natural language task capture
2. **Assistant**: Helps clarify vague tasks, suggests next actions

Example interaction:
```
User: "I need to deal with the car insurance thing"
Claude: I'll add that to your inbox. To move it to your action list,
        what's the specific next step? For example:
        - "Call insurance company to get a quote"
        - "Compare rates on insurance comparison site"
        - "Find current policy renewal date"
```

This guided clarification is core to reducing the cognitive load of task management.
