# Claude Code Project Instructions

## Task Management: Use todo-manager Skill

**IMPORTANT**: This project uses the `todo-manager` skill for all task tracking and planning.

When working on this codebase:

1. **Use `/todo` or the todo-manager skill** for tracking work items, not the built-in TodoWrite tool
2. **Add tasks** with natural language: "add task: implement feature X"
3. **View tasks** by tab: Focus, Optional, Later, Inbox, Done
4. **Complete tasks** when done: "mark done: task description"

### Quick Commands
- `/todo` - Show your todo list
- `/todo add <task>` - Add a new task
- `/todo done <task>` - Mark task complete
- `/todo focus` - Show today's tasks

### Why todo-manager?
- Persists across sessions (stored in Supabase)
- Integrates with the GTD workflow this app implements
- Provides visibility into task history and patterns

## Project Context

This is a GTD (Getting Things Done) Todo Manager with:
- **Zustand** for reactive state management
- **Supabase Realtime** for live database sync
- **Next.js 15** with App Router
- **Playwright** for E2E testing

## Key Documentation

- `docs/current/overview.md` - Project overview
- `docs/current/e2e-testing.md` - E2E testing playbook
- `docs/current/technical-architecture.md` - System architecture
