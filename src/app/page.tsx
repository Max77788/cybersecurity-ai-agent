// app/page.tsx
'use client';

import { useState, useRef, FormEvent, useEffect, ChangeEvent } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faTrash } from "@fortawesome/free-solid-svg-icons";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ActionItem {
  action_item: string;
  start_datetime: string;
  end_datetime: string;
}

interface SummarizerData {
  nl_answer_to_user: string;
  action_items: ActionItem[];
}

const testItem: SummarizerData = {
  nl_answer_to_user: "Here is the summary of your requested actions.",
  action_items: [
    {
      action_item: "Complete project proposal",
      start_datetime: "2025-02-07T10:00:00Z",
      end_datetime: "2025-02-07T12:00:00Z",
    },
    {
      action_item: "Review meeting notes",
      start_datetime: "2025-02-07T13:30:00Z",
      end_datetime: "2025-02-07T14:00:00Z",
    },
    {
      action_item: "Send follow-up email to client",
      start_datetime: "2025-02-07T15:00:00Z",
      end_datetime: "2025-02-07T15:30:00Z",
    },
  ],
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [iconLoading, setIconLoading] = useState(true);
  // mode can be either "casual" (chat) or "transcript" (summarizer)
  const [mode, setMode] = useState<'casual' | 'transcript'>('casual');
  const [summarizerData, setSummarizerData] = useState<SummarizerData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Simulate icon loading time
    const timeout = setTimeout(() => {
      setIconLoading(false);
    }, 500); // Adjust timing if necessary

    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Append user message to chat history
    const userMessage: Message = { role: 'user', content: input };
    const messagesHistory = [...messages, userMessage];
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call our chat API endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.content, mode, messagesHistory }),
      });

      const data = await res.json();

      if (mode === 'casual') {
        // In casual mode, just append the response as before.
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer || 'No response generated.'
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (mode === 'transcript') {
        // In transcript summarizer mode, capture the response and display the modal.
        setTranscript(input);
        
        setSummarizerData({
          nl_answer_to_user: data.answer?.nl_answer_to_user || 'No summary generated.',
          action_items: data?.answer.action_items || []
        });
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error: Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle changes in the mode selector radio buttons
  const handleModeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newMode = e.target.value as 'casual' | 'transcript';
    setMode(newMode);
  };

  // Handler for changes in action item fields inside the modal.
  const handleActionItemChange = (index: number, field: keyof ActionItem, value: string) => {
    if (!summarizerData) return;
    const updatedItems = [...summarizerData.action_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSummarizerData({ ...summarizerData, action_items: updatedItems });
  };

  // Handler to add a new row in the action items table.
  const handleAddActionItem = () => {
    if (!summarizerData) return;
    const newRow: ActionItem = { action_item: '', start_datetime: '', end_datetime: '' };
    setSummarizerData({
      ...summarizerData,
      action_items: [...summarizerData.action_items, newRow],
    });
  };

  // Handler to delete a row in the action items table.
  const handleDeleteActionItem = (index: number) => {
    if (!summarizerData) return;
    const updatedItems = summarizerData.action_items.filter((_, i) => i !== index);
    setSummarizerData({ ...summarizerData, action_items: updatedItems });
  };

  // Handler for the modal confirm button.
  const handleConfirmModal = () => {
    if (!summarizerData) return;
    // Append the assistant message with the transcript summary.
    const assistantMessage: Message = {
      role: 'assistant',
      content: summarizerData.nl_answer_to_user
    };
    setMessages(prev => [...prev, assistantMessage]);
    // Close the modal.
    setSummarizerData(null);
  };

  return (
    <div className="relative flex flex-col h-screen">
      {/* Chat messages area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mx-auto w-[70%]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Profile Icon for Assistant (Top Left) */}
              {msg.role !== 'user' && (
                <div className="flex flex-row items-start gap-2">
                  <img
                    src="/assistant-avatar.png"
                    alt="Assistant"
                    className="w-8 h-8 rounded-full mb-1"
                  />
                  <div className="inline-block w-fit max-w-3xl px-4 py-2 rounded-3xl whitespace-pre-wrap break-words text-white leading-loose">
                    {msg.content}
                  </div>
                </div>
              )}
              {/* Profile Icon for User (Top Right) */}
              {msg.role === 'user' && (
                <div className="flex flex-row items-end gap-2">
                  <div className="inline-block w-fit max-w-xl px-4 py-2 rounded-3xl whitespace-pre-wrap break-words bg-foregroundColor text-white">
                    {msg.content}
                  </div>
                  <img
                    src="/user-avatar.jpg"
                    alt="User"
                    className="w-8 h-8 rounded-full mb-1"
                  />
                </div>
              )}
            </div>
          ))}
          {loading && mode === 'casual' && (
            <div className="mb-4 ml-2 flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-3xl flex items-center">
                <img src="/loading-gif.gif" alt="Loading..." className="w-6 h-6" />
              </div>
            </div>
          )}
          {/* Dummy div for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input form with mode selector */}
      {messages.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-4/5 max-w-3xl p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl"
          >
            <div className="flex">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                }}
                placeholder={mode !== "casual" ? "Hi Bami! Please, provide the transcription of your meeting..." : "Hi, Bami! Type your message here..."}
                className={`flex-1 max-h-72 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? "resize-y" : "resize-none"}`}
                style={{ textAlign: "center", verticalAlign: "middle" }}
              />
            </div>
            <div className="my-4 relative">
              {/* Radio buttons centered */}
              <div className="w-full flex justify-center">
                <label className="mr-4 text-white">
                  <input
                    type="radio"
                    name="mode"
                    value="casual"
                    checked={mode === 'casual'}
                    onChange={handleModeChange}
                    className="mr-1"
                    disabled={messages.length !== 0}
                  />
                  Casual Conversation
                </label>
                <label className="text-white">
                  <input
                    type="radio"
                    name="mode"
                    value="transcript"
                    checked={mode === 'transcript'}
                    onChange={handleModeChange}
                    className="mr-1"
                    disabled={messages.length !== 0}
                  />
                  Transcript Summarizer
                </label>
                {/* Send button fixed on the right */}
                <button
                  type="submit"
                  className="absolute right-0 bg-black text-white px-4 py-2 rounded-3xl"
                  disabled={input.length === 0}
                >
                  {iconLoading ? (
                    <div className="w-5 h-6 rounded-3xl bg-gray-300 animate-pulse"></div>
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="sticky bottom-0">
          <form
            onSubmit={handleSubmit}
            className="w-4/5 max-w-3xl mx-auto p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl"
          >
            <div className="relative w-full flex">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode !== "casual" ? "Hi Bami! Please, provide the transcription of your meeting..." : "Hi, Bami! Type your message here..."}
                className={`flex-1 max-h-72 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? "resize-y" : "resize-none"}`}
                style={{ minHeight: "100px", textAlign: "left" }}
              />
              <button
                type="submit"
                className="absolute right-2 bottom-2 bg-black text-white px-4 py-2 rounded-full"
                disabled={input.length === 0}
              >
                {iconLoading ? (
                  <div className="w-6 h-6 rounded-3xl bg-gray-300 animate-pulse"></div>
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal for transcript summarizer mode */}
      {summarizerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-foregroundColor text-white p-6 rounded-3xl w-full max-w-3xl">
            <h2 className="text-2xl text-white text-center font-bold mb-4">Transcript Summary</h2>
            <p className="mb-4">{summarizerData.nl_answer_to_user}</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr>
                    <th className="border px-4 py-2 text-left">Action Item</th>
                    <th className="border px-4 py-2 text-left">Start Date</th>
                    <th className="border px-4 py-2 text-left">End Date</th>
                    <th className="border px-4 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {summarizerData.action_items.map((item, index) => (
                    <tr key={index} className="h-auto">
                      <td className="border px-4 py-2 w-1/3 min-w-0 whitespace-normal break-words align-top">
                        <textarea
                          value={item.action_item}
                          onChange={(e) =>
                            handleActionItemChange(index, 'action_item', e.target.value)
                          }
                          onInput={(e) => {
                            e.currentTarget.style.height = 'auto';
                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                          }}
                          className="w-full border-none focus:outline-none h-auto resize-none overflow-hidden bg-transparent"
                          rows={1}
                        />
                      </td>
                      <td className="border px-4 py-2 whitespace-normal break-words align-top">
                        <textarea
                          value={item.start_datetime}
                          onChange={(e) =>
                            handleActionItemChange(index, 'start_datetime', e.target.value)
                          }
                          className="w-full border-none focus:outline-none h-auto resize-none overflow-hidden bg-transparent"
                          rows={1}
                        />
                      </td>
                      <td className="border px-4 py-2 whitespace-normal break-words align-top">
                        <textarea
                          value={item.end_datetime}
                          onChange={(e) =>
                            handleActionItemChange(index, 'end_datetime', e.target.value)
                          }
                          className="w-full border-none focus:outline-none h-auto resize-none overflow-hidden bg-transparent"
                          rows={1}
                        />
                      </td>
                      <td className="border px-4 py-2 text-center align-middle">
                        <button
                          onClick={() => handleDeleteActionItem(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete this row"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleAddActionItem}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add Row➕
              </button>
              <button
                onClick={handleConfirmModal}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Confirm✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen overlay loading for transcript mode */}
      {loading && mode === 'transcript' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-2xl font-bold">
            Loading Transcript...
          </div>
        </div>
      )}
    </div>
  );
}
