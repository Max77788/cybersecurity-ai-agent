// app/page.tsx
'use client';

import { useState, useRef, FormEvent, useEffect, ChangeEvent } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faTrash } from "@fortawesome/free-solid-svg-icons";
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuid } from "uuid";
import { useSearchParams } from 'next/navigation';

import ReactMarkdown from 'react-markdown';

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

const testTranscript = process.env.EXAMPLE_MEETING_SUMMARY || "Here is the summary of your requested actions. Complete project proposal from 10:00 AM to 12:00 PM. Review meeting notes from 1:30 PM to 2:00 PM. Send follow-up email to client from 3:00 PM to 3:30 PM.";

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

export default function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Helper to format date strings only when valid.
  const formatDateString = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
  };

  const params = useSearchParams();
  const threadId = params.get('threadId');

  const [showInitialInput, setShowInitialInput] = useState(false);
  const [retrievedOldMessages, setRetrievedOldMessages] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [chatThreadId, setChatThreadId] = useState(threadId);
  const [loading, setLoading] = useState(false);
  const [iconLoading, setIconLoading] = useState(true);
  // mode can be either "casual" (chat) or "transcript" (summarizer)
  const [mode, setMode] = useState<'casual' | 'transcript'>('casual');
  const [summarizerData, setSummarizerData] = useState<SummarizerData | null>(null);
  // New state to handle the confirm modal status: idle, loading, success or error.
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  const getOldMessages = async () => {
    let res = await fetch('/api/chat/retrieve-all-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId }),
    });

    let { response } = await res.json();
    console.log(`Initial Messages: ${JSON.stringify(response)}`);
    setMessages(response);

    // Only show the initial input form if there are no old messages.
    if (!response || response.length === 0) {
      setShowInitialInput(true);
    } else {
      setShowInitialInput(false);
    }
  };

  // Use an effect to decide whether to show the initial input form.
  useEffect(() => {
    if (threadId) {
      if (!retrievedOldMessages) {
        getOldMessages();
        setRetrievedOldMessages(true);
      }
    } else {
      setShowInitialInput(true);
    }
  }, [threadId, retrievedOldMessages]);

  // Simulate icon loading time
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIconLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const fetchThreadId = async () => {
      const res = await fetch(`/api/chat/create-thread`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      const threadId = data.threadId;
      setChatThreadId(threadId);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('threadId', threadId);
      window.history.pushState({}, '', currentUrl);
    };
    if (!threadId) {
      fetchThreadId();
    }
  }, [threadId]);

  const createResponse = async (userMessage: string) => {
    let res = await fetch('/api/chat/post-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, mode, threadId: chatThreadId }),
    });

    let { id_of_run } = await res.json();

    let runCompleted = false;
    while (!runCompleted) {
      await new Promise(res => setTimeout(res, 2500));
      res = await fetch('/api/chat/get-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: chatThreadId, id_of_run }),
      });
      let { run_completed } = await res.json();
      runCompleted = run_completed;
    }

    res = await fetch('/api/chat/retrieve-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: chatThreadId, id_of_run }),
    });
    const { response } = await res.json();
    return response;
  };

  // Scroll to bottom whenever messages update
  /*
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const assistantResponse = await createResponse(input);
      let data = assistantResponse;
      if (mode === 'casual') {
        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantResponse || 'No response generated.'
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (mode === 'transcript') {
        setTranscript(input);
        data = JSON.parse(data);
        console.log(`Data returned: ${JSON.stringify(data)}`);
        setSummarizerData({
          nl_answer_to_user: data.nl_answer_to_user || 'No summary generated.',
          action_items: data.action_items || []
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

  const handleModeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newMode = e.target.value as 'casual' | 'transcript';
    setMode(newMode);
  };

  const handleActionItemChange = (index: number, field: keyof ActionItem, value: string) => {
    if (!summarizerData) return;
    const updatedItems = [...summarizerData.action_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSummarizerData({ ...summarizerData, action_items: updatedItems });
  };

  const handleAddActionItem = () => {
    if (!summarizerData) return;

    const nowTime = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const nowTimePlusOne = new Date(Date.now() - 5 * 60 * 60 * 1000);

    const newRow: ActionItem = { action_item: 'My Chore', start_datetime: nowTime.toLocaleDateString(), end_datetime: nowTimePlusOne.toLocaleDateString() };
    setSummarizerData({
      ...summarizerData,
      action_items: [...summarizerData.action_items, newRow],
    });
  };

  const handleDeleteActionItem = (index: number) => {
    if (!summarizerData) return;
    const updatedItems = summarizerData.action_items.filter((_, i) => i !== index);
    setSummarizerData({ ...summarizerData, action_items: updatedItems });
  };

  const handleConfirmModal = async () => {
    if (!summarizerData) return;
    setConfirmStatus('loading');
    setSummarizerData(null);
    const unique_id = uuid().slice(0, 7);
    try {
      await fetch('/api/save-reminder/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript_text: transcript,
          tasks_times: summarizerData.action_items,
          unique_id
        }),
      });
      for (let i = 0; i < 6; i++) {
        await new Promise(res => setTimeout(res, 2500));
        const res = await fetch(`/api/save-reminder/get-status?unique_id=${unique_id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          setConfirmStatus('success');
          setTimeout(() => window.location.reload(), 4000);
          return;
        }
      }
      setConfirmStatus('error');
      setInput(transcript);
    } catch (error) {
      setConfirmStatus('error');
    }
    setTimeout(() => window.location.reload(), 4000);
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
              {msg.role !== 'user' && (
                <div className="flex flex-row items-start gap-2 mb-8">
                  <img
                    src="/assistant-avatar.png"
                    alt="Assistant"
                    className="w-8 h-8 rounded-full mb-1"
                  />
                  <div className="inline-block w-fit max-w-3xl px-4 py-2 rounded-3xl whitespace-pre-wrap break-words text-white leading-loose">
                    <ReactMarkdown>
                      {(() => {
                        try {
                          const parsedContent = JSON.parse(msg.content);
                          return parsedContent?.nl_answer_to_user || msg.content;
                        } catch (error) {
                          return msg.content; // Fallback to original content if parsing fails
                        }
                      })()}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex flex-row items-end gap-2 mb-8">
                  <div className="inline-block w-fit max-w-xl px-4 py-2 rounded-3xl whitespace-pre-wrap break-words bg-foregroundColor text-white leading-loose">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input form with mode selector */}
      {showInitialInput ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className='text-white mb-8 text-3xl animate-pulse font-bold'>How can I help you today?</h2>
          <form
            onSubmit={handleSubmit}
            className="w-4/5 max-w-3xl p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl"
          >
            <div className="flex">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder={mode !== "casual" ? "Hi Bami! Please, provide the transcription of your meeting..." : "Hi, Bami! Type your message here..."}
                className={`flex-1 max-h-72 min-h-12 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? "resize-y" : "resize-none"}`}
                style={{ textAlign: "center", verticalAlign: "middle" }}
              />
            </div>
            <div className="my-4 relative">
              <div className="w-full flex justify-center gap-4">
                <label className="mr-4 text-white font-bold">
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
                <label className="text-white font-bold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-backgroundColor bg-opacity-100">
          <div className="bg-foregroundColor text-white p-6 rounded-3xl w-full max-w-3xl">
            <h2 className="text-2xl text-white text-center font-bold mb-4">Transcript Summary</h2>
            <p className="text-center leading-loose">{summarizerData.nl_answer_to_user}</p>
            <hr className="border-t border-gray-300 my-6" />

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
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                        />
                      </td>
                      <td className="border px-4 py-2 whitespace-normal break-words align-top">
                        <textarea
                          // Use the helper to only format if valid; otherwise show raw text.
                          value={formatDateString(item.start_datetime)}
                          onChange={(e) =>
                            handleActionItemChange(index, 'start_datetime', e.target.value)
                          }
                          className="w-full border-none focus:outline-none h-auto resize-none overflow-hidden bg-transparent"
                          rows={1}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                        />
                      </td>
                      <td className="border px-4 py-2 whitespace-normal break-words align-top">
                        <textarea
                          value={formatDateString(item.end_datetime)}
                          onChange={(e) =>
                            handleActionItemChange(index, 'end_datetime', e.target.value)
                          }
                          className="w-full border-none focus:outline-none h-auto resize-none overflow-hidden bg-transparent"
                          rows={1}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-backgroundColor bg-opacity-100">
          <div className="flex items-center text-white text-2xl font-bold">
            Analyzing Transcript...
            <img src="/loading-gif.gif" alt="Loading..." className="w-10 h-10 ml-2" />
          </div>
        </div>
      )}

      {/* Overlay for confirm modal status */}
      {confirmStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-backgroundColor">
          {confirmStatus === 'loading' && (
            <div className="flex flex-col items-center">
              <img src="/loading-gif.gif" alt="Loading..." className="w-12 h-12" />
              <p className="text-white mt-4 text-lg">Loading...</p>
            </div>
          )}
          {confirmStatus === 'success' && (
            <p className="text-white text-2xl font-bold">✅Success✅</p>
          )}
          {confirmStatus === 'error' && (
            <p className="text-white text-2xl font-bold">⚠️Something went wrong, try again⚠️</p>
          )}
        </div>
      )}
    </div>
  );
}
