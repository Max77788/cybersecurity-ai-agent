// app/page.tsx
'use client';

import { useState, useLayoutEffect, useRef, FormEvent, useEffect, ChangeEvent } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faTrash } from "@fortawesome/free-solid-svg-icons";
import dotenv from 'dotenv';
dotenv.config();

import InstructionsModal from '@/app/components/InstructionsModal';
import { ToastContainer, toast } from 'react-toastify';

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

interface ThreadObj {
    _id: string;
    thread_id: string;
    chat_name: string;
    dateAdded: Date;
}

const testTranscript =
    process.env.EXAMPLE_MEETING_SUMMARY ||
    "Here is the summary of your requested actions. Complete project proposal from 10:00 AM to 12:00 PM. Review meeting notes from 1:30 PM to 2:00 PM. Send follow-up email to client from 3:00 PM to 3:30 PM.";

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
    // State to track the sidebar open/closed status.
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Persist sidebar state using localStorage.
    useEffect(() => {
        const storedSidebarState = localStorage.getItem('sidebarOpen');
        if (storedSidebarState !== null) {
            setSidebarOpen(storedSidebarState === 'true');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }, [sidebarOpen]);

    // Helper to format date strings.
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
                hour12: true,
            });
    };

    const params = useSearchParams();
    const threadId = params.get('threadId');
    const taskId = params.get('task_id');

    const summaryContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);


    const [showInitialInput, setShowInitialInput] = useState(false);
    const [retrievedOldMessages, setRetrievedOldMessages] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<ThreadObj[]>([]);

    const [input, setInput] = useState('');
    const [transcript, setTranscript] = useState('');
    // Initialize chatThreadId with the URL-provided threadId, if any.
    const [chatThreadId, setChatThreadId] = useState(threadId);
    const [loading, setLoading] = useState(false);
    const [iconLoading, setIconLoading] = useState(true);
    // mode can be either "casual" (chat) or "transcript" (summarizer)
    const [mode, setMode] = useState<'casual' | 'transcript'>('casual');
    const [summarizerData, setSummarizerData] = useState<SummarizerData | null>(null);
    // State to handle the confirm modal status.
    const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const [showConvosButton, setShowConvosButton] = useState(true);

    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [agentInstructions, setAgentInstructions] = useState("Your current AI instructions here...");

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

        // Only show the initial input form if there are no messages.
        if (!response || response.length === 0) {
            setShowInitialInput(true);
        } else {
            setShowInitialInput(false);
        }
    };

    const saveThreadIdAndName = async (thread_id: string, chat_name: string) => {
        await fetch('/api/conversation/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id, chat_name }),
        });
    };

    const pullAllThreadIds = async () => {
        const res = await fetch("/api/conversation/retrieve-all");
        const threadsList = await res.json();
        setConversations(threadsList);
    };

    useEffect(() => {
        pullAllThreadIds();
    }, []);

    const handleSaveInstructions = async (newInstructions: string) => {
        setAgentInstructions(newInstructions)

        let res = await fetch('/api/assistant/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newInstructions }),
        });

        if (res.ok) {
            toast.success("Instructions have been updated successfully!")
        } else {
            toast.error("There was an error updating instructions. Try again later!")
        }

    }

    const startTaskChat = async () => {
        const response = await fetch('/api/data/find-tasks-by-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks_ids: [taskId] }),
        });
        const returned_task = await response.json();

        console.log(`Returned Task: ${JSON.stringify(returned_task)}`);

        const content_of_the_task = returned_task.tasks_to_return[0].action_item;

        const messageToSend = `
        Help me with accomplishing the following task:

        ${content_of_the_task}

        Ask me all needed details and provide the step-by-step plan.
    `;
        const userMessage: Message = { role: 'user', content: messageToSend };
        const userMessageShort: Message = { role: 'user', content: `Help me with the following task ${content_of_the_task}` };

        setMessages(prev => [...prev, userMessageShort]);
        setInput('');
        setLoading(true);

        try {
            const assistantResponse = await createResponse(messageToSend);
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

        // Remove the task_id parameter from the URL.
        window.history.pushState({}, '', ((url) => (url.searchParams.delete('task_id'), url.toString()))(new URL(window.location.href)));
    };

    // Initialize the chat based on URL parameters.
    useEffect(() => {
        if (taskId) {
            if (!chatThreadId) return;
            if (messages.length > 0) return;
            startTaskChat();
        } else if (threadId) {
            if (!retrievedOldMessages) {
                getOldMessages();
                setRetrievedOldMessages(true);
            }
        } else {
            setShowInitialInput(true);
        }
    }, [taskId, chatThreadId, threadId, retrievedOldMessages, messages.length]);

    // Simulate icon loading.
    useEffect(() => {
        const timeout = setTimeout(() => {
            setIconLoading(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, []);

    // Create a thread if one doesn't exist.
    useEffect(() => {
        const fetchThreadId = async () => {
            const res = await fetch(`/api/chat/create-thread`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            const newThreadId = data.threadId;
            setChatThreadId(newThreadId);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('threadId', newThreadId);
            window.history.pushState({}, '', currentUrl);
        };
        if (!threadId) {
            fetchThreadId();
        }
    }, [threadId]);

    useLayoutEffect(() => {
        const container = summaryContainerRef.current;
        if (container) {
            const newScrollHeight = container.scrollHeight;
            // If there's a recorded previous scroll height, adjust scrollTop by the height difference.
            if (prevScrollHeightRef.current) {
                const diff = newScrollHeight - prevScrollHeightRef.current;
                container.scrollTop = container.scrollTop + diff;
            }
            // Update the stored scroll height for the next update.
            prevScrollHeightRef.current = newScrollHeight;
        }
    }, [summarizerData]);


    const createResponse = async (userMessage: string) => {
        // setIconLoading(true);

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

        setIconLoading(false);

        return response;
    };

    // Scroll to the bottom when new messages arrive.
    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        if (messages.length === 1) {
            console.log("Triggered Saving Conversation");
            saveThreadIdAndName(threadId || '', messages[0].content.slice(0, 45));
        }
    }, [messages]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        setShowConvosButton(false);

        try {
            let message = input;

            if (mode === "transcript") {
                message = `${input}

                If there is no specific date in this transcript use this day of today: ${new Date(
                    Date.now() - 6 * 60 * 60 * 1000
                )}
                `;
                console.log('%cAppended date to the prompt', 'color: green; font-weight: bold;');
            }

            const assistantResponse = await createResponse(message);
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
            };

            const res = await fetch("/api/assistant/memory/modify", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ threadId: chatThreadId })
            });

            const { was_memory_updated } = await res.json();

            if (was_memory_updated) {
                toast.info("Memory has been updated successfully!");
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

    // Use ISO datetime format for datetime-local inputs.
    const handleAddActionItem = () => {
        if (!summarizerData) return;

        const nowTime = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const nowTimePlusOne = new Date(Date.now() - 5 * 60 * 60 * 1000);

        const newRow: ActionItem = {
            action_item: 'My Task',
            start_datetime: nowTime.toISOString().substring(0, 16),
            end_datetime: nowTimePlusOne.toISOString().substring(0, 16),
        };
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
                    unique_id,
                }),
            });
            for (let i = 0; i < 8; i++) {
                await new Promise((res) => setTimeout(res, 3500));
                const res = await fetch(`/api/save-reminder/get-status?unique_id=${unique_id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (data.success) {
                    setConfirmStatus('success');
                    setTimeout(() => {
                        window.location.href = window.location.pathname + window.location.hash;
                    }, 4000);
                    return;
                }
            }
            setConfirmStatus('error');
            setInput(transcript);
        } catch (error) {
            setConfirmStatus('error');
        }
        setTimeout(() => {
            window.location.href = window.location.pathname + window.location.hash;
        }, 4000);
    };

    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 700);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // --- Group conversations by date ---
    const groupConversations = () => {
        const todayGroup: ThreadObj[] = [];
        const yesterdayGroup: ThreadObj[] = [];
        const beforeGroup: ThreadObj[] = [];

        const now = new Date();
        const todayDateStr = now.toDateString();
        const yesterdayDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();

        conversations.forEach((conv) => {
            const convDate = new Date(conv.dateAdded);
            if (convDate.toDateString() === todayDateStr) {
                todayGroup.push(conv);
            } else if (convDate.toDateString() === yesterdayDateStr) {
                yesterdayGroup.push(conv);
            } else {
                beforeGroup.push(conv);
            }
        });

        // Sort each group in descending order (newest first)
        todayGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        yesterdayGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        beforeGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

        return { todayGroup, yesterdayGroup, beforeGroup };
    };

    const groupedConversations = groupConversations();

    if (initialLoading) return null;

    return (
        <div className="flex h-screen relative">
            {/* Sidebar (always rendered for smooth transitions) */}
            <div
                className={`fixed top-[63px] bottom-0 left-0 w-64 h-[calc(100vh-63px)] bg-foregroundColor text-white p-4 overflow-y-scroll transition-transform duration-300 z-50 custom-scrollbar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <h2 className="text-2xl font-bold mb-4 animate-pulse">Conversations</h2>
                {groupedConversations.todayGroup.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">Today</h3>
                        <hr className='mb-4'></hr>
                        <ul>
                            {groupedConversations.todayGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''
                                        }`}
                                >
                                    <button
                                        className="w-full text-left hover:bg-gray-900 p-2 rounded-lg"
                                        onClick={() => {
                                            const currentUrl = new URL(window.location.href);
                                            currentUrl.searchParams.set('threadId', conv.thread_id);
                                            window.history.pushState({}, '', currentUrl);
                                            window.location.reload();
                                        }}
                                    >
                                        <div className="font-bold">
                                            {conv.chat_name.trim() || 'Unnamed Chat'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Date Added: {new Date(conv.dateAdded).toLocaleString()}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {groupedConversations.yesterdayGroup.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">Yesterday</h3>
                        <hr className='mb-4'></hr>
                        <ul>
                            {groupedConversations.yesterdayGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg hover:opacity-90 ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''
                                        }`}
                                >
                                    <button
                                        className="w-full text-left hover:bg-gray-900 p-2 rounded-lg"
                                        onClick={() => {
                                            const currentUrl = new URL(window.location.href);
                                            currentUrl.searchParams.set('threadId', conv.thread_id);
                                            window.history.pushState({}, '', currentUrl);
                                            window.location.reload();
                                        }}
                                    >
                                        <div className="font-bold">
                                            {conv.chat_name.trim() || 'Unnamed Chat'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Date Added: {new Date(conv.dateAdded).toLocaleString()}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {groupedConversations.beforeGroup.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">2+ Days Ago</h3>
                        <hr className='mb-4'></hr>
                        <ul>
                            {groupedConversations.beforeGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg hover:opacity-90 ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''
                                        }`}
                                >
                                    <button
                                        className="w-full text-left hover:bg-gray-900 p-2 rounded-lg"
                                        onClick={() => {
                                            const currentUrl = new URL(window.location.href);
                                            currentUrl.searchParams.set('threadId', conv.thread_id);
                                            window.history.pushState({}, '', currentUrl);
                                            window.location.reload();
                                        }}
                                    >
                                        <div className="font-bold">
                                            {conv.chat_name.trim() || 'Unnamed Chat'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Date Added: {new Date(conv.dateAdded).toLocaleString()}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Main Chat Area with smooth margin-left transition */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
                {/* Chat messages area */}
                <div className="flex-1 px-12 py-16 overflow-y-auto">
                    <div className="mx-auto w-[40%]">
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
                                        <div className="inline-block w-fit max-w-3xl px-4 py-2 rounded-3xl whitespace-pre-wrap break-words text-white leading-relaxed">
                                            <ReactMarkdown>
                                                {(() => {
                                                    try {
                                                        const parsedContent = JSON.parse(msg.content);
                                                        return parsedContent?.nl_answer_to_user || msg.content;
                                                    } catch (error) {
                                                        return msg.content;
                                                    }
                                                })()}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                {msg.role === 'user' && (
                                    <div className="flex flex-row items-start gap-2 mb-8">
                                        <div className="px-4 py-2 rounded-3xl whitespace-pre-wrap break-words bg-foregroundColor text-white">
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
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input form with mode selector */}
                {(messages.length === 0 && showInitialInput) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <h2 className="text-white mb-8 text-3xl animate-pulse font-bold">
                            How can I help you today?
                        </h2>
                        <form
                            onSubmit={handleSubmit}
                            className="w-4/5 max-w-3xl p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl"
                        >
                            <div className="flex">
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                    placeholder={
                                        mode !== 'casual'
                                            ? 'Hi Bami! Please, provide the transcription of your meeting...'
                                            : 'Hi, Bami! Type your message here...'
                                    }
                                    className={`flex-1 max-h-72 min-h-12 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? 'resize-y' : 'resize-none'}`}
                                    style={{ textAlign: 'center', verticalAlign: 'middle' }}
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
                                        className="absolute right-0 bg-black text-white px-4 py-2 hover:bg-gray-900 hover:cursor-pointer rounded-3xl"
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
                            className="w-[50%] max-w-3xl mx-auto p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl"
                        >
                            <div className="relative w-full flex">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        mode !== 'casual'
                                            ? 'Hi Bami! Please, provide the transcription of your meeting...'
                                            : 'Hi, Bami! Type your message here...'
                                    }
                                    className={`flex-1 max-h-72 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? 'resize-y' : 'resize-none'}`}
                                    style={{ minHeight: '100px', textAlign: 'left' }}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 bottom-6 bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-full"
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

                <div className="fixed bottom-4 right-4 z-50">
                    <button
                        onClick={() => setShowInstructionsModal(true)}
                        className="bg-white text-black px-3 py-2 rounded-full shadow-md hover:bg-gray-200"
                    >
                        ✍️Edit AI Instructions
                    </button>
                </div>


                {/* Modal for transcript summarizer mode */}
                {summarizerData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-backgroundColor bg-opacity-100">
                        <div
                            ref={summaryContainerRef}
                            className="bg-foregroundColor text-white p-6 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transition-all duration-300 custom-scrollbar"
                            style={{ overflowAnchor: 'none' }}
                        >
                            <h2 className="text-2xl text-white text-center font-bold mb-4">
                                Transcript Summary
                            </h2>
                            <p className="text-center leading-loose">
                                {summarizerData.nl_answer_to_user}
                            </p>
                            <hr className="border-t border-gray-300 my-6" />

                            <div className="mb-4">
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
                                                <td className="border px-4 py-2 w-1/3 min-w-0 align-top">
                                                    <textarea
                                                        value={item.action_item}
                                                        onChange={(e) =>
                                                            handleActionItemChange(index, 'action_item', e.target.value)
                                                        }
                                                        onInput={(e) => {
                                                            e.currentTarget.style.height = 'auto';
                                                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight+25}px`;
                                                        }}
                                                        className="w-full border-none focus:outline-none resize-none overflow-hidden bg-transparent"
                                                        rows={1}
                                                        ref={(el) => {
                                                            if (el) {
                                                                el.style.height = 'auto';
                                                                el.style.height = `${el.scrollHeight+25}px`;
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="border px-4 py-2 text-center align-middle h-full">
                                                    <div className="flex justify-center items-center h-full">
                                                        <input
                                                            type="datetime-local"
                                                            value={
                                                                item.start_datetime
                                                                    ? new Date(item.start_datetime).toISOString().substring(0, 16)
                                                                    : ''
                                                            }
                                                            onChange={(e) =>
                                                                handleActionItemChange(index, 'start_datetime', e.target.value)
                                                            }
                                                            className="border-none focus:outline-none bg-transparent text-center"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="border px-4 py-2 text-center align-middle h-full">
                                                    <div className="flex justify-center items-center h-full">
                                                        <input
                                                            type="datetime-local"
                                                            value={
                                                                item.end_datetime
                                                                    ? new Date(item.end_datetime).toISOString().substring(0, 16)
                                                                    : ''
                                                            }
                                                            onChange={(e) =>
                                                                handleActionItemChange(index, 'end_datetime', e.target.value)
                                                            }
                                                            className="border-none focus:outline-none bg-transparent text-center"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="border px-4 py-2 text-center align-middle h-full">
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
                                <button onClick={handleAddActionItem} className="bg-blue-500 text-white px-4 py-2 rounded">
                                    Add Row➕
                                </button>
                                <button onClick={handleConfirmModal} className="bg-green-500 text-white px-4 py-2 rounded">
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

            {/* Toggle Button */}
            {showConvosButton && (
                <button
                    onClick={() => setSidebarOpen((prev) => !prev)}
                    className="fixed top-3 left-64 bg-black hover:bg-gray-900 rounded-full text-white px-4 py-2 z-50 transition-all duration-300"
                >
                    {sidebarOpen ? '< Hide Tab' : 'Show Tab >'}
                </button>
            )}

            {showInstructionsModal && (
                <InstructionsModal
                    onSave={(newInstructions) => setAgentInstructions(newInstructions)}
                    onClose={() => setShowInstructionsModal(false)}
                />
            )}

        </div>
    );
}
