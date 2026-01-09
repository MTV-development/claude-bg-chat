# New Slide-In Specification

**Created:** 2026-01-09
**Status:** Ready

## Overview

Add a collapsible/slide-out capability to the right todo panel. When collapsed, the panel collapses to zero width and the chat panel expands to fill the full viewport width. A toggle button on the border allows the user to show/hide the panel at will.

## Current Architecture

**Layout Structure** (`app/page.tsx`):
- Main container: `flex h-screen` (flexbox, full viewport)
- Left panel (chat): `flex-1` with border-right
- Right panel (todo): `flex-1` containing `<TodoList />`
- Both panels always visible, equal width distribution

**Right Panel** (`components/TodoList.tsx`):
- 7 tabs: Focus, Optional, Later, Inbox, Projects, Done, How To
- Header with tabs, scrollable content area, floating add button, footer
- No existing panel visibility state

**Styling**: Tailwind CSS + CSS custom properties for theming

**State Management**: Only ThemeContext exists; no panel visibility context

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Panel width | Proportional (flex-1) | Maintains current 50/50 layout feel |
| Animation | Width collapse (flex-1 → w-0) | Simple, chat expands naturally with flexbox |
| Toggle placement | On border | Intuitive, like VS Code sidebar |
| Persistence | None | Fresh start each session, starts open |
| Keyboard shortcut | None | Keep it simple |
| Icons | Text chevrons (< >) | No icon library needed |

## Implementation Details

### State Management
- Add `isPanelOpen` state (boolean, default: `true`)
- No localStorage persistence - panel always starts open on page load
- Keep state in `page.tsx` (main layout component)

### Toggle Button

**Dimensions:**
- Width: 24px
- Height: 48px
- Padding: 4px horizontal, 12px vertical

**Positioning:**
- Absolutely positioned on the right edge of the chat panel
- Vertically centered (`top-1/2 -translate-y-1/2`)
- z-index to appear above both panels

**Styling:**
```tsx
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

**Icon characters:**
- When open: `›` (close panel, pointing right)
- When closed: `‹` (open panel, pointing left)

### Layout Changes

**Chat panel (left):**
- Keep `flex-1` - automatically expands when right panel collapses
- Add `relative` for toggle button positioning

**Right panel:**
```tsx
<div className={`
  ${isPanelOpen ? 'flex-1' : 'w-0'}
  bg-theme-bg-secondary
  transition-all duration-300 ease-in-out
  overflow-hidden
`}>
  <TodoList onClarifyRequest={handleClarifyRequest} />
</div>
```

### Files to Modify

1. `app/page.tsx`:
   - Add `const [isPanelOpen, setIsPanelOpen] = useState(true)`
   - Add `relative` class to left panel div
   - Add toggle button inside left panel (positioned at right edge)
   - Update right panel div with conditional classes

2. No changes needed to `components/TodoList.tsx`

## References

**Codebase Files:**
- `app/page.tsx` - Main layout (lines 207-346)
- `components/TodoList.tsx` - Right panel component
- `app/globals.css` - Theme CSS variables
