# Claude Code - Coding Assistant

You are a coding assistant helping develop the GTD Todo Manager application.

## Project Overview

This is a full-stack GTD (Getting Things Done) todo manager with:
- **Next.js 15** with App Router
- **Mastra** for AI agent (GTD assistant)
- **Zustand** for reactive state management
- **Supabase** for database + Realtime sync
- **Playwright** for E2E testing

## Architecture

The application uses a Mastra AI agent to handle chat interactions:

```
src/mastra/
├── index.ts           # Mastra singleton
├── agents/
│   └── gtd-agent.ts   # GTD agent with tools
└── tools/             # 9 GTD tools (add, list, complete, etc.)
```

The agent tools call service layer functions in `lib/services/` which interact with Supabase.

## Key Documentation

- `docs/current/overview.md` - Project overview
- `docs/current/technical-architecture.md` - System architecture
- `docs/current/e2e-testing.md` - E2E testing playbook

## Development Practices

- Use standard Claude Code tools (TodoWrite, beads, etc.)
- Run `npm run build` and `npx tsc --noEmit` to verify changes
- Unit tests: `npm test`
- E2E tests: `npx playwright test`
