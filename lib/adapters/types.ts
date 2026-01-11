/**
 * ClaudeAdapter Interface
 *
 * Defines the contract for Claude backends (CLI or SDK).
 * Allows swapping implementations without changing the chat API.
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeStreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'done' | 'session_init';
  content?: string;
  tool?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  error?: string;
  claudeSessionId?: string; // Claude's internal session ID for resumption
}

export interface ClaudeAdapterOptions {
  sessionId: string;
  workingDirectory?: string;
  allowedTools?: string[];
  timeout?: number;
  claudeSessionId?: string; // Claude's session ID to resume (from previous session_init event)
  env?: Record<string, string>; // Additional environment variables to pass to the CLI
}

export interface ClaudeAdapter {
  /**
   * Send messages to Claude and get a streaming response
   * @param messages - Conversation history
   * @param options - Session options
   * @returns AsyncIterable of stream events
   */
  chat(
    messages: ClaudeMessage[],
    options: ClaudeAdapterOptions
  ): AsyncIterable<ClaudeStreamEvent>;

  /**
   * Abort the current request
   */
  abort(): void;
}

/**
 * Session log entry types for JSONL logging
 */
export interface SessionLogEntry {
  ts: string;
  sessionId: string;
  type: 'session_start' | 'session_end' | 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'error';
  content?: string;
  tool?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}
