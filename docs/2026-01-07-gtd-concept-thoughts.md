# GTD Chat Implementation Concept

## Status: Research & Decision Phase

---

## Research Summary

### Core GTD Value (What Actually Helps Users)

1. **Mind Like Water** - Externalizing ALL open loops reduces cognitive load and stress
2. **Next Actions** - Physical, concrete next steps (not vague tasks)
3. **Capture Friction → Zero** - The easier to capture, the more gets captured
4. **Weekly Review** - Regular reflection keeps system trusted and current
5. **Context-Based Work** - Do tasks based on where you are / tools available

### What Users Struggle With Most

1. **Processing backlog** - Capture outpaces clarification
2. **Weekly review discipline** - Most skip it, system decays
3. **Defining "what is it?"** - Unclear inputs stay stuck
4. **Tool complexity** - Too many features = abandonment
5. **Higher horizons neglect** - All tasks look equal without perspective

### 80/20 of GTD (Maximum Value, Minimum Effort)

| High Value | Low Value |
|------------|-----------|
| Quick capture to inbox | Complex folder hierarchies |
| Next action clarity | Detailed project plans |
| Weekly review prompt | Daily planning rituals |
| Simple contexts (@home, @work, @errand) | Elaborate tagging systems |
| "What's the next physical action?" | Time estimates |

---

## Our Unique Advantage: AI Chat

Unlike traditional GTD apps, we have a **conversational AI**. This enables:

- **Natural language capture** - "remind me to call mom tomorrow"
- **AI-assisted clarification** - "What's the actual next action here?"
- **Proactive review prompts** - AI initiates weekly review
- **Context-aware suggestions** - "You have 3 quick tasks for @errands"
- **Friction elimination** - No UI learning curve, just talk

---

## Decisions Needed

### 1. Scope: Full GTD vs. "GTD-Lite"

**Option A: Full GTD**
- Inbox, Projects, Next Actions, Waiting For, Someday/Maybe
- Contexts, Areas of Focus
- Weekly Review workflow
- *Risk: Complexity, user overwhelm*

**Option B: GTD-Lite (Recommended?)** ✓
- Inbox + Active Tasks + Done
- Simple priority (High/Medium/Low)
- AI-prompted weekly review
- *Risk: May not satisfy GTD purists*

**Option C: Progressive Disclosure**
- Start simple, unlock complexity as user engages
- *Risk: Implementation complexity*

**DECISION: B - GTD-Lite**

---

### 2. Inbox Philosophy

**Option A: Separate Inbox**
- Items land in inbox first
- Require explicit "clarify" step to become tasks
- *More GTD-pure*

**Option B: Direct to Tasks (Current)**
- "Add task: buy milk" creates task immediately
- Inbox is implicit (unclarified = no next action defined)
- *Lower friction*

**Option C: Smart Routing** ✓
- AI decides: clear items → tasks, vague items → inbox
- "Buy milk" → task, "think about career" → inbox

**DECISION: C - Smart Routing (AI decides)**

---

### 3. Projects vs. Tasks

**Option A: Explicit Projects**
- Multi-step outcomes are "Projects"
- Each has linked next actions
- *Classic GTD*

**Option B: Tags/Labels Only**
- Tasks can be tagged with project names
- No formal project entity
- *Simpler*

**Option C: AI-Inferred Projects** ✓
- AI suggests grouping related tasks
- "These 4 tasks seem related to 'Kitchen Renovation'"
- **Plus: Next Action Awareness** - AI ensures each project has a clear next action

**DECISION: C - AI-Inferred Projects + Next Action Awareness**

---

### 4. Contexts

**Option A: Classic Contexts**
- @home, @work, @errands, @computer, @phone, @anywhere
- Filter tasks by current context

**Option B: Energy/Time Contexts**
- "Quick wins" (< 5 min)
- "Deep work" (focused time)
- "Low energy" (routine tasks)

**Option C: No Explicit Contexts**
- AI suggests based on conversation
- "You mentioned you're heading out - here are your errand tasks"

**DECISION: None for now - Keep it simple**

---

### 5. Weekly Review

**Option A: Structured Review Workflow**
- Step-by-step guided review
- "Let's review your projects... Now waiting-for items..."

**Option B: Conversational Review**
- AI asks: "Want to do a quick review? What's on your mind?"
- Organic, less formal

