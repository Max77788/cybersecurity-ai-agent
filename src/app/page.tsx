// app/page.tsx
'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Append user message to chat history
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call our chat API endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.content }),
      });

      const data = await res.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || 'No response generated.',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error: Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat messages area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 flex items-center ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Profile Icon for Assistant (Left Side) */}
            {msg.role !== 'user' && (
              <img
                src="/assistant-avatar.png"
                alt="Assistant"
                className="w-8 h-8 rounded-full mr-2"
              />
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-xs px-4 py-2 rounded-full ${msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-900'
                }`}
            >
              {msg.content}
            </div>

            {/* Profile Icon for User (Right Side) */}
            {msg.role === 'user' && (
              <img
                src="/user-avatar.jpg"
                alt="User"
                className="w-8 h-8 rounded-full ml-2"
              />
            )}
          </div>
        ))}
        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-xs px-4 py-2 rounded-lg bg-gray-300 text-gray-900">
              Loading...
            </div>
          </div>
        )}
        {/* Dummy div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form (pill) at the bottom */}
      <form
        onSubmit={handleSubmit}
        className="w-4/5 max-w-3xl mx-auto p-4 border-t bg-foregroundColor border-gray-300 rounded-full mb-12"
      >
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hi Bami! Please, provide the transcription of your meeting..."
            className="flex-1 rounded-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="ml-2 bg-black text-white px-4 py-2 rounded-full"
          >
            <FontAwesomeIcon icon={faPaperPlane} size="lg" />
          </button>
        </div>
      </form>
    </div>
  );
}
