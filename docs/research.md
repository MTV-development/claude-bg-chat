# Research: Claude Code Web Chat Interface

## Executive Summary

Building a web chat interface for Claude Code is well-supported through two official approaches:
1. **Claude Agent SDK** (recommended) - Native TypeScript/Python SDK for programmatic access
2. **CLI Headless Mode** - Non-interactive CLI with JSON streaming output

For the frontend, **Vercel AI SDK** provides battle-tested React hooks and patterns for chat interfaces.

---

## 1. Claude Code Programmatic Access

### Option A: Claude Agent SDK (Recommended)

The official SDK provides native programmatic access to Claude Code's capabilities.

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**Key Features:**
- Full streaming support with partial messages
- Native session management (maintains conversation context)
- All built-in tools available (Read, Write, Edit, Bash, Glob, Grep, etc.)
- Hook system for custom behavior/permissions
- Structured JSON outputs with schema validation

**Basic Usage (TypeScript):**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// One-off query
for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) {
  console.log(message);
}
```

**Session Management:**
```typescript
let sessionId: string;

// First query - capture session ID
for await (const msg of query({ prompt: "Read the auth module" })) {
  if (msg.type === 'system' && msg.subtype === 'init') {
    sessionId = msg.session_id;
  }
}

// Continue conversation with context
for await (const msg of query({
  prompt: "Now find all callers",
  options: { resume: sessionId }
})) {
  console.log(msg);
}
```

**Available Message Types:**
- `system` - Init messages with session_id, completion stats
- `assistant` - Claude's text responses
- `tool_use` - Tool invocations (file reads, commands, etc.)
- `tool_result` - Results from tool execution
- `user` - User messages (for context)

### Option B: CLI Headless Mode

For simpler integrations, Claude Code CLI can run non-interactively.

**Basic Usage:**
```bash
claude -p "your prompt here"
```

**Key Flags:**
| Flag | Purpose |
|------|---------|
| `-p, --print` | Non-interactive mode |
| `--output-format json` | Structured JSON output |
| `--output-format stream-json` | Streaming newline-delimited JSON |
| `--resume SESSION_ID` | Continue specific session |
| `--continue` | Continue most recent session |
| `--allowedTools` | Auto-approve specific tools |
| `--max-turns` | Limit agentic turns |

**Streaming JSON Example:**
```bash
claude -p "Analyze the codebase" --output-format stream-json
```

Output format (newline-delimited):
```json
{"type":"system","subtype":"init","session_id":"abc123",...}
{"type":"assistant","message":"I'll analyze the codebase..."}
{"type":"tool_use","tool":"Glob","input":{...}}
{"type":"tool_result","output":"..."}
{"type":"assistant","message":"Here's what I found..."}
{"type":"system","subtype":"result","duration_ms":5432,...}
```

### Comparison: SDK vs CLI

| Aspect | Agent SDK | CLI Headless |
|--------|-----------|--------------|
| Setup Complexity | Higher (npm package) | Lower (already installed) |
| Streaming | Native async iterators | Parse newline JSON |
| Session Management | Built-in objects | Via --resume flag |
| Custom Hooks | Full support | Not supported |
| Error Handling | Native exceptions | Exit codes + stderr |
| **Local Skills** | Requires explicit config | Works by default |
| **Local Files** | Full access | Full access |
| Best For | Production apps | Scripts, quick integrations |

### Critical: Local Skills & File Access

Both approaches support local skills and file access, but with important differences:

#### CLI Headless Mode (Skills work by default)
```bash
# Skills auto-discovered from .claude/skills/ - no config needed
claude -p "Use my custom skill" --allowedTools "Read,Edit,Bash,Skill"
```
- Skills from `~/.claude/skills/` (personal) and `.claude/skills/` (project) load automatically
- File tools (Read, Write, Edit, Glob, Grep) available by default
- **Best for your use case** - zero configuration for skills

#### Agent SDK (Requires explicit configuration)
```typescript
// MUST set settingSources to load skills from filesystem
const options = {
  settingSources: ["user", "project"],  // Required for skills!
  allowedTools: ["Skill", "Read", "Edit", "Bash"]
};

