import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

/**
 * Create a Memory instance for storing conversation history
 *
 * Uses PostgreSQL (Supabase) for persistent storage.
 * Each conversation is identified by:
 * - resource: userId (the user who owns the conversation)
 * - thread: threadId (unique identifier for the conversation)
 */
export function createMemory() {
  return new Memory({
    storage: new PostgresStore({
      id: 'gtd-memory',
      connectionString: process.env.DATABASE_URL!,
    }),
    options: {
      lastMessages: 20, // Keep last 20 messages in context
      generateTitle: true, // Auto-generate conversation titles
    },
  });
}
