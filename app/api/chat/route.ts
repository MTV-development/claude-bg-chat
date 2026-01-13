/**
 * Chat API Route
 *
 * Handles chat requests by forwarding them to the Mastra GTD agent
 * and streaming the response back to the client.
 *
 * Uses Mastra Memory for conversation persistence:
 * - Each conversation has a threadId
 * - Messages are stored server-side in PostgreSQL via Mastra Memory
 * - Client only needs to send the new message (not full history)
 */

import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/services/auth/get-current-user';
import { createGtdAgent } from '@/src/mastra/agents/gtd-agent';

// Allow streaming responses up to 5 minutes for complex operations
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    // Get the current authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { message, threadId: clientThreadId, messages } = await req.json();

    // Support both old format (messages array) and new format (single message + threadId)
    const userMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userMessage) {
      return new Response('No message provided', { status: 400 });
    }

    // Use provided threadId or generate a new one
    const threadId = clientThreadId || randomUUID();

    // Create agent with user-bound tools
    const agent = createGtdAgent(currentUser.userId);

    // Stream the response with Mastra Memory
    // Memory automatically handles conversation history retrieval
    const stream = await agent.stream(userMessage, {
      memory: {
        resource: currentUser.userId,
        thread: threadId,
      },
    });

    // Create encoder for streaming
    const encoder = new TextEncoder();

    // Track if we've sent the threadId header
    let headerSent = false;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send threadId as first line (JSON metadata)
          // Format: {"threadId":"xxx"}\n
          // Client can parse this to track the conversation
          const metadata = JSON.stringify({ threadId }) + '\n';
          controller.enqueue(encoder.encode(metadata));
          headerSent = true;

          // Use fullStream to handle all chunks including tool calls
          for await (const chunk of stream.fullStream) {
            // Only emit text-delta chunks to the client
            if (chunk.type === 'text-delta') {
              controller.enqueue(encoder.encode(chunk.payload.text));
            }
            // Log tool calls for debugging
            if (chunk.type === 'tool-call') {
              console.log('[Chat] Tool call:', JSON.stringify(chunk.payload));
            }
            if (chunk.type === 'tool-result') {
              console.log('[Chat] Tool result:', JSON.stringify(chunk.payload));
            }
          }
          controller.close();
        } catch (error) {
          console.error('[Chat] Stream error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          // If header not sent yet, send it first
          if (!headerSent) {
            const metadata = JSON.stringify({ threadId, error: true }) + '\n';
            controller.enqueue(encoder.encode(metadata));
          }
          controller.enqueue(encoder.encode(`\n\nError: ${errorMessage}`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(errorMessage, { status: 500 });
  }
}