for await (const msg of query({ prompt: "...", options })) { ... }
```
- By default, SDK runs in isolation (no filesystem settings)
- Must explicitly set `settingSources: ["user", "project"]` to load skills
- Once configured, full skill and file access available

**Recommendation:** Given your use case (skills + local files), CLI Headless Mode may be simpler since skills work out of the box. However, if you want cleaner TypeScript integration, the SDK works too with proper configuration.

---

## 2. Frontend: Vercel AI SDK

### Overview

Vercel AI SDK provides React hooks for building chat interfaces with streaming support.

**Installation:**
```bash
npm install ai @ai-sdk/react
```

### Core Hook: useChat

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',  // Custom API endpoint
  });

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'You: ' : 'AI: '}
          {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### Key useChat Features

- **Automatic streaming** - Displays responses as they arrive
- **Message history** - Manages conversation state
- **Loading states** - `isLoading` for UI feedback
- **Error handling** - Built-in error state management
- **Custom API endpoint** - Point to any backend

### Custom API Integration

Since we're not using a standard AI provider, we need a custom API route that bridges to Claude Code:

```typescript
// app/api/chat/route.ts
export async function POST(request: Request) {
  const { messages } = await request.json();

  // Bridge to Claude Code here
  // Return streaming response

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

---

## 3. Architecture Design

### Decision: CLI Mode with Adapter Pattern

**Why CLI over SDK:**
- CLI uses Claude Code subscription (no extra API costs)
- SDK requires separate API key with pay-per-token billing
- CLI has automatic skill discovery
- Same capabilities, just different integration approach

**Why Adapter Pattern:**
- Swap implementations without changing app code
- Could add SDK adapter later if billing model changes
- Clean separation of concerns
- Easier testing with mock adapters

### Architecture with Adapter Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                                                              │
│   Next.js + Vercel AI SDK (useChat)                        │
│   - Chat UI components                                       │
│   - Message rendering                                        │
│   - Input handling                                           │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Route Layer                          │
│                                                              │
│   /api/chat                                                  │
│   - Receives messages from frontend                          │
│   - Delegates to ClaudeAdapter                              │
│   - Streams responses back via SSE                          │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   ClaudeAdapter Interface                    │
│                                                              │
│   interface ClaudeAdapter {                                  │
│     query(prompt, options): AsyncIterable<ClaudeMessage>    │
│     resumeSession(sessionId, prompt): AsyncIterable<...>    │
│   }                                                          │
│                                                              │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                    │
│   ┌─────────────────────▼─────────────────────┐             │
│   │         CLIAdapter (current)              │             │
│   │                                           │             │
│   │  - Spawns `claude -p` process            │             │
│   │  - Parses stream-json output             │             │
│   │  - Uses subscription billing             │             │
│   │  - Auto-loads local skills               │             │
│   └───────────────────────────────────────────┘             │
│                                                              │
│   ┌───────────────────────────────────────────┐             │
│   │         SDKAdapter (future)               │             │
│   │                                           │             │
│   │  - Uses @anthropic-ai/claude-agent-sdk   │             │
│   │  - Native async iterators                │             │
│   │  - Requires API key                      │             │
│   └───────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Logging Service                          │
│                                                              │
│   - Writes all messages to session log files                │
│   - Tool use, results, errors captured                      │
│   - logs/session-{id}-{date}.jsonl                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Adapter Interface Design

```typescript
// types/claude-adapter.ts

/** Message types from Claude Code */
type ClaudeMessageType =
  | 'system'      // Init, completion stats
  | 'assistant'   // Claude's text responses
  | 'user'        // User messages (echo)
  | 'tool_use'    // Tool invocation
  | 'tool_result' // Tool output

interface ClaudeMessage {
  type: ClaudeMessageType;
  subtype?: string;           // e.g., 'init', 'result' for system messages
  session_id?: string;        // Present in init messages
  message?: string;           // Text content
  tool?: string;              // Tool name (for tool_use)
  input?: Record<string, any>;// Tool input (for tool_use)
  output?: string;            // Tool output (for tool_result)
  duration_ms?: number;       // Present in result messages
  cost_usd?: number;          // Present in result messages
}

interface QueryOptions {
  cwd?: string;               // Working directory
  allowedTools?: string[];    // Auto-approved tools
  maxTurns?: number;          // Limit agentic loops
}

interface ClaudeAdapter {
  /** Start a new query, returns async stream of messages */
  query(prompt: string, options?: QueryOptions): AsyncIterable<ClaudeMessage>;

  /** Resume an existing session */
  resumeSession(sessionId: string, prompt: string, options?: QueryOptions): AsyncIterable<ClaudeMessage>;

  /** Abort a running query */
  abort(): void;
}
```

### CLI Adapter Implementation

```typescript
// adapters/cli-adapter.ts

import { spawn, ChildProcess } from 'child_process';

export class CLIAdapter implements ClaudeAdapter {
  private process: ChildProcess | null = null;

  async *query(prompt: string, options?: QueryOptions): AsyncIterable<ClaudeMessage> {
    const args = this.buildArgs(prompt, options);
    yield* this.executeAndStream(args);
  }

  async *resumeSession(sessionId: string, prompt: string, options?: QueryOptions): AsyncIterable<ClaudeMessage> {
    const args = this.buildArgs(prompt, options, sessionId);
    yield* this.executeAndStream(args);
  }

  abort(): void {
    this.process?.kill('SIGTERM');
    this.process = null;
  }

  private buildArgs(prompt: string, options?: QueryOptions, resumeId?: string): string[] {
    const args = ['-p', prompt, '--output-format', 'stream-json'];

    if (resumeId) {
      args.push('--resume', resumeId);
    }
    if (options?.allowedTools?.length) {
      args.push('--allowedTools', options.allowedTools.join(','));
    }
    if (options?.maxTurns) {
      args.push('--max-turns', String(options.maxTurns));
    }

    return args;
  }

  private async *executeAndStream(args: string[]): AsyncIterable<ClaudeMessage> {
    this.process = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let buffer = '';

    for await (const chunk of this.process.stdout!) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as ClaudeMessage;
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as ClaudeMessage;
      } catch (e) {}
    }
  }
}
```

### Session & Logging Strategy

**Session Management:**
- Capture `session_id` from first `system` message (subtype: 'init')
- Store mapping: `chatId -> claudeSessionId` (in-memory or file)
- Use `resumeSession()` for follow-up messages in same chat

**Logging Service:**
```typescript
// services/logger.ts

interface LogEntry {
  timestamp: string;
  sessionId: string;
  type: ClaudeMessageType;
  subtype?: string;
  content: any;
}

class SessionLogger {
  private logDir = './logs';

  async log(sessionId: string, message: ClaudeMessage): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      type: message.type,
      subtype: message.subtype,
      content: message
    };

    const filename = `session-${sessionId}.jsonl`;
    await fs.appendFile(
      path.join(this.logDir, filename),
      JSON.stringify(entry) + '\n'
    );
  }
}
```

**Log Contents:**
- Full message history
- All tool invocations with inputs
- Tool results (file contents, command outputs)
- Errors and exceptions
- Timestamps for each operation

---

## 4. Implementation Considerations

### Streaming Bridge Challenge

The main technical challenge is bridging two streaming systems:
1. Claude Agent SDK streams messages via async iterators
2. Vercel AI SDK expects Server-Sent Events (SSE) or similar

**Solution:** Transform Claude SDK messages into Vercel AI SDK's expected format:

```typescript
// Pseudo-code for the bridge
async function* bridgeToVercel(claudeStream) {
  for await (const msg of claudeStream) {
    if (msg.type === 'assistant') {
      // Transform to Vercel AI format
      yield formatForVercel(msg);
    }
    // Log all messages to file
    await appendToLog(msg);
  }
}
```

### Response Filtering

Since UI should only show responses (not tool use):
- Filter out `tool_use` and `tool_result` messages from UI stream
- Still log them to the session log file
- Only forward `assistant` text messages to frontend

### Error Handling

- Claude Code may fail (network, permissions, etc.)
- Need graceful degradation in UI
- Log errors to session file for debugging

### Security Considerations

- Runs locally, so authentication less critical
- Still consider: what if someone accesses localhost?
- Claude Code already has its own permission system for dangerous operations

---

## 5. Alternative Approaches Considered

### A. Direct CLI Spawning (Node.js child_process)

```typescript
import { spawn } from 'child_process';

const claude = spawn('claude', ['-p', prompt, '--output-format', 'stream-json']);
claude.stdout.on('data', (data) => { /* parse JSON lines */ });
```

**Pros:** Simple, no SDK dependency
**Cons:** Less control, harder session management, parsing overhead

### B. Using Claude API Directly (Anthropic SDK)

Could bypass Claude Code entirely and use the raw Claude API.

**Pros:** More direct, well-documented
**Cons:** Loses Claude Code's tooling (file access, bash, etc.), need API key instead of subscription

### C. WebSocket Instead of SSE

Could use WebSocket for bidirectional communication.

**Pros:** True bidirectional, better for long-running ops
**Cons:** More complex setup, useChat expects SSE pattern

---

## 6. Open Items & Questions

1. **Agent SDK Availability** - Need to verify `@anthropic-ai/claude-agent-sdk` is publicly available and works with Claude Code subscription
2. **Rate Limiting** - Does Claude Code have rate limits we need to handle?
3. **Concurrent Sessions** - Can multiple chat sessions run simultaneously?
4. **Log Rotation** - How to handle log file growth over time?
5. **Session Persistence** - Store session IDs across server restarts?

---

## 7. Next Steps

1. **Verify Agent SDK** - Install and test basic integration
2. **Prototype API Route** - Build minimal bridge between useChat and Claude SDK
3. **Implement Logging** - Set up session log file writing
4. **Build UI** - Create chat interface with Vercel AI SDK
5. **Test End-to-End** - Full flow from input to streamed response

---

## References

- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless.md)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Vercel AI SDK useChat Hook](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
