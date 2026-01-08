# GTD Todo Manager - Overview

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## What Is This Project?

The GTD Todo Manager is a full-stack task management application that implements Getting Things Done (GTD) principles through a conversational AI interface. Users interact with Claude to capture, clarify, and manage their tasks, while a reactive web UI provides visual organization and quick actions.

## Evolution

This project has evolved through several iterations:

1. **Simple Todo List**: Basic task capture and completion
2. **GTD Enhancement**: Added GTD workflow concepts (Inbox, clarification, next actions)
3. **Current State**: Full GTD implementation with projects, postponement tracking, and activity logging

## Key Capabilities

### Conversational Task Management
- Chat with Claude to add, clarify, and manage tasks
- Natural language input for task capture
- AI-assisted clarification of vague tasks into actionable next steps

### GTD Tab System
| Tab | Purpose |
|-----|---------|
| **Today** | Tasks with clarified next actions due today or overdue |
| **Optional** | Clarified tasks without urgent due dates |
| **Inbox** | New captures needing clarification |
| **Projects** | Grouped view of multi-task initiatives |
| **Done** | Completed tasks with undo capability |

### Smart Features
- **Postpone Tracking**: Warns when tasks are repeatedly postponed (3+ times)
- **Auto-Refresh**: UI stays synchronized with backend state
- **Bulk Actions**: Select and complete/uncomplete multiple tasks
- **Warm Sessions**: Faster Claude responses through session reuse

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **CLI**: Standalone TypeScript CLI for programmatic access
- **Storage**: JSON file-based persistence
- **AI**: Claude integration via CLI adapter

## Project Structure

```
claude-bg-chat/
├── app/                  # Next.js application (pages, API routes)
├── components/           # React UI components
├── scripts/gtd/          # CLI implementation
│   ├── commands/         # Individual CLI commands
│   └── lib/              # Core logic (store, types, migration)
├── lib/                  # Shared utilities (adapters, logging)
├── data/                 # JSON data storage
└── docs/                 # Documentation
```

## Related Documentation

- [High-Level Concept](./high-level-concept.md) - GTD principles and workflow design
- [Data Model](./data-model.md) - Data structures and storage
- [Technical Architecture](./technical-architecture.md) - System components and interactions