**Option C: Proactive AI Review** ✓
- AI notices patterns and prompts
- "You have 5 stale tasks from 2 weeks ago. Review?"

**DECISION: C - Enhanced Proactive AI Review**
- AI auto-reviews when last review > 1 day ago
- AI does the review work silently
- Only surfaces a few important clarifications (if any)
- User barely notices review happening - just sees cleaner system

---

### 6. Right Panel Purpose

**Current**: Simple task list display

**Options**:
- A: Inbox focus (process items)
- B: Today/Next view (what to do now)
- C: Context-filtered view
- D: Dashboard (stats + quick actions)
- E: Flexible/switchable views ✓

**DECISION: E - Tabs with Focus as default**
- Tab: **Focus** (default) - Next actions, prioritized
- Tab: **Inbox** - Unclarified items needing processing
- Tab: **All** - Everything
- Tab: **Done** - Completed items

---

### 7. Chat Panel Role

**Option A: Primary Interface**
- All GTD actions through chat
- Panel is read-only display

**Option B: Complementary** ✓
- Chat for complex operations
- Panel for quick toggles/views

**Option C: AI Assistant**
- Chat provides guidance and suggestions
- "I notice you haven't reviewed in a week..."

**DECISION: B - Complementary**
- Chat: Add tasks, discuss priorities, clarify items, ask questions
- Panel: Quick complete/uncomplete, view switching, at-a-glance status

---

## Concept: AI-Powered GTD-Lite

### Core Philosophy

**"The AI does the GTD work, the user just talks and acts."**

Users shouldn't need to know GTD methodology. They just capture thoughts naturally,
and the AI handles clarification, organization, and review. The system stays clean
without user effort.

---

### Guiding Principles

1. **Capture = just say it** - "buy milk", "think about career change", "call mom Tuesday"
2. **AI routes intelligently** - Clear → Focus, Vague → Inbox, needs work → AI clarifies
3. **Next action is king** - Every item in Focus has a concrete physical next step
4. **Invisible review** - AI reviews daily, user only sees "hey, is X still relevant?"
5. **Panel for doing, Chat for thinking** - Quick toggles vs. discussions

---

### Data Model

```
Item {
  id: string
  title: string                    // The raw capture
  nextAction: string | null        // Clarified next physical action
  status: 'inbox' | 'active' | 'done' | 'someday'
  priority: 'high' | 'medium' | 'low'
  project: string | null           // AI-inferred grouping
  dueDate: Date | null             // When it appears in Focus
  createdAt: Date
  completedAt: Date | null
}

ActivityLog {
  id: string
  itemId: string
  action: 'created' | 'postponed' | 'completed' | 'clarified' | 'deleted'
  timestamp: Date
  details: {
    fromDate?: Date               // For postponements
    toDate?: Date
    reason?: string               // Optional user note
  }
}

SystemMeta {
  lastAutoReview: Date
}
```

**Key insights:**
- `title` = what user said, `nextAction` = what to actually do
- `dueDate` = tickler date (when it surfaces in Focus)
- `ActivityLog` tracks all changes, especially postponements

**Postponement intelligence:**
- Item postponed 3+ times → AI asks "This keeps getting pushed. Still want it?"
- Can surface patterns: "You often postpone 'gym' tasks..."

---

### Panel Tabs

| Tab | Shows | Purpose |
|-----|-------|---------|
| **Focus** (default) | Due today or overdue | What you MUST do today |
| **Optional** | Has nextAction, no deadline or future deadline | Could do if you have time |
| **Inbox** | Items without nextAction | Needs clarification |
| **Projects** | List of projects → drill into tasks | Grouped view |
| **Done** | Completed items | Satisfaction, reference |

**Tickler model:** Items only appear in Focus when their deadline arrives.
- "Call dentist by Friday" → appears in Focus on Friday
- "Buy milk" (no deadline) → lives in Optional until you assign a date or complete it

**Projects tab:**
- Shows list of all projects with task counts
- Click project → see its tasks with back navigation
- Projects are AI-inferred from related tasks

---

### AI Behaviors

#### On Capture (Chat)
```
User: "buy groceries"
AI: ✓ Added to Focus: "Buy groceries"

User: "think about switching jobs"
AI: ✓ Added to Inbox. When you're ready, let's clarify what the next step might be.

User: "call dentist to schedule cleaning by Friday"
AI: ✓ Added to Focus: "Call dentist to schedule cleaning" (due Fri)
```

