# Claude Code Project Instructions

## Dual Role: Coding Assistant + Todo App Backend

This project is a **GTD Todo Manager** where Claude serves two roles:

1. **Coding Assistant** (Claude Code) - Helping develop and maintain this codebase
2. **Application Backend** - Powering the chat interface where users manage their todos

Both roles use the **same Supabase database** for task storage.

## Task Management: Use todo-manager Skill

**CRITICAL**: Always use the `todo-manager` skill for ALL task operations.

- **DO NOT** use the built-in TodoWrite tool (it's ephemeral and separate)
- **DO** use `/todo` or invoke the todo-manager skill
- Tasks persist to Supabase and sync in realtime to the UI

### Quick Reference
| Command | Description |
|---------|-------------|
| `/todo` | Show your todo list |
| `/todo add <task>` | Add a new task |
| `/todo done <task>` | Mark task complete |
| `/todo focus` | Show today's tasks |

### Why This Matters
- The todo-manager skill writes to the **production Supabase database**
- Changes appear immediately in the app UI via Realtime sync
- Provides continuity between coding sessions and app usage
- We're "eating our own dog food" - using the system we're building

## Project Context

GTD (Getting Things Done) Todo Manager with:
- **Zustand** for reactive state management
- **Supabase Realtime** for live database sync
- **Next.js 15** with App Router
- **Playwright** for E2E testing

## Key Documentation

- `docs/current/overview.md` - Project overview
- `docs/current/e2e-testing.md` - E2E testing playbook
- `docs/current/technical-architecture.md` - System architecture
