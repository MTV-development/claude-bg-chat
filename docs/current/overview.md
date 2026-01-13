# GTD Todo Manager - Overview

> **Living Document**: This documentation reflects the current state of the codebase and is updated as the prototype evolves.

## What Is This Project?

The GTD Todo Manager is a full-stack task management application that implements Getting Things Done (GTD) principles through a conversational AI interface. Users interact with an AI agent to capture, clarify, and manage their tasks, while a reactive web UI provides visual organization and quick actions.

## Evolution

This project has evolved through several iterations:

1. **Simple Todo List**: Basic task capture and completion
2. **GTD Enhancement**: Added GTD workflow concepts (Inbox, clarification, next actions)
3. **Supabase Migration**: Moved from JSON file storage to PostgreSQL with real-time sync
4. **Mastra Migration**: Replaced Claude CLI integration with Mastra AI agent framework

## Key Capabilities

### Conversational Task Management
- Chat with an AI agent to add, clarify, and manage tasks
- Natural language input for task capture
- AI-assisted clarification of vague tasks into actionable next steps
- Agent follows GTD behavioral guidelines
- Conversation history persisted in PostgreSQL via Mastra Memory

### GTD Tab System
| Tab | Purpose |
|-----|---------|
| **Focus** | Tasks with deadlines on or past due |
| **Optional** | Tasks that can be done anytime |
| **Later** | Tasks with future deadlines |
| **Inbox** | New captures needing clarification (use Clarify to process) |
| **Projects** | Grouped view of multi-task initiatives |
| **Done** | Completed tasks with undo capability |

### Smart Features
- **Postpone Tracking**: Warns when tasks are repeatedly postponed (3+ times)
- **Real-time Sync**: UI stays synchronized via Supabase Realtime
- **Bulk Actions**: Select and complete/uncomplete multiple tasks
- **Flexible Matching**: Find tasks by ID, title, or partial match

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **State**: Zustand with Supabase Realtime sync
- **Backend**: Next.js API Routes
- **AI Agent**: Mastra v1 framework with GPT-4o-mini via OpenRouter
- **AI Memory**: Mastra Memory with PostgresStore for conversation persistence
- **Database**: Supabase PostgreSQL
- **ORM**: Drizzle

## Project Structure

```
claude-bg-chat/
├── app/                  # Next.js application (pages, API routes)
├── components/           # React UI components
├── src/mastra/           # Mastra AI agent
│   ├── memory.ts         # Memory configuration (PostgresStore)
│   ├── agents/           # Agent definitions (with memory integration)
│   └── tools/            # Agent tool factories
├── lib/
│   ├── services/         # Business logic layer
│   ├── stores/           # Zustand state management
│   ├── supabase/         # Supabase client config
│   └── utils/            # Utilities (date parser)
├── db/                   # Drizzle schema and config
└── docs/                 # Documentation
```

## Related Documentation

- [High-Level Concept](./high-level-concept.md) - GTD principles and workflow design
- [Data Model](./data-model.md) - Data structures and storage
- [Technical Architecture](./technical-architecture.md) - System components and interactions
- [Environment Validation](./environment-validation.md) - Testing and environment health checks
- [E2E Testing](./e2e-testing.md) - Playwright E2E testing playbook and auth bypass setup
