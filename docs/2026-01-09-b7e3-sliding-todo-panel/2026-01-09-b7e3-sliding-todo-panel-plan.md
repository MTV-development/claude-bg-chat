# Implementation Plan: Sliding Todo Panel

**Spec:** [2026-01-09-b7e3-sliding-todo-panel-spec.md](./2026-01-09-b7e3-sliding-todo-panel-spec.md)
**Created:** 2026-01-09
**Status:** Not Started

## Overview

Add a collapsible/expandable sliding panel for the TodoList component, allowing users to maximize chat space when needed while maintaining easy access to their tasks.

## Environment Validation

> **Warning: Missing Environment Validation Docs**
>
> No environment validation documentation found in `/docs/current/`.

**Pre-flight commands:**
```bash
# Build and type check
npm run build

# Run linter
npm run lint

# Run unit tests
npm test

# (Optional) Run E2E tests
npm run test:e2e
```

**Expected results:**
- `npm run build` completes without errors
- `npm run lint` shows no warnings/errors (or document known issues)
- `npm test` passes all tests
- Dev server runs at http://localhost:3000

**Known issues:** None documented - run pre-flight to establish baseline.

## Test Strategy

- **Type Safety:** `npm run build` verifies TypeScript compilation
- **Linting:** `npm run lint` catches code quality issues
- **Unit Tests:** `npm test` for any new utility functions
- **Manual Testing:** Visual verification of animation, toggle behavior
- **E2E Tests:** Consider adding Playwright test for panel toggle

---

## Phase 0: Environment Validation

**Goal:** Establish a healthy baseline before making any code changes
**Verification:** All validation commands pass (or known issues are documented)

### P0.1: Run Pre-flight Commands

**Commands:**
```bash
npm run build
npx tsc --noEmit
npm test
```

**Expected Results:**
- `npm run build` completes without errors
- `npx tsc --noEmit` completes (check `/docs/current/` for known type errors)
- `npm test` passes all tests

### P0.2: Document Baseline

**Record:**
- Which checks passed
- Which checks failed (and whether they're known issues per `/docs/current/`)
- Any unexpected issues discovered

### P0 Checkpoint

- [ ] All validation commands run
- [ ] Results documented in progress log
- [ ] Known issues identified and noted
- [ ] Ready to proceed with implementation

---

## Phase 1: Panel State and Close Button

**Goal:** Add the ability to close the panel via a button in the TodoList header
**Verification:** Panel can be closed by clicking the close button; chat area expands to full width

### P1.1: Add Panel State to page.tsx

**Files:** `app/page.tsx`
**Changes:**
- Add `useState` for panel visibility: `const [isPanelOpen, setIsPanelOpen] = useState(true)`
- Pass `onClose` callback prop to TodoList component
**Acceptance:** State exists and callback function is defined

### P1.2: Add Close Button to TodoList Header

**Files:** `components/TodoList.tsx`
**Changes:**
- Add `onClose?: () => void` to `TodoListProps` interface
- Add close button (chevron-right icon) in the header section next to "Todo List" title
- Button calls `onClose` when clicked
- Style: small icon button, subtle hover state
**Acceptance:** Close button visible in TodoList header; clicking logs or calls the callback

### P1.3: Implement Layout Toggle in page.tsx

**Files:** `app/page.tsx`
**Changes:**
- Conditionally render the TodoList panel based on `isPanelOpen`
- When closed, chat panel should take full width (`flex-1` alone)
- Connect `setIsPanelOpen(false)` to the `onClose` prop
**Acceptance:** Clicking close button hides the panel; chat expands to full width

### P1 Checkpoint

- [ ] All P1 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual verification: Close button hides panel, chat expands

---

## Phase 2: Vertical Rail Toggle

**Goal:** Add a vertical rail on the right edge to re-open the panel when closed
**Verification:** When panel is closed, clicking the rail opens it

### P2.1: Create Vertical Rail Component

**Files:** `app/page.tsx` (inline or new component)
**Changes:**
- Create a thin vertical bar component (24-32px wide, full height)
- Add a checklist/task icon (vertically centered)
- Style: subtle background, hover state to indicate interactivity
- Entire rail is clickable
**Acceptance:** Rail renders with correct dimensions and icon

### P2.2: Integrate Rail into Layout

**Files:** `app/page.tsx`
**Changes:**
- Render the rail when `isPanelOpen === false`
- Position on the right edge of the viewport
- Clicking the rail sets `isPanelOpen(true)`
**Acceptance:** Rail appears when panel is closed; clicking it opens the panel

### P2 Checkpoint

- [ ] All P2 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual verification: Full open/close cycle works via button and rail

---

## Phase 3: Sliding Animation

**Goal:** Add smooth CSS transitions for panel open/close
**Verification:** Panel slides in/out smoothly; no layout jumps

### P3.1: Add CSS Transition to Panel

**Files:** `app/page.tsx`
**Changes:**
- Change panel visibility from conditional render to CSS transform
- Panel always renders but uses `transform: translateX(0)` when open, `translateX(100%)` when closed
- Add transition: `ease-out 250ms` for opening, `ease-in 200ms` for closing
- Panel needs `overflow: hidden` on container to clip during animation
**Acceptance:** Panel slides smoothly instead of instantly appearing/disappearing

### P3.2: Animate Chat Area Width

**Files:** `app/page.tsx`
**Changes:**
- Chat area should smoothly expand/contract as panel slides
- May need to use fixed widths (50%/100%) instead of flex for animation
- Ensure transitions are synchronized with panel slide
**Acceptance:** Chat area width animates smoothly in sync with panel

### P3.3: Handle Rail Transition

**Files:** `app/page.tsx`
**Changes:**
- Rail should appear/disappear smoothly (fade or slide)
- Ensure no visual glitches during state transition
**Acceptance:** Rail transition looks polished, no flicker

### P3 Checkpoint

- [ ] All P3 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual verification: All animations smooth, no layout jumps or flicker

---

## Phase 4: Polish and Edge Cases

**Goal:** Handle edge cases, accessibility, and final polish
**Verification:** Feature is production-ready

### P4.1: Persist Panel State

**Files:** `app/page.tsx`
**Changes:**
- Consider using localStorage to persist panel state across page reloads
- Initialize state from localStorage if available
- This is optional per spec ("non-ephemeral") but improves UX
**Acceptance:** Panel remembers its state after page refresh

### P4.2: Accessibility Improvements

**Files:** `app/page.tsx`, `components/TodoList.tsx`
**Changes:**
- Add `aria-label` to close button and rail
- Ensure focus management is appropriate
- Add `aria-expanded` state to toggle elements
**Acceptance:** Screen reader can understand panel state and controls

### P4.3: Responsive Considerations

**Files:** `app/page.tsx`
**Changes:**
- Verify layout works on various screen sizes
- Consider if panel should auto-close on very small screens (optional)
**Acceptance:** Feature works correctly at different viewport sizes

### P4 Checkpoint

- [ ] All P4 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Manual verification: Feature feels polished and handles edge cases

---

## Final Checklist

- [ ] All phases complete
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] Manual smoke test: full open/close cycle, animations smooth
- [ ] Panel state persists across refresh
- [ ] Ready for review
