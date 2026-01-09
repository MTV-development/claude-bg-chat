# Implementation Plan: Small Fixes (Button Bar & Clarify)

**Spec:** [2026-01-09-7a0c-small-fixes-spec.md](./2026-01-09-7a0c-small-fixes-spec.md)
**Created:** 2026-01-09
**Status:** Complete

## Overview

Implement always-visible action button bar (replacing conditional floating button), add Clarify functionality for Inbox tasks, and remove "Has next action" indicator from Projects tab.

## Test Strategy

Manual verification is primary since this is UI-focused. Build and type checks validate no regressions.

**Verification Commands:**
```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Dev server for manual testing
npm run dev
```

## How We Test in This Codebase

This project uses a multi-layer testing approach:

### Unit Tests (Jest)
- **Framework:** Jest with TypeScript support
- **Location:** Test files alongside source files or in `__tests__` directories
- **Commands:**
  ```bash
  npm test              # Run all unit tests
  npm run test:watch    # Watch mode for development
  npm run test:coverage # Generate coverage report
  ```
- **When to use:** Testing pure functions, utilities, CLI commands, data transformations

### E2E Tests (Playwright)
- **Framework:** Playwright
- **Location:** `e2e/` directory
- **Existing tests:**
  - `accessibility-dark-mode.spec.ts` - Accessibility checks for dark mode
  - `theme-switching.spec.ts` - Theme toggle functionality
  - `visual-regression.spec.ts` - Visual regression testing
- **Commands:**
  ```bash
  npm run test:e2e      # Run E2E tests headless
  npm run test:e2e:ui   # Run with Playwright UI (interactive)
  ```
- **When to use:** Testing UI flows, user interactions, visual regressions

### Build & Type Checks
- **TypeScript:** Strict mode enabled
- **Commands:**
  ```bash
  npm run build         # Full production build (catches most issues)
  npx tsc --noEmit      # Type check only (faster)
  npm run lint          # ESLint checks
  ```

### Testing Strategy for This Implementation

Since this spec is UI-focused (button bar, clarify button):
1. **Primary:** Manual testing in browser (`npm run dev`)
2. **Secondary:** Build passes, no TypeScript errors
3. **Optional:** Add E2E tests if time permits for new Clarify workflow

---

## Phase 1: Wire Up Clarify Callback

**Goal:** Establish communication path from TodoList to page.tsx for populating chat input
**Verification:** `npm run build` passes; no TypeScript errors

### P1.1: Add onClarifyRequest prop to TodoList

**Files:** `components/TodoList.tsx`
**Changes:**
- Add `onClarifyRequest?: (text: string) => void` to component props interface
- Accept the prop in the function signature

**Acceptance:** Component accepts optional callback prop, builds without error

### P1.2: Pass callback from page.tsx to TodoList

**Files:** `app/page.tsx`
**Changes:**
- Create `handleClarifyRequest` function that sets input and focuses the input ref
- Pass as `onClarifyRequest` prop to `<TodoList />`

**Acceptance:** Callback defined and passed to TodoList, builds without error

### P1 Checkpoint

- [ ] All P1 subtasks complete
- [ ] `npm run build` passes
- [ ] No TypeScript errors

---

## Phase 2: Replace Floating Button with Always-Visible Button Bar

**Goal:** Convert conditional floating action button to persistent button bar
**Verification:** Button bar visible on Focus/Optional/Later/Inbox/Done tabs regardless of selection state

### P2.1: Create Button Bar Component Section

**Files:** `components/TodoList.tsx`
**Changes:**
- Replace the conditional floating action button (`{selectedIds.size > 0 && ...}`) with an always-visible button bar
- Button bar should appear at a fixed position at the top of the task list area
- Remove the condition `selectedIds.size > 0` from visibility logic

**Acceptance:** Button bar renders on all tabs (except howto and project list view)

### P2.2: Implement Disabled State Styling

**Files:** `components/TodoList.tsx`
**Changes:**
- Add disabled state when `selectedIds.size === 0`:
  - Reduced opacity (`opacity-50`)
  - `cursor-not-allowed`
  - `disabled` attribute on button
- Button text should show action name without count when disabled (e.g., "Complete" not "Complete (0 selected)")

**Acceptance:** Button visually disabled and non-clickable when no tasks selected

### P2.3: Implement Tab-Specific Button Labels

**Files:** `components/TodoList.tsx`
**Changes:**
- Focus/Optional/Later tabs: "Complete" button
- Inbox tab: "Clarify" button
- Done tab: "Undo" button
- Button label logic based on `activeTab`

**Acceptance:** Each tab shows appropriate button label

### P2 Checkpoint

- [ ] All P2 subtasks complete
- [ ] `npm run build` passes
- [ ] Manual test: Button bar visible on all task tabs
- [ ] Manual test: Button disabled (greyed) when no tasks selected
- [ ] Manual test: Button enabled with count when tasks selected

---

## Phase 3: Implement Clarify Functionality

**Goal:** Wire up Clarify button to populate chat with clarification request
**Verification:** Clicking Clarify populates chat input with formatted message

### P3.1: Add handleBulkClarify Function

