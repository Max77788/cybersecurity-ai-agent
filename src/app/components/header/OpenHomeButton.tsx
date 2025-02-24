"use client";

export default function OpenHomeButton() {
    return (
        <button
            className="bg-white text-black px-3 py-2 rounded-full shadow-md hover:bg-gray-200"
            onClick={() => {
                const url = window.location.origin + window.location.pathname;
                window.location.href = url;
            }}
        >
            + New Chat
        </button>
    );
}
