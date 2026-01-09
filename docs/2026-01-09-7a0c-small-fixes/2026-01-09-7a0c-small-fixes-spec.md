# Small Fixes Specification

**Created:** 2026-01-09
**Status:** Ready for Implementation

## Overview

UI improvements to the todo list, focusing on always-visible action buttons and an Inbox clarification workflow.

## Changes

### 1. Always-Visible Button Bar

**Affected tabs:** Focus, Optional, Later, Inbox

Replace the current floating "Complete" button (which only appears when tasks are selected) with a persistent button bar that is **always visible**:

| Tab | Button | Behavior |
|-----|--------|----------|
| Focus | Complete | Disabled (greyed out) when no tasks checked; active when tasks checked |
| Optional | Complete | Same as Focus |
| Later | Complete | Same as Focus |
| Inbox | Clarify | Disabled when no tasks checked; active when tasks checked |
| Done | Undo | Disabled when no tasks checked; active when tasks checked |

**Visual change:** The button bar should always render in a fixed position at the top of the task list area, not conditionally appear only when items are selected. When disabled, use reduced opacity and `cursor-not-allowed`.

When active, clicking the button performs the bulk action on all checked tasks.

### 2. Individual Clarify Action on Inbox Tasks

Add a "Clarify" button to each task in the Inbox tab, styled like the existing "Do Today" button on other tabs.

When clicked, the button populates the chat input with:
```
I want to clarify the task "[task title]"
```

For bulk Clarify (via the button bar with multiple tasks selected):
```
I want to clarify these tasks:
- [task 1 title]
- [task 2 title]
```

The user reviews the message and presses Enter to send.

### 3. Remove "Has Next Action" Indicator in Projects Tab

Remove the "has next action" indicator/badge from individual tasks when viewing them within a project.

## Technical Implementation

### Chat Injection

Pass a callback from `page.tsx` to `TodoList`:

```tsx
// page.tsx
const handleClarifyRequest = (text: string) => {
  setInput(text);
  inputRef.current?.focus();
};

<TodoList onClarifyRequest={handleClarifyRequest} />
```

```tsx
// TodoList.tsx
interface TodoListProps {
  onClarifyRequest?: (text: string) => void;
}
```

### Bulk Action Handlers

The existing `handleBulkAction` function toggles completion status. Add a new handler for bulk clarify:

```tsx
// TodoList.tsx
const handleBulkClarify = () => {
  if (selectedIds.size === 0 || !onClarifyRequest) return;

  const selectedTasks = todos.filter(t => selectedIds.has(t.id));

  if (selectedTasks.length === 1) {
    onClarifyRequest(`I want to clarify the task "${selectedTasks[0].title}"`);
  } else {
    const taskList = selectedTasks.map(t => `- ${t.title}`).join('\n');
    onClarifyRequest(`I want to clarify these tasks:\n${taskList}`);
  }

  setSelectedIds(new Set()); // Clear selection after triggering
};
```

The button bar calls `handleBulkAction` for Complete/Undo tabs, and `handleBulkClarify` for the Inbox tab.

### Clarification Workflow

1. User clicks "Clarify" → chat input populated
2. User sends message → Claude discusses to determine:
   - Does this task have a deadline? If yes, what date?
   - Can this be done anytime?
3. Claude updates the task via `todo-manager` skill:
   ```bash
   # Set next action + deadline
   node scripts/gtd/dist/cli.js update "<task>" --next-action "Call dentist" --due YYYY-MM-DD
   # or set next action + anytime flag
   node scripts/gtd/dist/cli.js update "<task>" --next-action "Read the book" --can-do-anytime true
   ```
4. Task moves from Inbox to the appropriate tab (Focus/Optional/Later)

**Note:** The `getItemTab()` function in `lib/store.ts` determines which tab a task belongs to based on its properties. The key requirement for leaving Inbox is having a `nextAction` set. The tab placement logic (in order):
1. `status === 'done'` → Done
2. `nextAction` is null → Inbox (needs clarification)
3. `canDoAnytime: true` → Optional
4. `dueDate` on/before today → Focus
5. `dueDate` in future → Later
6. Otherwise → Inbox

So clarification requires setting `--next-action` plus either `--due` or `--can-do-anytime` to move the task to an actionable tab.

## Files to Modify

- `app/page.tsx` - Add `handleClarifyRequest` callback, pass to TodoList
- `components/TodoList.tsx` - Accept `onClarifyRequest` prop, implement button bar, add Clarify buttons
