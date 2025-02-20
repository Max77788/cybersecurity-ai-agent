'use client';

import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';

interface InstructionsModalProps {
    onSave: (newInstructions: string) => void;
    onClose: () => void;
}

export default function InstructionsModal({ onSave, onClose }: InstructionsModalProps) {
    const [instructions, setInstructions] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Fetch the instructions when the component mounts.
    useEffect(() => {
        async function fetchInstructions() {
            try {
                const res = await fetch('/api/assistant/instructions/get');
                const data = await res.json();
                setInstructions(data.instructions || '');
            } catch (error) {
                console.error('Failed to fetch instructions:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchInstructions();
    }, []);

    const handleSave = async () => {
        onSave(instructions);

        let res = await fetch('/api/assistant/instructions/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newInstructions: instructions }),
        });

        if (res.ok) {
            toast.success("Instructions have been updated successfully!")
        } else {
            toast.error("There was an error updating instructions. Try again later!")
        }

        onClose();
    };

    // Do not render the modal until instructions have been fetched.
    if (isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-backgroundColor p-6 rounded-lg max-w-4xl w-full shadow-lg">
                <h2 className="text-xl text-center font-bold mb-4">Edit CS AI Agent Instructions</h2>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    className="w-full min-h-[10rem] max-h-[40rem] p-2 border border-gray-300 rounded mb-4 bg-foregroundColor text-white resize-none"
                    placeholder="Enter your instructions for the AI agent..."
                />
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black rounded-full hover:bg-gray-400"
                    >
                        🔙Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    >
                        Save💾
                    </button>
                </div>
            </div>
        </div>
    );
}