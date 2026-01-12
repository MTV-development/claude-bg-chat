/**
 * Session Logger
 *
 * Logs all chat activity to JSONL files for debugging and audit.
 * Each session gets its own log file: logs/session-{id}-{timestamp}.jsonl
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Session log entry type for JSONL logging
 */
export interface SessionLogEntry {
  ts: string;
  sessionId: string;
  type:
    | 'session_start'
    | 'session_end'
    | 'user'
    | 'assistant'
    | 'tool_use'
    | 'tool_result'
    | 'error';
  content?: string;
  tool?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class SessionLogger {
  private sessionId: string;
  private logPath: string;
  private initialized = false;

  constructor(sessionId: string, logsDir = 'logs') {
    this.sessionId = sessionId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `session-${sessionId}-${timestamp}.jsonl`;
    this.logPath = path.join(process.cwd(), logsDir, filename);
  }

  /**
   * Initialize the logger - creates logs directory if needed
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const logsDir = path.dirname(this.logPath);
    await fs.mkdir(logsDir, { recursive: true });
    this.initialized = true;
  }

  /**
   * Write an entry to the log file
   */
  private async writeEntry(entry: SessionLogEntry): Promise<void> {
    await this.ensureInitialized();
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.logPath, line, 'utf-8');
  }

  /**
   * Log session start
   */
  async logSessionStart(metadata?: Record<string, unknown>): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'session_start',
      metadata,
    });
  }

  /**
   * Log session end
   */
  async logSessionEnd(metadata?: Record<string, unknown>): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'session_end',
      metadata,
    });
  }

  /**
   * Log user message
   */
  async logUser(content: string): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'user',
      content,
    });
  }

  /**
   * Log assistant message (text response)
   */
  async logAssistant(content: string): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'assistant',
      content,
    });
  }

  /**
   * Log tool use
   */
  async logToolUse(tool: string, toolInput: unknown): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'tool_use',
      tool,
      toolInput,
    });
  }

  /**
   * Log tool result
   */
  async logToolResult(tool: string, toolResult: unknown): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'tool_result',
      tool,
      toolResult,
    });
  }

  /**
   * Log error
   */
  async logError(error: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.writeEntry({
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'error',
      error,
      metadata,
    });
  }

  /**
   * Get the path to the log file
   */
  getLogPath(): string {
    return this.logPath;
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
