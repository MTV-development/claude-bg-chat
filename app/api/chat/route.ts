// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userPrompt = lastMessage?.content || '';

  // For Phase 2: Return a mock streaming response
  // Phase 3 will replace this with actual Claude CLI integration
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Simulate streaming response
      const mockResponse = `This is a placeholder response from the API.\n\nYou said: "${userPrompt}"\n\nIn Phase 3, this will be connected to Claude Code CLI for real responses.`;

      // Stream the response character by character for demo
      for (const char of mockResponse) {
        controller.enqueue(encoder.encode(char));
        await new Promise(resolve => setTimeout(resolve, 15));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
