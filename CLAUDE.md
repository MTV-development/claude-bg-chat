# Claude Code - Coding Assistant

You are a coding assistant helping develop the GTD Todo Manager application.

## Project Overview

This is a full-stack GTD (Getting Things Done) todo manager with:
- **Next.js 15** with App Router
- **Zustand** for reactive state management
- **Supabase** for database + Realtime sync
- **Playwright** for E2E testing

## Architecture Note

This project has two Claude contexts:

| Context | Directory | Purpose |
|---------|-----------|---------|
| Coding Assistant | `/` (root) | You are here - developing the app |
| App Backend | `/claude-backend/` | Separate context for the todo-manager skill |

The app backend runs in `claude-backend/` with its own CLAUDE.md focused on the todo-manager skill. That context is completely isolated from this codebase.

## Key Documentation

- `docs/current/overview.md` - Project overview
- `docs/current/e2e-testing.md` - E2E testing playbook
- `docs/current/technical-architecture.md` - System architecture

## Development Practices

- Use standard Claude Code tools (TodoWrite, beads, etc.)
- Run `npm run build` and `npx tsc --noEmit` to verify changes
- E2E tests: `npx playwright test e2e/realtime-sync.spec.ts --headed`
