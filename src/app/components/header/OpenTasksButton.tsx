"use client";

export default function OpenTasksButton() {
    return (
        <button
            className="bg-white text-black px-3 py-2 rounded-full shadow-md hover:bg-gray-200"
            onClick={() => window.open('/tasks', '_blank')}
        >
            Tasks👆
        </button>
    );
}
