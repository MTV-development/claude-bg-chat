'use client';

import { useState, useRef, useEffect } from 'react';
import TodoList from '@/components/TodoList';
import ThemeToggle from '@/components/ThemeToggle';

// Session marker format from API
const SESSION_MARKER = '\n<!--CLAUDE_SESSION:';
const SESSION_MARKER_END = '-->';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Strip system reminders and other internal tags from message content
 */
function stripInternalContent(text: string): string {
  // Remove <system-reminder>...</system-reminder> blocks
  let cleaned = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Remove any other internal tags that shouldn't be displayed
  cleaned = cleaned.replace(/<internal>[\s\S]*?<\/internal>/g, '');

  // Trim extra whitespace that may result from removals
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Extract Claude session ID from response text and return clean text
 */
function extractSessionId(text: string): { cleanText: string; sessionId: string | null } {
  const markerStart = text.lastIndexOf(SESSION_MARKER);
  if (markerStart === -1) {
    return { cleanText: text, sessionId: null };
  }

  const markerEnd = text.indexOf(SESSION_MARKER_END, markerStart);
  if (markerEnd === -1) {
    return { cleanText: text, sessionId: null };
  }

  const jsonStart = markerStart + SESSION_MARKER.length;
  const jsonStr = text.substring(jsonStart, markerEnd);

  try {
    const data = JSON.parse(jsonStr);
    const cleanText = text.substring(0, markerStart);
    return { cleanText, sessionId: data.claudeSessionId || null };
  } catch {
    return { cleanText: text, sessionId: null };
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(false);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          allowedTools: ['Read', 'Write', 'Skill'],
          claudeSessionId: claudeSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Mark as streaming once we receive first chunk
        if (!isStreaming) setIsStreaming(true);

        // Update display (may include session marker temporarily)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: fullText }
              : m
          )
        );
      }

      // Extract session ID and clean the text
      const { cleanText, sessionId } = extractSessionId(fullText);

      // Update with clean text (without session marker)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: cleanText }
            : m
        )
      );

      // Store session ID for future requests (warm CLI)
      if (sessionId) {
        setClaudeSessionId(sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      // Focus input after response completes (small delay for DOM update)
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        // Remove the last assistant message if it exists and was empty/error
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
            newMessages.pop();
          }
          return newMessages;
        });
        setInput(lastUserMessage.content);
        setError(null);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleNewChat = () => {
    setMessages([]);
    setClaudeSessionId(null);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleExampleClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleClarifyRequest = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-theme-bg-secondary">
      {/* Left Panel - Chat */}
      <div className="flex-1 flex flex-col border-r border-theme-border-primary">
        {/* Header */}
        <header className="bg-theme-bg-primary border-b border-theme-border-primary px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-theme-text-primary">Claude Chat</h1>
            <p className="text-sm text-theme-text-secondary">
              Chat interface for Claude Code
              {claudeSessionId && (
                <span className="ml-2 text-theme-success" title="Session active - faster responses">
                  (warm session)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleNewChat}
              className="text-sm px-3 py-1 border border-theme-border-secondary rounded hover:bg-theme-bg-hover transition-colors text-theme-text-primary"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-theme-text-tertiary mt-8">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm mb-6">Start a conversation or try an example:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Show my todos', 'Add task: buy groceries', 'What can you help me with?'].map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="text-sm px-3 py-1.5 bg-theme-bg-primary border border-theme-border-secondary rounded-full hover:bg-theme-bg-hover hover:border-theme-border-secondary transition-colors text-theme-text-secondary"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-theme-accent-primary text-theme-text-inverse'
                  : 'bg-theme-bg-primary border border-theme-border-primary text-theme-text-primary'
              }`}
            >
              <div className="text-xs font-medium mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'Claude'}
              </div>
              <div className="whitespace-pre-wrap">
                {stripInternalContent(message.content)}
                {/* Show blinking cursor while streaming this message */}
                {isStreaming && message.role === 'assistant' && messages[messages.length - 1]?.id === message.id && (
                  <span className="inline-block w-2 h-4 bg-theme-text-tertiary ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator - only show when waiting for first chunk */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start">
            <div className="bg-theme-bg-primary border border-theme-border-primary rounded-lg px-4 py-2">
              <div className="text-xs font-medium mb-1 text-theme-text-secondary">Claude</div>
              <div className="flex items-center space-x-2 text-theme-text-secondary">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display with retry */}
        {error && (
          <div className="bg-theme-error-bg border border-theme-error rounded-lg px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-theme-error font-medium">Something went wrong</p>
                <p className="text-theme-error text-sm mt-1 opacity-80">{error.message}</p>
              </div>
              <button
                onClick={handleRetry}
                className="text-sm px-3 py-1 bg-theme-error-bg text-theme-error rounded hover:opacity-80 transition-colors border border-theme-error"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

        {/* Input Form */}
        <div className="border-t border-theme-border-primary bg-theme-bg-primary p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? 'Waiting for response...' : 'Type your message...'}
              className="flex-1 border border-theme-border-secondary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-theme-accent-primary focus:border-transparent disabled:bg-theme-bg-secondary bg-theme-bg-primary text-theme-text-primary placeholder:text-theme-text-tertiary"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-theme-accent-primary text-theme-text-inverse px-6 py-2 rounded-lg hover:bg-theme-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Todo List */}
      <div className="flex-1 bg-theme-bg-secondary">
        <TodoList onClarifyRequest={handleClarifyRequest} />
      </div>
    </div>
  );
}
