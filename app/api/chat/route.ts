/**
 * Chat API Route
 *
 * Handles chat requests by forwarding them to Claude Code CLI
 * and streaming the response back to the client.
 *
 * Supports warm CLI via --resume to reuse Claude sessions for better performance.
 */

import { CLIAdapter } from '@/lib/adapters/cli-adapter';
import { ClaudeMessage } from '@/lib/adapters/types';
import { SessionLogger, generateSessionId } from '@/lib/services/logger';

// Session ID marker for frontend to parse
const SESSION_MARKER = '\n<!--CLAUDE_SESSION:';
const SESSION_MARKER_END = '-->';

// Allow streaming responses up to 5 minutes for complex operations
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, sessionId: existingSessionId, claudeSessionId } = await req.json();

  // Use existing session ID or generate new one
  const sessionId = existingSessionId || generateSessionId();

  // Claude's internal session ID for resumption (passed from previous response)
  let currentClaudeSessionId = claudeSessionId;

  // Initialize logger for this session
  const logger = new SessionLogger(sessionId);

  // Convert incoming messages to ClaudeMessage format
  const claudeMessages: ClaudeMessage[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Get the last user message for logging
  const lastUserMessage = claudeMessages[claudeMessages.length - 1];

  // Create encoder for streaming
  const encoder = new TextEncoder();

  // Create the CLI adapter
  const adapter = new CLIAdapter();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Log session start with resume info
        await logger.logSessionStart({
          messageCount: claudeMessages.length,
          resumingSession: !!claudeSessionId,
        });

        // Log the user message
        if (lastUserMessage) {
          await logger.logUser(lastUserMessage.content);
        }

        let fullResponse = '';

        // Stream events from Claude
        for await (const event of adapter.chat(claudeMessages, {
          sessionId,
          workingDirectory: process.cwd(),
          allowedTools: ['Read', 'Write', 'Skill', 'Glob', 'Grep'],
          claudeSessionId: currentClaudeSessionId,
        })) {
          switch (event.type) {
            case 'session_init':
              // Capture Claude's session ID for future resumption
              if (event.claudeSessionId) {
                currentClaudeSessionId = event.claudeSessionId;
              }
              break;

            case 'text':
              if (event.content) {
                fullResponse += event.content;
                controller.enqueue(encoder.encode(event.content));
              }
              break;

            case 'tool_use':
              await logger.logToolUse(event.tool || 'unknown', event.toolInput);
              break;

            case 'tool_result':
              await logger.logToolResult(event.tool || 'unknown', event.toolResult);
              break;

            case 'error':
              await logger.logError(event.error || 'Unknown error');
              // Send error to client
              controller.enqueue(encoder.encode(`\n\nError: ${event.error}`));
              break;

            case 'done':
              // Log the full assistant response
              if (fullResponse) {
                await logger.logAssistant(fullResponse);
              }
              break;
          }
        }

        // Send Claude session ID at end of stream for frontend to capture
        // This enables warm CLI - subsequent requests can resume this session
        if (currentClaudeSessionId) {
          const sessionData = JSON.stringify({ claudeSessionId: currentClaudeSessionId });
          controller.enqueue(encoder.encode(`${SESSION_MARKER}${sessionData}${SESSION_MARKER_END}`));
        }

        // Log session end
        await logger.logSessionEnd({
          responseLength: fullResponse.length,
          claudeSessionId: currentClaudeSessionId,
        });

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logger.logError(errorMessage);

        controller.enqueue(encoder.encode(`\n\nError: ${errorMessage}`));
        controller.close();
      }
    },

    cancel() {
      // Abort the adapter if the client disconnects
      adapter.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Session-Id': sessionId,
    },
  });
}
