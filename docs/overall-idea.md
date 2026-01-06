# Claude Code Web Chat Interface

## Overview

Build a local web-based chat interface that uses Claude Code CLI as the underlying engine. This provides a modern chat UI while leveraging Claude Code's full capabilities including local file access, code execution, and custom skills.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Claude Integration | CLI Headless Mode | Uses subscription (no API costs), auto-loads skills |
| Architecture | Adapter Pattern | Swap CLI/SDK implementations later |
| Frontend | Vercel AI SDK + Next.js | Battle-tested chat hooks, streaming support |
| UI Display | Responses only | Clean UI, details in log files |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development Machine                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Next.js App                        │   │
│  │                                                       │   │
│  │   ┌─────────────┐    ┌─────────────────────────┐     │   │
│  │   │  Chat UI    │───►│  /api/chat route        │     │   │
│  │   │  (useChat)  │◄───│  (SSE streaming)        │     │   │
│  │   └─────────────┘    └───────────┬─────────────┘     │   │
│  │                                  │                    │   │
│  │                      ┌───────────▼─────────────┐     │   │
│  │                      │   ClaudeAdapter         │     │   │
│  │                      │   (interface)           │     │   │
│  │                      └───────────┬─────────────┘     │   │
│  │                                  │                    │   │
│  │                      ┌───────────▼─────────────┐     │   │
│  │                      │   CLIAdapter            │     │   │
│  │                      │   (spawns claude -p)    │     │   │
│  │                      └───────────┬─────────────┘     │   │
│  │                                  │                    │   │
│  └──────────────────────────────────┼────────────────────┘   │
│                                     │                        │
│                      ┌──────────────▼──────────────┐        │
│                      │     Claude Code CLI         │        │
│                      │                             │        │
│                      │  - Uses subscription        │        │
│                      │  - Local file access        │        │
│                      │  - Custom skills (.claude/) │        │
│                      │  - Code execution           │        │
│                      └──────────────┬──────────────┘        │
│                                     │                        │
│                      ┌──────────────▼──────────────┐        │
│                      │     Local Files & Skills    │        │
│                      │                             │        │
│                      │  ~/.claude/skills/          │        │
│                      │  .claude/skills/            │        │
│                      │  Project files              │        │
│                      └─────────────────────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Logging Service                    │   │
│  │                                                       │   │
│  │   logs/session-{id}.jsonl                            │   │
│  │   - All tool use captured                            │   │
│  │   - Full command outputs                             │   │
│  │   - Timestamps & details                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  localhost:3000                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (Next.js + Vercel AI SDK)
- Chat interface using `useChat` hook
- Real-time streaming display
- Message history management
- Clean UI showing only Claude's responses

### 2. API Route (/api/chat)
- Receives messages from useChat
- Delegates to ClaudeAdapter
- Transforms responses to SSE format
- Triggers logging for all messages

### 3. ClaudeAdapter (Interface)
- Abstract interface for Claude Code integration
- Allows swapping implementations (CLI now, SDK later)
- Methods: `query()`, `resumeSession()`, `abort()`

### 4. CLIAdapter (Implementation)
- Spawns `claude -p` with `--output-format stream-json`
- Parses newline-delimited JSON output
- Handles session resume via `--resume` flag
- Auto-discovers local skills

### 5. Logging Service
- Writes all messages to session log files
- JSONL format for easy parsing
- Captures tool use, results, errors

## Key Features

- **Subscription-based**: Uses Claude Code subscription (no API token costs)
- **Local Skills**: Automatically loads skills from `.claude/skills/`
- **File Access**: Full read/write to local files
- **Session Continuity**: Maintains context across messages
- **Detailed Logging**: All operations logged for inspection
- **Adapter Pattern**: Swap CLI/SDK without app changes

## User Flow

1. User opens `localhost:3000`
2. Types message in chat input
3. useChat sends to `/api/chat`
4. API route calls `adapter.query(prompt)`
5. CLIAdapter spawns `claude -p "prompt" --output-format stream-json`
6. Claude Code executes (may access files, run code, use skills)
7. JSON messages streamed back, logged to file
8. Assistant messages transformed to SSE, sent to frontend
9. Chat UI displays response in real-time

## File Structure (Planned)

```
claude-bg-chat/
├── app/
│   ├── page.tsx              # Chat UI
│   └── api/
│       └── chat/
│           └── route.ts      # API endpoint
├── lib/
│   ├── adapters/
│   │   ├── types.ts          # ClaudeAdapter interface
│   │   └── cli-adapter.ts    # CLI implementation
│   └── services/
│       └── logger.ts         # Session logging
├── logs/                     # Session log files
├── docs/
│   ├── overall-idea.md       # This file
│   └── research.md           # Technical research
└── package.json
```

## Next Steps

1. Initialize Next.js project with Vercel AI SDK
2. Implement ClaudeAdapter interface and CLIAdapter
3. Create /api/chat route with SSE streaming
4. Build chat UI with useChat hook
5. Add logging service
6. Test end-to-end flow
