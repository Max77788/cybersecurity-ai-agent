// app/page.tsx
'use client';

import { useState, useLayoutEffect, useRef, FormEvent, useEffect, ChangeEvent } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faTrash, faImage, faMicrophone, faFile, faVideo } from "@fortawesome/free-solid-svg-icons";
import dotenv from 'dotenv';
dotenv.config();

import { extractDocumentText } from '../lib/functions';

import InstructionsModal from '@/app/components/InstructionsModal';
import { ModelSelector } from './components/ModelSelector';

import { ToastContainer, toast } from 'react-toastify';

import { v4 as uuid } from "uuid";
import { useSearchParams } from 'next/navigation';

import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    imageUrls?: string[];
    isImage?: boolean;
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

export default function ChatPageWORKING() {
    // Desktop left sidebar state (preserved for desktop)
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useEffect(() => {
        const storedSidebarState = localStorage.getItem('sidebarOpen');
        if (storedSidebarState !== null) {
            setSidebarOpen(storedSidebarState === 'true');
        }
    }, []);
    useEffect(() => {
        localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }, [sidebarOpen]);

    // Mobile right sliding tab state (for chat history and extra buttons)
    const [mobileTabOpen, setMobileTabOpen] = useState(false);

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

    const [firstPressedSend, setFirstPressedSend] = useState(false);
    const [showInitialInput, setShowInitialInput] = useState(false);
    const [retrievedOldMessages, setRetrievedOldMessages] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<ThreadObj[]>([]);

    const [input, setInput] = useState('');
    const [transcript, setTranscript] = useState('');
    const [chatThreadId, setChatThreadId] = useState(threadId);
    const [loading, setLoading] = useState(false);
    const [iconLoading, setIconLoading] = useState(true);
    const [mode, setMode] = useState<'casual' | 'transcript'>('casual');
    const [summarizerData, setSummarizerData] = useState<SummarizerData | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [showConvosButton, setShowConvosButton] = useState(true);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [agentInstructions, setAgentInstructions] = useState("Your current AI instructions here...");
    const [currentModel, setCurrentModel] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isInitialRender = useRef(true);

    // Refs for file inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // State for storing uploaded images (base64 strings)
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    // State for storing the uploaded audio file
    const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);

    const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);

    // Document upload state
    const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedDocument(file);
        }
    };

    const removeUploadedDocument = () => {
        setUploadedDocument(null);
        if (documentInputRef.current) {
            documentInputRef.current.value = "";
        }
    };

    const removeUploadedImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeUploadedAudio = () => {
        setUploadedAudio(null);
        if (audioInputRef.current) {
            audioInputRef.current.value = "";
        }
    };

    // Reference for video file input.
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Handler when a video file is selected.
    const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        console.log(`Video file selected: ${file}`);

        if (file) {
            setUploadedVideo(file);
        }
    };

    // Handler to remove the selected video file.
    const removeUploadedVideo = () => {
        setUploadedVideo(null);
        if (videoInputRef.current) {
            videoInputRef.current.value = "";
        }
    };


    const getOldMessages = async () => {
        const res = await fetch('/api/chat/retrieve-all-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId }),
        });
        let { response } = await res.json();
        console.log(`Initial Messages: ${JSON.stringify(response)}`);
        setMessages(response);
        setShowInitialInput(!(response && response.length));
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

    useEffect(() => {
        async function fetchModel() {
            const res = await fetch('/api/assistant/models/get');
            const data = await res.json();
            setCurrentModel(data.current_model_id);
        }
        fetchModel();

        console.log(`Current model ID: ${currentModel}`);
    })

    const handleSaveInstructions = async (newInstructions: string) => {
        setAgentInstructions(newInstructions);
        let res = await fetch('/api/assistant/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newInstructions }),
        });
        if (res.ok) {
            toast.success("Instructions have been updated successfully!");
        } else {
            toast.error("There was an error updating instructions. Try again later!");
        }
    };

    const startTaskChat = async () => {
        const response = await fetch('/api/data/find-tasks-by-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks_ids: [taskId] }),
        });
        const returned_task = await response.json();
        console.log(`Returned Task: ${JSON.stringify(returned_task)}`);
        const content_of_the_task = returned_task.tasks_to_return[0].action_item;
        const messageToSend =
            `Help me with accomplishing the following task:

${content_of_the_task}

Ask me all needed details and provide the step-by-step plan.`;
        const userMessage: Message = { role: 'user', content: `Help me with the following task ${content_of_the_task}` };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        try {
            const assistantResponse = await createResponse(messageToSend, []);
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
            // Handle error if needed.
        } finally {
            setLoading(false);
        }
        window.history.pushState({}, '', ((url) => (url.searchParams.delete('task_id'), url.toString()))(new URL(window.location.href)));
    };

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

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIconLoading(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, []);

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
            if (prevScrollHeightRef.current) {
                const diff = newScrollHeight - prevScrollHeightRef.current;
                container.scrollTop = container.scrollTop + diff;
            }
            prevScrollHeightRef.current = newScrollHeight;
        }
    }, [summarizerData]);

    const createResponse = async (userMessage: string, file_ids_LIST: any[]) => {
        let res = await fetch('/api/chat/post-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage, mode, file_ids_LIST, threadId: chatThreadId }),
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

    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        if (messages.length === 1) {
            console.log("Triggered Saving Conversation");
            saveThreadIdAndName(threadId || '', messages[0].content.slice(0, 45));
        }
    }, [messages]);

    function base64ToBlob(base64: string, mimeType: string) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Handle audio file selection.
    const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedAudio(file);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() && !uploadedAudio) return;
        setFirstPressedSend(true);
        setUploadedAudio(null);

        const userTextMessage = input;

        if (!uploadedAudio && !uploadedDocument) {
            const userMessage: Message = {
                role: 'user',
                content: input,
                imageUrls: uploadedImages.length > 0 ? [...uploadedImages] : undefined
            };
            setMessages(prev => [...prev, userMessage]);
        }
        setInput('');
        setLoading(true);
        setShowConvosButton(false);
        setUploadedImages([]);

        let file_ids_LIST: any[] = [];
        try {
            if (uploadedImages.length > 0) {
                console.log(`Uploaded Images: ${uploadedImages}`);
                const formData = new FormData();
                uploadedImages.forEach((base64String, index) => {
                    const mimeType = base64String.split(',')[0].split(':')[1].split(';')[0];
                    const imageBlob = base64ToBlob(base64String, mimeType);
                    formData.append(`images[${index}]`, imageBlob, `image_${index}.jpg`);
                });
                for (let pair of formData.entries()) {
                    console.log(`${pair[0]}:`, pair[1]);
                }
                const res = await fetch("/api/assistant/files/upload", {
                    method: 'POST',
                    body: formData,
                });
                let { file_ids_list } = await res.json();
                file_ids_LIST = file_ids_list;
                console.log(`File IDs: ${file_ids_LIST}`);
            }
            let messageToSend = userTextMessage;
            if (uploadedAudio) {
                const formData = new FormData();
                formData.append("audio", uploadedAudio, uploadedAudio.name);

                const resAudio = await fetch("/api/assistant/audio/transcribe", {
                    method: 'POST',
                    body: formData,
                });
                const audioData = await resAudio.json();

                messageToSend = input ? `${input}\n\nTranscribed audio: ${audioData.transcription}` : `Transcribed audio: ${audioData.transcription}`;
                const userMessage: Message = {
                    role: 'user',
                    content: messageToSend,
                    imageUrls: uploadedImages.length > 0 ? [...uploadedImages] : undefined
                };
                setMessages(prev => [...prev, userMessage]);
                setUploadedAudio(null);
            }

            if (uploadedVideo) {
                const formData = new FormData();
                formData.append("video", uploadedVideo, uploadedVideo.name);

                const resVideo = await fetch("/api/assistant/video/transcribe", {
                    method: 'POST',
                    body: formData,
                });
                const videoData = await resVideo.json();

                messageToSend = input ? `${input}\n\nTranscribed audio from video: ${videoData.transcription}` : `Transcribed audio: ${videoData.transcription}`;
                const userMessage: Message = {
                    role: 'user',
                    content: messageToSend,
                    imageUrls: uploadedImages.length > 0 ? [...uploadedImages] : undefined
                };
                setMessages(prev => [...prev, userMessage]);
                setUploadedVideo(null);
            }

            if (uploadedDocument) {
                try {
                    const buffer = uploadedDocument;
                    const response = await fetch('/api/assistant/files/extract', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                        },
                        body: buffer,
                    });
                    const extractedText = await response.json();
                    console.log('Extracted Text:', extractedText);

                    messageToSend = `${userTextMessage}\n\nExtracted text from document: X"${extractedText.text}"X`;
                    const cleanMessage = `${userTextMessage}\n\n*Pdf File Attached`;

                    const userMessage: Message = {
                        role: 'user',
                        content: cleanMessage,
                        imageUrls: uploadedImages.length > 0 ? [...uploadedImages] : undefined
                    };

                    setMessages(prev => [...prev, userMessage]);
                    setUploadedDocument(null);
                } catch (error) {
                    // Handle errors
                }
            }

            if (mode === "transcript") {
                messageToSend = `${messageToSend}

If there is no specific date in this transcript use this day of today: ${new Date(Date.now() - 6 * 60 * 60 * 1000)}`;
                console.log('%cAppended date to the prompt', 'color: green; font-weight: bold;');
            }
            const assistantResponse = await createResponse(messageToSend, file_ids_LIST);
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

            setLoading(false);
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
            // Handle errors if needed.
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        // const file = e.target.files?.[0];

        if (currentModel.includes("o1") || currentModel.includes("o3")) {
            toast.info("Please, pick the non o-family model to use the image upload feature.");
            return;
        }
        
        if (uploadedImages.length === 3) {
            toast.error("You can only upload up to 3 images.");
            return;
        }

        if (!e.target.files) return;
        for (const file of e.target.files) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                setUploadedImages(prev => [...prev, imageUrl]);
                console.log(`Image URL: ${imageUrl}`);
            };
            reader.readAsDataURL(file);
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

    // Group conversations for sidebar (desktop view)
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
        todayGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        yesterdayGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        beforeGroup.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        return { todayGroup, yesterdayGroup, beforeGroup };
    };

    const groupedConversations = groupConversations();
    if (initialLoading) return null;

    return (
        <div className="flex flex-col h-screen relative">
            {/* Desktop Sidebar (left) - visible on desktop */}
            <div
                className={`hidden md:flex flex-col fixed top-[63px] bottom-0 left-0 w-64 h-[calc(100vh-63px)] bg-foregroundColor text-white p-4 overflow-y-scroll transition-transform duration-300 z-50 custom-scrollbar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Extra Buttons inside the mobile sliding tab */}
                <div className="mt-4 mb-2 space-y-4">
                    <ModelSelector />

                    <button
                        onClick={() => setShowInstructionsModal(true)}
                        className="bg-black p-2 rounded-full w-full text-center"
                    >
                        Edit AI Instructions✍️
                    </button>
                </div>
                {/* <h2 className="text-2xl font-bold mb-4 animate-pulse">Conversations</h2> */}
                {groupedConversations.todayGroup.length > 0 && (
                    <div className="my-4">
                        <h3 className="text-lg font-bold mb-2">Today</h3>
                        <hr className='mb-4' />
                        <ul>
                            {groupedConversations.todayGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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
                        <hr className='mb-4' />
                        <ul>
                            {groupedConversations.yesterdayGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg hover:opacity-90 ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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
                        <hr className='mb-4' />
                        <ul>
                            {groupedConversations.beforeGroup.map((conv) => (
                                <li
                                    key={conv._id}
                                    className={`mb-3 border rounded-lg hover:opacity-90 ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
                {/* Desktop Title (hidden on mobile) */}
                <div className="flex-1 px-12 py-16 mt-4 overflow-y-auto overflow-x-hidden">
                    <div className="mx-auto w-full sm:w-11/12 md:w-8/12 lg:w-8/12 xl:w-1/2">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "user" ? (
                                    <div className="flex flex-row items-start gap-2 mb-8">
                                        <div className="flex flex-col items-end">
                                            {msg.imageUrls && msg.imageUrls.length > 0 && (
                                                <div className="mb-2 space-y-2">
                                                    {msg.imageUrls.map((url, index) => (
                                                        <img
                                                            key={index}
                                                            src={url}
                                                            alt="Uploaded"
                                                            className="rounded-xl w-40 sm:w-48 md:w-72 lg:w-96 xl:w-72 h-auto"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {msg.content && (
                                                <div className="px-4 py-2 rounded-3xl rounded-tr-none whitespace-pre-wrap break-words bg-foregroundColor text-white">
                                                    {msg.content}
                                                </div>
                                            )}
                                            {msg.isImage && (
                                                <div className="px-4 py-2 rounded-3xl rounded-tr-none whitespace-pre-wrap break-words text-white">
                                                    <img
                                                        src="awesome_image_placeholder.png"
                                                        className="rounded-xl w-40 sm:w-48 md:w-72 lg:w-96 xl:w-72 h-auto"
                                                        alt="Awesome image"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <img
                                            src="/user-avatar.jpg"
                                            alt="User"
                                            className="w-8 h-8 rounded-full mb-1"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-row items-start gap-2 mb-8">
                                        <img
                                            src="/assistant-avatar.png"
                                            alt="Assistant"
                                            className="w-8 h-8 rounded-full mb-1"
                                        />
                                            <div className="max-w-2xl w-full px-4 py-2 rounded-3xl whitespace-pre-wrap break-all text-white leading-relaxed">
                                            {msg.imageUrls && msg.imageUrls.length > 0 && (
                                                <div className="mb-2 space-y-2">
                                                    {msg.imageUrls.map((url, index) => (
                                                        <img
                                                            key={index}
                                                            src={url}
                                                            alt="Uploaded"
                                                            className="max-w-xs rounded-lg"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                                <ReactMarkdown
                                                    components={{
                                                        code({
                                                            node,
                                                            inline,
                                                            className,
                                                            children,
                                                            ...props
                                                        }: {
                                                            node?: any; // Mark node as optional
                                                            inline?: boolean;
                                                            className?: string;
                                                            children?: React.ReactNode;
                                                            [x: string]: any;
                                                        }) {
                                                            return !inline ? (
                                                                <pre
                                                                    className="overflow-x-auto rounded-2xl whitespace-pre-wrap break-all p-2 bg-gray-800 rounded my-2"
                                                                    {...(props as React.HTMLAttributes<HTMLPreElement>)}
                                                                >
                                                                    <code className={className}>{children}</code>
                                                                </pre>
                                                            ) : (
                                                                <code className="bg-gray-800 text-white p-1 rounded" {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        },
                                                    }}
                                                >
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
                            </div>
                        ))}
                        {loading && mode === "casual" && (
                            <div className="mb-4 ml-2 flex justify-start">
                                <div className="max-w-xs px-4 py-2 rounded-3xl flex items-center">
                                    <img
                                        src="/loading-gif.gif"
                                        alt="Loading..."
                                        className="w-6 h-6"
                                    />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Form with Mode Selector */}
                {(messages.length === 0 && showInitialInput && !firstPressedSend) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <h2 className="text-white mb-8 text-2xl sm:text-3xl animate-pulse font-bold">
                            How can I help you today?
                        </h2>
                        <form onSubmit={handleSubmit} className="w-4/5 max-w-3xl p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl">
                            <div className="flex">
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                    placeholder={mode !== 'casual' ? 'Hi Bami! Please, provide the transcription of your meeting...' : 'Hi, Bami! Type your message here...'}
                                    className={`flex-1 max-h-72 min-h-12 mr-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? 'resize-y' : 'resize-none'}`}
                                    style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                />
                            </div>
                            {/* Upload Buttons for Casual mode */}
                            {mode === 'casual' && (
                                <div className="flex items-center justify-center space-x-4">
                                    {!uploadedAudio && !uploadedDocument && (
                                        <div className="flex flex-col justify-center items-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                                style={{ display: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-3xl"
                                            >
                                                <FontAwesomeIcon icon={faImage} size="lg" />
                                            </button>
                                            {uploadedImages.length > 0 && (
                                                <div className="mt-4 flex space-x-2">
                                                    {uploadedImages.map((img, index) => (
                                                        <div key={index} className="relative">
                                                            <img src={img} alt="Uploaded" className="w-24 h-24 rounded-lg" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeUploadedImage(index)}
                                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 text-xs"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!uploadedImages.length && !uploadedAudio && (
                                        <div className="flex flex-col justify-center items-center">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt"
                                                ref={documentInputRef}
                                                onChange={handleDocumentChange}
                                                style={{ display: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => documentInputRef.current?.click()}
                                                className="bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-3xl"
                                            >
                                                <FontAwesomeIcon icon={faFile} size="lg" />
                                            </button>
                                            {uploadedDocument && (
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <span className="text-white text-xs">
                                                        Doc: {uploadedDocument.name.slice(0, 10)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={removeUploadedDocument}
                                                        className="bg-red-600 text-white rounded-full p-0.5 text-xs"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!uploadedImages.length && !uploadedDocument && (
                                        <div className="flex flex-col justify-center items-center">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                ref={videoInputRef}
                                                onChange={handleVideoChange}
                                                style={{ display: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => videoInputRef.current?.click()}
                                                className="bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-3xl"
                                            >
                                                <FontAwesomeIcon icon={faVideo} size="lg" />
                                            </button>
                                            {uploadedVideo && (
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <span className="text-white">
                                                        Video Selected: {uploadedVideo.name.slice(0, 10)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={removeUploadedVideo}
                                                        className="bg-red-600 text-white rounded-full p-0.5 text-xs"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!uploadedImages.length && !uploadedDocument && (
                                        <div className="flex flex-col justify-center items-center">
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                ref={audioInputRef}
                                                onChange={handleAudioChange}
                                                style={{ display: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => audioInputRef.current?.click()}
                                                className="bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-3xl"
                                            >
                                                <FontAwesomeIcon icon={faMicrophone} size="lg" />
                                            </button>
                                            {uploadedAudio && (
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <span className="text-white">Audio Selected: {uploadedAudio.name.slice(0, 10)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={removeUploadedAudio}
                                                        className="bg-red-600 text-white rounded-full p-0.5 text-xs"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="my-4 relative">
                                <div className="w-full flex flex-col sm:flex-row justify-center gap-2">
                                    <label className="mr-0 text-white font-bold">
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
                                        className="absolute right-0 bg-black text-white px-4 py-2 hover:bg-gray-900 hover:cursor-pointer rounded-3xl disabled:bg-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={(!input.trim() && !uploadedAudio)}
                                    >
                                        {iconLoading ? (
                                            <div className="w-5 h-6 rounded-3xl bg-gray-300 ml-2 animate-pulse"></div>
                                        ) : (
                                            <FontAwesomeIcon icon={faPaperPlane} size="lg" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="sticky bottom-0 w-full">
                        {/* Outer container with full width and background color */}
                        <div className="w-full bg-backgroundColor">
                            <form onSubmit={handleSubmit} className="w-[100%] max-w-3xl mx-auto p-4 border-t bg-foregroundColor border-gray-300 rounded-3xl">
                                <div className="relative w-full flex">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            mode !== 'casual'
                                                ? 'Hi Bami! Please, provide the transcription of your meeting...'
                                                : 'Hi, Bami! Type your message here...'
                                        }
                                        className={`flex-1 max-h-72 mb-20 px-4 bg-foregroundColor text-white py-2 focus:outline-none ${input.length > 100 ? 'resize-y' : 'resize-none'
                                            }`}
                                        style={{ minHeight: '100px', textAlign: 'left' }}
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                        multiple={true}
                                    />

                                    {/* Container for the image upload icon and previews */}
                                    <div className="absolute left-2 bottom-4 flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-full"
                                        >
                                            <FontAwesomeIcon icon={faImage} size="lg" />
                                        </button>

                                        {uploadedImages.length > 0 && (
                                            <div className="flex space-x-2">
                                                {uploadedImages.map((img, index) => (
                                                    <div key={index} className="relative">
                                                        <img
                                                            src={img}
                                                            alt="Uploaded"
                                                            className="w-8 h-8 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeUploadedImage(index)}
                                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 text-xs"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="absolute right-2 bottom-4 bg-black hover:bg-gray-900 hover:cursor-pointer text-white px-4 py-2 rounded-full"
                                        disabled={(!input.trim() && !uploadedAudio)}
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
                    </div>
                )}

                {loading && mode === 'transcript' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-backgroundColor bg-opacity-100">
                        <div className="flex items-center text-white text-2xl font-bold">
                            Analyzing Transcript...
                            <img src="/loading-gif.gif" alt="Loading..." className="w-10 h-10 ml-2" />
                        </div>
                    </div>
                )}

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

            {/* Mobile-only: Right Sliding Tab for Chat History and Extra Buttons */}
            <div
                className={`block md:hidden fixed top-0 bottom-0 right-0 w-64 bg-foregroundColor text-white p-4 transition-transform duration-300 z-50 ${mobileTabOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Extra Buttons inside the mobile sliding tab */}
                <div className="mt-4 mb-2 space-y-4">
                    <ModelSelector />

                    <button
                        onClick={() => setShowInstructionsModal(true)}
                        className="bg-black p-2 rounded-full w-full text-center"
                    >
                        Edit AI Instructions✍️
                    </button>
                </div>
                <h2 className="text-2xl font-bold mb-4">History</h2>
                <div className="overflow-y-scroll h-full">
                    {groupedConversations.todayGroup.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-lg font-bold mb-2">Today</h3>
                            <hr className='mb-4' />
                            <ul>
                                {groupedConversations.todayGroup.map((conv) => (
                                    <li
                                        key={conv._id}
                                        className={`mb-3 border rounded-lg ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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
                                                {new Date(conv.dateAdded).toLocaleString()}
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
                            <hr className='mb-4' />
                            <ul>
                                {groupedConversations.yesterdayGroup.map((conv) => (
                                    <li
                                        key={conv._id}
                                        className={`mb-3 border rounded-lg ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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
                                                {new Date(conv.dateAdded).toLocaleString()}
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
                            <hr className='mb-4' />
                            <ul>
                                {groupedConversations.beforeGroup.map((conv) => (
                                    <li
                                        key={conv._id}
                                        className={`mb-3 border rounded-lg ${conv.thread_id === chatThreadId ? 'bg-gray-900' : ''}`}
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
                                                {new Date(conv.dateAdded).toLocaleString()}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile-only: Toggle Sliding Tab Button (bottom right) */}
            <button
                onClick={() => setMobileTabOpen(prev => !prev)}
                className="fixed top-3 left-2 bg-black hover:bg-gray-900 rounded-full text-white px-4 py-2 z-50 transition-all duration-300"
            >
                {mobileTabOpen ? '<' : '>'}
            </button>

            {/* Desktop-only: Original "Show Tab" button remains unchanged */}
            {showConvosButton && (
                <button
                    onClick={() => setSidebarOpen(prev => !prev)}
                    className="hidden md:block fixed top-3 left-2 bg-black hover:bg-gray-900 rounded-full text-white px-4 py-2 z-50 transition-all duration-300"
                >
                    {sidebarOpen ? '<' : '>'}
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