**Files:** `components/TodoList.tsx`
**Changes:**
- Create `handleBulkClarify` function that:
  - Returns early if no selections or no `onClarifyRequest`
  - Gets selected tasks from todos array
  - For single task: `I want to clarify the task "[title]"`
  - For multiple: `I want to clarify these tasks:\n- [title1]\n- [title2]`
  - Calls `onClarifyRequest(text)`
  - Clears `selectedIds`

**Acceptance:** Function exists and handles single/multiple task messages

### P3.2: Wire Button Bar to handleBulkClarify

**Files:** `components/TodoList.tsx`
**Changes:**
- Modify button bar click handler:
  - If `activeTab === 'inbox'`: call `handleBulkClarify()`
  - Otherwise: call `handleBulkAction()` (existing behavior)

**Acceptance:** Inbox tab bulk button triggers clarify, other tabs trigger complete/undo

### P3.3: Add Individual Clarify Button to Inbox Tasks

**Files:** `components/TodoList.tsx`
**Changes:**
- In the task item rendering, add a "Clarify" button for Inbox tab items
- Styled similar to "Do Today" button (same size/colors)
- On click: call `onClarifyRequest(`I want to clarify the task "[title]"`)

**Acceptance:** Each Inbox task shows Clarify button; clicking populates chat

### P3 Checkpoint

- [ ] All P3 subtasks complete
- [ ] `npm run build` passes
- [ ] Manual test: Select Inbox task, click Clarify bar → chat input populated
- [ ] Manual test: Click individual Clarify button → chat input populated
- [ ] Manual test: Multi-select Inbox tasks → chat shows bulleted list

---

## Phase 4: Update todo-manager Skill Instructions

**Goal:** Add guidance for handling UI-triggered clarification requests
**Verification:** Skill document includes clarification workflow instructions

### P4.1: Add Clarification Workflow Section to SKILL.md

**Files:** `.claude/skills/todo-manager/SKILL.md`
**Changes:**
- Add a new section "Handling Clarification Requests" that explains:
  - Recognizing messages like "I want to clarify the task..." (from UI Clarify button)
  - The conversation flow: ask about deadline vs. anytime
  - Using `update` command with `--next-action` plus either `--due` or `--can-do-anytime`
  - Clarify that tasks leave Inbox when they have: nextAction AND (dueDate OR canDoAnytime)
- Note the difference from the simpler `clarify` CLI command (which doesn't set timing)

**Acceptance:** Skill document has clear instructions for handling clarification workflow

### P4 Checkpoint

- [ ] All P4 subtasks complete
- [ ] SKILL.md updated with clarification workflow guidance
- [ ] Instructions match the spec's workflow description

---

## Phase 5: Remove "Has Next Action" from Projects Tab

**Goal:** Remove the "Has next action" badge from project task view
**Verification:** Tasks within a project no longer show the badge

### P5.1: Remove hasNextAction Badge from Project List

**Files:** `components/TodoList.tsx`
**Changes:**
- In the projects list view (when viewing projects, not tasks), the "Has next action" badge is acceptable/useful
- But per spec, we need to remove it from individual tasks within a project
- Locate the project tasks view section and remove any "has next action" indicator if present

**Acceptance:** Tasks in project detail view don't show "has next action" badge

Note: Looking at the code, the "has next action" badge (`project.hasNextAction`) only appears in the project list view, not on individual tasks within a project. The spec says "Remove the 'has next action' indicator/badge from individual tasks when viewing them within a project" - but tasks don't currently show this. We may need to clarify if the spec means removing it from the project list view instead.

### P5 Checkpoint

- [ ] All P5 subtasks complete
- [ ] `npm run build` passes
- [ ] Manual test: Project list may still show badge (if kept)
- [ ] Manual test: Task list within a project shows no "has next action" badge

---

## Phase 6: Update Documentation

**Goal:** Update `/docs/current/` documentation to reflect UI changes
**Verification:** Documentation accurately describes new behavior

### P6.1: Review and Update Documentation

**Files:** `docs/current/overview.md`, `docs/current/technical-architecture.md` (if applicable)
**Changes:**
- Review each file in `/docs/current/` for references to:
  - The floating action button behavior
  - Task completion workflow
  - Inbox clarification process
- Update any outdated descriptions to reflect:
  - Always-visible button bar with disabled state
  - Clarify button and workflow for Inbox tasks
  - Any removed features (has next action badge if applicable)

**Acceptance:** Documentation matches implemented behavior

### P6 Checkpoint

- [ ] All P6 subtasks complete
- [ ] Documentation reviewed and updated as needed
- [ ] No stale references to old behavior

---

## Final Checklist

- [ ] All phases complete
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Manual smoke test completed:
  - [ ] Focus tab: Complete button always visible, disabled when nothing selected
  - [ ] Optional tab: Complete button always visible, disabled when nothing selected
  - [ ] Later tab: Complete button always visible, disabled when nothing selected
  - [ ] Inbox tab: Clarify button always visible, disabled when nothing selected
  - [ ] Inbox tab: Individual Clarify button on each task works
  - [ ] Done tab: Undo button always visible, disabled when nothing selected
  - [ ] Projects tab: No "has next action" badge on individual tasks
- [ ] Ready for review
