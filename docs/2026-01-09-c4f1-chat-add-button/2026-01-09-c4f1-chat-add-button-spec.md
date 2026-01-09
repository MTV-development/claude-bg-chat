# Specification: Chat Add Button

**ID:** 2026-01-09-c4f1
**Created:** 2026-01-09
**Status:** Ready for Implementation

## Problem Statement

The current "+" floating button opens a structured modal for adding tasks. While efficient for quick entry, it doesn't leverage the conversational power of Claude for:
- Natural language date parsing ("next Tuesday", "end of month")
- Multi-task capture in one message
- Immediate clarification of vague ideas
- Context-aware task creation (linking to existing projects)

Users need a way to add tasks via chat while staying in the context of the tab they're viewing.

## Solution Overview

Add a twin "+ Chat" button next to the existing "+" button on Focus, Optional, Later, and Inbox tabs. Clicking it auto-submits a tab-specific prompt to the chat, letting Claude guide the task creation conversation.

## Requirements

### Functional Requirements

1. **Side-by-side buttons**: Display both "+" (existing modal) and "+ Chat" (new) buttons
2. **Auto-submit behavior**: Clicking "+ Chat" immediately sends the initial prompt (no editing)
3. **Tab-specific prompts**: Each tab has a contextual initial prompt:
   - **Focus**: "Help me add a task I need to do today"
   - **Optional**: "Help me add a task I can do anytime"
   - **Later**: "Help me add a task with a future deadline"
   - **Inbox**: "Help me capture a vague idea or task"
4. **Preserve existing behavior**: The "+" button continues to open AddItemModal as before

### UI/UX Requirements

1. **Button placement**: "+ Chat" appears to the left of the existing "+" button
2. **Visual distinction**:
   - "+" button: Solid filled (existing style)
   - "+ Chat" button: Smaller, with chat bubble icon
3. **Hover states**: Both buttons have clear hover feedback
4. **Mobile friendly**: Buttons remain accessible on smaller screens

### Technical Requirements

1. **New callback prop**: `TodoList` receives `onChatAddRequest?: (prompt: string) => void`
2. **Auto-submit implementation**: The handler in `page.tsx` should:
   - Call the existing submit logic directly with the prompt text
   - Not require the input field to be populated first
   - Handle the case where a message is already being sent (ignore or queue)
3. **Chat focus**: After auto-submit, chat input should be focused for follow-up. The input remains disabled while Claude responds (existing behavior), but focus ensures the user can type immediately when the response completes
4. **No new dependencies**: Use existing icon patterns (inline SVG)

## Out of Scope

- Changing the AddItemModal behavior
- Adding chat-add to Projects tab (projects have different workflow)
- Customizable prompts (hardcoded for now)
- Keyboard shortcuts for the new button

## Design Details

### Button Layout

```
                    [ + Chat ]  [ + ]
                    (smaller)   (larger, primary)
```

The "+ Chat" button is:
- Smaller (w-10 h-10 vs w-14 h-14)
- Positioned to the left with gap
- Uses chat bubble + plus icon
- Shares the same visibility condition as "+" button (`showAddButton` at TodoList.tsx:758)
- Only visible on Focus, Optional, Later, Inbox tabs (not Projects, Done, or How To)

### Initial Prompts by Tab

| Tab | Prompt | Rationale |
|-----|--------|-----------|
| Focus | "Help me add a task I need to do today" | Sets deadline expectation |
| Optional | "Help me add a task I can do anytime" | Signals no deadline needed |
| Later | "Help me add a task with a future deadline. Ask if this is a hard deadline or if I could do it anytime before then." | Prompts for future date AND clarifies hard vs flexible deadline (flexible → Optional with deadline, hard → Later) |
| Inbox | "Help me capture a vague idea or task" | Invites unclear thoughts |

**Note on Later vs Optional:** Tasks with `canDoAnytime: true` appear in Optional even if they have a deadline. The Later prompt guides Claude to ask about deadline flexibility so the task is correctly categorized.

### Comparison with Existing Clarify Flow

The `onClarifyRequest` callback exists for the Clarify button, but has **different behavior**:

| Callback | Behavior | User Action Required |
|----------|----------|---------------------|
| `onClarifyRequest` | Populates chat input with text | User must press Send |
| `onChatAddRequest` | **Auto-submits** prompt to chat | None - message sends immediately |

The new `onChatAddRequest` uses a similar prop signature `(prompt: string) => void` but the handler in `page.tsx` must trigger the submit logic directly rather than just setting the input.

## Files to Modify

1. **components/TodoList.tsx**: Add new prop, render twin button
2. **app/page.tsx**: Pass handler, manage auto-submit and focus

## Acceptance Criteria

- [ ] "+ Chat" button visible on Focus, Optional, Later, Inbox tabs
- [ ] Clicking "+ Chat" immediately sends tab-specific prompt to chat
- [ ] Chat receives message and Claude responds appropriately
- [ ] Existing "+" button still opens modal
- [ ] Both buttons are visually distinct and accessible
- [ ] Works on mobile viewport sizes

## Open Questions

None - requirements clarified in discussion.

## References

- Discussion with user on 2026-01-09 covering UX options and technical approach
- Existing clarify button pattern in TodoList.tsx:720-727
