"use client";

export default function OpenHomeButton() {
    return (
        <button
            className="bg-black sm:bg-white text-black px-3 py-2 rounded-full shadow-md hover:bg-gray-200"
            onClick={() => {
                const url = window.location.origin + window.location.pathname;
                window.location.href = "/";
            }}
        >
            <span className="hidden sm:inline">+ New Chat</span>
            <span className="inline sm:hidden text-white">+ 💬</span>
        </button>
    );
}