#### On Auto-Review (Background Agent)

**Trigger:** Session start spawns background review agent IF >1 day since last review.

**Agent checks (silently):**
- Overdue items in Focus
- Inbox items > 3 days old
- Items postponed 3+ times
- Optional items untouched > 2 weeks
- Projects with no next action

**Agent output:** Creates small clarification task list (if anything found)

**Chat startup behavior:**
```
[If clarifications pending]
AI: "Welcome back! I noticed a few things that could use a quick review.
     Want to do that now, or after you've done what you came here for?"

     [Let's do it now] [Later]
```

If "Later" → AI offers again after user completes their main task.

**Benefits:**
- Never blocks user's flow
- Review happens invisibly
- Only surfaces truly useful clarifications
- User chooses when to engage

#### On Postponement

**UI:** Dropdown with days to postpone
```
[Postpone ▼]
  +1 day
  +2 days
  +3 days
  +7 days
  +14 days
  +30 days
```

Click → immediately postpones, logs activity, item disappears from Focus.

**Visual feedback:** If item has been postponed before, show count badge:
```
☐ Call dentist [Postpone ▼] (2x postponed)
```

**On 3+ postponements:** After selecting from dropdown:
```
AI: "This is the 3rd time postponing 'Call dentist'.
     Still want to keep it, or should we remove it?"
     [Keep it] [Remove]
```

→ Logs: { action: 'postponed', fromDate: today, toDate: today + N days }

#### On Clarification (When Needed)
```
User: "prepare for performance review"
AI: "Added to Inbox. That sounds like a project.
     What's one small next step? Maybe 'List accomplishments from Q4'?"
User: "yeah that works"
AI: ✓ Moved to Focus with next action: "List accomplishments from Q4"
     Project: "Performance Review Prep"
```

---

### Panel Interactions

| Action | How |
|--------|-----|
| Complete item | Click checkbox |
| Uncomplete item | Click green check |
| Postpone item | Click postpone button → pick new date |
| Switch tabs | Click tab |
| See item details | (future: expand/click) |

**Focus tab extras:**
- Shows overdue count badge
- Postpone button on each item
- "Done for today" feeling when empty

Chat handles: add, clarify, prioritize, discuss, bulk operations, review

---

### What We're NOT Building (Yet)

- Contexts (@home, @work)
- Recurring tasks
- Time estimates
- Subtasks
- Tags beyond project
- Waiting-for tracking
- Areas of focus / horizons

---

## Open Questions

- [x] ~~Decisions 1-7~~ → Resolved
- [x] ~~Due dates~~ → Tickler model: dueDate = when it appears in Focus
- [x] ~~Someday/Maybe~~ → Optional tab (available but not due)
- [x] ~~Activity tracking~~ → ActivityLog with postponement intelligence
- [x] ~~Project view~~ → Dedicated Projects tab with list → task drill-down
- [x] ~~Auto-review trigger~~ → Background agent on session start (if >1 day)
- [x] ~~Postpone UI~~ → Dropdown with +N days options

All major decisions resolved!

---

## Implementation Phases

### Phase 1: Data Model + Tabs
- Update todo schema (add nextAction, status, project, dueDate)
- Add ActivityLog for tracking
- Implement tab UI (Focus, Optional, Inbox, Projects, Done)
- Focus = due today or overdue
- Optional = has nextAction, future/no deadline

### Phase 2: Postpone Flow
- Add postpone dropdown to Focus items (+1, +2, +3, +7, +14, +30 days)
- Log postponements in ActivityLog
- Show postpone count badge on items
- 3+ postponements triggers "keep or remove?" prompt

### Phase 3: Projects Tab
- List view of all projects with task counts
- Click project → task list with back navigation
- AI-inferred project grouping

### Phase 4: Smart Capture
- AI routing: clear → active+nextAction, vague → inbox
- AI suggests due dates for actionable items
- Project inference on capture

### Phase 5: Background Review Agent
- Spawn on session start if >1 day since last review
- Silently checks for issues, creates clarification list
- Chat startup offers review now or later
- Re-offers after user completes main task

### Phase 6: Polish
- Overdue badge on Focus tab
- "All done for today" empty state
- Clarification conversation flows
- Project task counts and progress

---

*Document Status: v0.4 - All Decisions Resolved*
