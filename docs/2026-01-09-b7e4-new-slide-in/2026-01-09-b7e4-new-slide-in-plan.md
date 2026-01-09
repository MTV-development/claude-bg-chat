# Implementation Plan: New Slide-In

**Spec:** [2026-01-09-b7e4-new-slide-in-spec.md](./2026-01-09-b7e4-new-slide-in-spec.md)
**Created:** 2026-01-09
**Status:** Not Started

## Overview

Add a collapsible todo panel to the right side of the UI. A toggle button on the border between panels allows users to collapse/expand the todo panel, with the chat panel expanding to fill the available space.

## Environment Validation

**Pre-flight commands:**
```bash
npm run build      # TypeScript compilation + Next.js build
npm run lint       # ESLint checks
npm run test       # Jest unit tests
```

**Expected results:**
- Build completes without errors
- Lint passes (or only pre-existing warnings)
- Tests pass

**Known issues:** None documented

## Test Strategy

- **Phase 1:** `npm run build` + `npm run lint` to verify no TypeScript/syntax errors
- **Phase 2:** Manual verification in browser (toggle works, animation smooth)
- **Final:** Full test suite (`npm run test`)

---

## Phase 0: Environment Validation

**Goal:** Establish a healthy baseline before making any code changes
**Verification:** All validation commands pass

### P0.1: Run Pre-flight Commands

Run build, lint, and test commands to verify environment is healthy.

### P0.2: Document Baseline

Record results in progress log.

### P0 Checkpoint

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Ready to proceed with implementation

---

## Phase 1: Core Implementation

**Goal:** Add collapsible panel functionality to page.tsx
**Verification:** `npm run build` passes, toggle button appears in UI

### P1.1: Add Panel State

**Files:** `app/page.tsx`
**Changes:**
- Add `const [isPanelOpen, setIsPanelOpen] = useState(true)` after existing state declarations (around line 65)

**Acceptance:** No TypeScript errors

### P1.2: Add Toggle Button

**Files:** `app/page.tsx`
**Changes:**
- Add `relative` class to left panel div (line 210)
- Add toggle button as last child inside left panel div (before closing `</div>` at line 340)

Button code:
```tsx
{/* Panel Toggle Button */}
<button
  onClick={() => setIsPanelOpen(!isPanelOpen)}
  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10
             w-6 h-12 flex items-center justify-center
             bg-theme-bg-primary border border-theme-border-primary rounded
             text-theme-text-secondary text-sm font-medium
             hover:bg-theme-bg-hover hover:text-theme-text-primary
             focus:outline-none focus:ring-2 focus:ring-theme-accent-primary
             transition-colors"
>
  {isPanelOpen ? '›' : '‹'}
</button>
```

**Acceptance:** Toggle button visible at right edge of chat panel

### P1.3: Update Right Panel Classes

**Files:** `app/page.tsx`
**Changes:**
- Update right panel div (line 343) from:
  ```tsx
  <div className="flex-1 bg-theme-bg-secondary">
  ```
  to:
  ```tsx
  <div className={`${isPanelOpen ? 'flex-1' : 'w-0'} bg-theme-bg-secondary transition-all duration-300 ease-in-out overflow-hidden`}>
  ```

**Acceptance:** Panel collapses when toggle clicked, chat expands to fill space

### P1 Checkpoint

- [ ] All P1 subtasks complete
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Toggle button visible in UI
- [ ] Clicking toggle hides/shows panel

---

## Phase 2: Verification

**Goal:** Verify functionality works correctly across scenarios
**Verification:** Manual testing in dev server

### P2.1: Test Toggle Behavior

**Manual checks:**
1. Start dev server (`npm run dev`)
2. Verify panel starts open (50/50 split)
3. Click toggle button - panel should collapse smoothly
4. Chat panel should expand to 100% width
5. Click toggle again - panel should expand back
6. Verify animation is smooth (~300ms)

**Acceptance:** All manual checks pass

### P2.2: Test Theme Compatibility

**Manual checks:**
1. Toggle to dark theme
2. Verify toggle button styling looks correct
3. Verify hover/focus states work
4. Toggle panel open/closed in dark mode

**Acceptance:** Works correctly in both light and dark themes

### P2.3: Run Full Test Suite

**Commands:**
```bash
npm run build
npm run lint
npm run test
```

**Acceptance:** All commands pass

### P2 Checkpoint

- [ ] Toggle behavior works correctly
- [ ] Works in both light and dark themes
- [ ] All tests pass
- [ ] No console errors in browser

---

## Final Checklist

- [ ] All phases complete
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Manual smoke test completed
- [ ] Ready for review
