'use client';

import { useState, useRef, useEffect } from 'react';

// Session marker format from API
const SESSION_MARKER = '\n<!--CLAUDE_SESSION:';
const SESSION_MARKER_END = '-->';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
          // Send Claude session ID for warm CLI (session resumption)
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
      // Focus input after response completes (small delay for DOM update)
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleNewChat = () => {
    setMessages([]);
    setClaudeSessionId(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Claude Chat</h1>
          <p className="text-sm text-gray-500">
            Chat interface for Claude Code
            {claudeSessionId && (
              <span className="ml-2 text-green-600" title="Session active - faster responses">
                (warm session)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleNewChat}
          className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          New Chat
        </button>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start a conversation by typing below</p>
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="text-xs font-medium mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'Claude'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="text-xs font-medium mb-1 text-gray-500">Claude</div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700">
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
