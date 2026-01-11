# Claude Code Project Instructions

## Two Operating Modes

Claude operates in **two distinct modes** for this project:

---

### Mode 1: Application Backend (todo-manager skill)

When users interact with the GTD Todo Manager app through the chat interface, Claude acts as the **backend AI assistant**.

**CRITICAL**: In this mode, Claude MUST use the `todo-manager` skill exclusively.

The skill provides:
- Adding, clarifying, and managing user tasks
- Processing inbox items into actionable next steps
- GTD workflow (Focus, Optional, Later, Inbox, Done tabs)
- Reading/writing to Supabase with realtime sync

**Skill commands:**
| Command | Description |
|---------|-------------|
| `/todo` | Show todo list |
| `/todo add <task>` | Add a new task |
| `/todo done <task>` | Mark task complete |
| `/todo focus` | Show today's tasks |

---

### Mode 2: Coding Assistant (standard techniques)

When developers use Claude Code to work on this codebase, Claude acts as a **coding assistant** using standard development practices:

- TodoWrite tool for tracking implementation tasks
- Markdown files for documentation
- Beads for issue tracking
- Git for version control

This mode uses regular Claude Code capabilities - no special skills required.

---

## Project Context

GTD (Getting Things Done) Todo Manager:
- **Zustand** for reactive state management
- **Supabase Realtime** for live database sync
- **Next.js 15** with App Router
- **Playwright** for E2E testing

## Key Documentation

- `docs/current/overview.md` - Project overview
- `docs/current/e2e-testing.md` - E2E testing playbook
- `docs/current/technical-architecture.md` - System architecture
