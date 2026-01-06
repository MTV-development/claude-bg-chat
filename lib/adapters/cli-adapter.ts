/**
 * CLI Adapter for Claude Code
 *
 * Uses execSync wrapped in a setTimeout to not block immediately.
 * This is a workaround for Windows where async exec has issues.
 */

import { execSync } from 'child_process';
import {
  ClaudeAdapter,
  ClaudeMessage,
  ClaudeAdapterOptions,
  ClaudeStreamEvent,
} from './types';

interface CLIStreamMessage {
  type: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
  tool?: string;
  tool_input?: unknown;
  content?: string | Array<{ type: string; text?: string }>;
}

export class CLIAdapter implements ClaudeAdapter {
  private aborted = false;

  async *chat(
    messages: ClaudeMessage[],
    options: ClaudeAdapterOptions
  ): AsyncIterable<ClaudeStreamEvent> {
    this.aborted = false;

    const prompt = this.formatPrompt(messages);

    // Build command with proper escaping for Windows
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    let cmd = `claude -p "${escapedPrompt}" --output-format stream-json --verbose`;

    if (options.claudeSessionId) {
      cmd += ` --resume "${options.claudeSessionId}"`;
    }
    if (options.allowedTools && options.allowedTools.length > 0) {
      cmd += ` --allowedTools "${options.allowedTools.join(',')}"`;
    }

    const cwd = options.workingDirectory || process.cwd();

    try {
      // Run execSync in next tick to allow event loop to process
      const stdout = await new Promise<string>((resolve, reject) => {
        setImmediate(() => {
          try {
            const result = execSync(cmd, {
              cwd,
              encoding: 'utf8',
              timeout: options.timeout || 300000,
              maxBuffer: 50 * 1024 * 1024,
            });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });

      if (!stdout) {
        yield { type: 'error', error: 'No output from Claude CLI' };
        yield { type: 'done' };
        return;
      }

      // Parse all lines and yield events
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (this.aborted) {
          yield { type: 'done' };
          return;
        }

        if (!line.trim()) continue;

        try {
          const event = this.parseStreamLine(line);
          if (event) {
            yield event;
          }
        } catch (e) {
          console.error('[CLI] Parse error:', e);
        }
      }

      yield { type: 'done' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[CLI] Error:', errorMsg);
      yield { type: 'error', error: errorMsg };
      yield { type: 'done' };
    }
  }

  abort(): void {
    this.aborted = true;
  }

  private formatPrompt(messages: ClaudeMessage[]): string {
    if (messages.length === 1) {
      return messages[0].content;
    }

    const formatted = messages.map((m) => {
      return m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`;
    });

    return `Continue this conversation. Respond only as the Assistant to the last user message.\n\n${formatted.join('\n\n')}\n\nAssistant:`;
  }

  private parseStreamLine(line: string): ClaudeStreamEvent | null {
    const data: CLIStreamMessage = JSON.parse(line);

    switch (data.type) {
      case 'system':
        if (data.subtype === 'init' && data.session_id) {
          return { type: 'session_init', claudeSessionId: data.session_id };
        }
        break;

      case 'assistant':
        if (data.message?.content) {
          const text = data.message.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text || '')
            .join('');
          if (text) return { type: 'text', content: text };
        }
        break;

      case 'tool_use':
        return { type: 'tool_use', tool: data.tool, toolInput: data.tool_input };

      case 'tool_result':
        return { type: 'tool_result', tool: data.tool, toolResult: data.content };

      case 'error':
        return { type: 'error', error: String(data.content || 'Unknown error') };

      case 'result':
        // Skip result events - the text is already captured from 'assistant' events
        // This prevents duplicate output
        break;
    }

    return null;
  }
}
