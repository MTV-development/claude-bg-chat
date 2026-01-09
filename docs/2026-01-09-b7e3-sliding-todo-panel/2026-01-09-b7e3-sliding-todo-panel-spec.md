# Sliding Todo Panel Specification

**Created:** 2026-01-09
**Status:** Draft

## Overview

Make the **existing TodoList panel** (right side of the UI) slidable, so users can collapse it to gain more space for the chat/messages area, and expand it when needed. The panel follows a **persistent drawer** pattern - it remains visible until the user explicitly closes it.

## Current State

The app currently has a fixed 50/50 flex layout:
- **Left:** Chat/messages area (`flex-1`)
- **Right:** TodoList component (`flex-1`)

Files involved:
- `app/page.tsx` - Main layout (lines 207-348)
- `components/TodoList.tsx` - The panel to make slidable

## Design Decisions

### Behavior
- **Initial state:** Panel starts **open** on new sessions
- **Persistence:** Non-ephemeral - stays open/closed until user toggles
- **Layout:** **Push/resize** - chat area expands to full width when panel is closed
- **No backdrop:** No modal behavior, just a sliding panel
- **No keyboard shortcut:** Toggle via edge tab and close button only

### Toggle Mechanism
- **Vertical rail:** When panel is **closed**, a thin vertical bar along the entire right edge
  - Contains a checklist/task icon (vertically centered)
  - Entire rail is clickable to open panel
  - Subtle hover state to indicate interactivity
- **Close button:** When panel is **open**, a chevron-right icon in the panel header
  - Click to close/collapse panel

### Animation
- **Opening:** `ease-out`, 250ms
- **Closing:** `ease-in`, 200ms
- Use `transform: translateX()` for hardware acceleration
- Main content area animates its width expansion/contraction in sync

### Dimensions
- **Panel width:** 50% of viewport (matches current `flex-1` behavior)
- **Vertical rail:** ~24-32px wide, full height of viewport

## Implementation Approach

Use CSS Transform with React state:
- Panel slides via `transform: translateX(0)` (open) / `translateX(100%)` (closed)
- Main content uses flex to fill available space
- State managed via React `useState` in `page.tsx`
- Rail component rendered when panel is closed

## Open Questions

- [x] ~~What should the edge tab look like exactly?~~ → Vertical rail, full height
- [x] ~~Should panel width be fixed or percentage-based?~~ → 50% of viewport

## References

- [Material Design Navigation Drawer Guidelines](https://m3.material.io/components/navigation-drawer/guidelines)
- [shadcn/ui Sidebar](https://ui.shadcn.com/docs/components/sidebar)
