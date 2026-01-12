/**
 * Chat API Route
 *
 * Handles chat requests by forwarding them to the Mastra GTD agent
 * and streaming the response back to the client.
 */

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

    const { messages } = await req.json();

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('No messages', { status: 400 });
    }

    // Create agent with user-bound tools
    const agent = createGtdAgent(currentUser.userId);

    // Stream the response with full conversation history
    // This allows the agent to understand context from earlier messages
    // (e.g., "I need to do something today" followed by "paint garage")
    const stream = await agent.stream(messages);

    // Create encoder for streaming
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
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
