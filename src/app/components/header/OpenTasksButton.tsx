"use client";

export default function OpenTasksButton() {
    return (
        <button
            className="bg-white text-black px-3 py-2 rounded-full shadow-md hover:bg-gray-200"
            onClick={() => window.open('/tasks', '_blank')}
        >
            <span className="hidden sm:inline">Tasks👆</span>
            <span className="inline sm:hidden">📝</span>
        </button>

    );
}
