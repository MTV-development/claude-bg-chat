# GTD Todo Manager

A full-stack task management application implementing Getting Things Done (GTD) principles through a conversational AI interface. Chat with Claude to capture, clarify, and manage tasks while a reactive web UI provides visual organization.

## Features

- **Conversational Task Management** - Natural language input via Claude
- **GTD Tab System** - Today, Optional, Inbox, Projects, and Done views
- **AI-Assisted Clarification** - Transform vague tasks into actionable next steps
- **Postpone Tracking** - Warnings when tasks are repeatedly postponed
- **Bulk Actions** - Select and manage multiple tasks at once
- **Warm Sessions** - Faster Claude responses through session reuse

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **CLI**: Standalone TypeScript CLI for programmatic access
- **Storage**: JSON file-based persistence
- **AI**: Claude integration via CLI adapter

## Prerequisites

- Node.js 18+
- npm
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run gtd` | Run CLI (after build) |
| `npm run gtd:dev` | Run CLI in development mode |

## Project Structure

```
claude-bg-chat/
├── app/                  # Next.js application
│   ├── api/              # API routes
│   │   ├── chat/         # Chat endpoint (Claude integration)
│   │   └── todos/        # Todo CRUD operations
│   └── page.tsx          # Main page
├── components/           # React UI components
│   ├── TodoList.tsx      # Main todo list with GTD tabs
│   ├── AddItemModal.tsx  # Task creation modal
│   └── ...
├── scripts/gtd/          # CLI implementation
│   ├── commands/         # CLI command handlers
│   └── lib/              # Core logic (store, types)
├── lib/                  # Shared utilities
│   ├── adapters/         # Claude adapter (CLI/SDK)
│   └── services/         # Logging services
├── data/                 # JSON data storage
│   └── todos.json        # Task data
├── logs/                 # Session logs (JSONL)
└── docs/                 # Documentation
    └── current/          # Living documentation
```

## GTD Tab System

| Tab | Purpose |
|-----|---------|
| **Today** | Tasks with clarified next actions due today or overdue |
| **Optional** | Clarified tasks without urgent due dates |
| **Inbox** | New captures needing clarification |
| **Projects** | Grouped view of multi-task initiatives |
| **Done** | Completed tasks with undo capability |

## CLI Usage

The CLI provides programmatic access to todo management:

```bash
# Development mode (uses tsx)
npm run gtd:dev -- list
npm run gtd:dev -- add "Buy groceries"
npm run gtd:dev -- complete <task-id>

# Production mode (requires build)
npm run gtd -- list
```

## Documentation

Detailed documentation is available in `docs/current/`:

- [Overview](docs/current/overview.md) - Project introduction and evolution
- [High-Level Concept](docs/current/high-level-concept.md) - GTD principles and workflow
- [Data Model](docs/current/data-model.md) - Data structures and storage schema
- [Technical Architecture](docs/current/technical-architecture.md) - System components and interactions

## License

Private project.
