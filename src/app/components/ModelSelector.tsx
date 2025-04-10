import { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { set } from 'zod';

export function ModelSelector() {
    const [models, setModels] = useState<
        { model_name: string; model_description: string }[]
    >([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [currentModel, setCurrentModel] = useState('');
    const [currentModelDescription, setCurrentModelDescription] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchModels() {
            try {
                const response = await fetch('/api/assistant/models/list');
                const data = await response.json();
                // Transform the model_ids into objects with descriptions
                const transformed = data.model_ids.map((modelId: string) => {
                    let description = "";
                    if (modelId.includes("gpt-4o")) {
                        description = "Golden ratio between speed and intelligence";
                    } else if (modelId.includes("gpt-4.5")) {
                        description = "best for creative tasks and writing";
                    } else if (modelId.startsWith("o1") || modelId.startsWith("o3")) {
                        description = "best for accurate mathematical tasks";
                    }
                    return { model_name: modelId, model_description: description };
                });
                setModels(transformed);
                if (transformed.length > 0) {
                    setSelectedModel(transformed[0].model_name);
                }
            } catch (error) {
                console.error("Error fetching models:", error);
            }
        }
        fetchModels();
    }, []);

    // Close dropdown if click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = async (model: { model_name: string; model_description: string }) => {
        setSelectedModel(model.model_name);
        setDropdownOpen(false);
        try {
            const res = await fetch('/api/assistant/models/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: model.model_name }),
            });
            if (!res.ok) {
                console.error('Failed to update model');
            }

            if (res.status === 200) {
                setCurrentModel(model.model_name);
                setCurrentModelDescription(model.model_description);

                toast.success(`Model ${model.model_name} has been set successfully!`);
                
                await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait for 2 seconds

                location.reload(); // Reload the page to apply changes
            } else {
                toast.error("There was an error updating model. Try again later!");
            }
        } catch (error) {
            console.error('Error updating model:', error);
        }
    };

    useEffect(() => {
        fetch('/api/assistant/models/get')
            .then((res) => res.json())
            .then((data) => {
                setSelectedModel(data.current_model_id);

                console.log("Current model ID:", data.current_model_id);

                let description = "";
                if (data.current_model_id.includes("gpt-4o-mini")) {
                    description = "best for small lightweight tasks";
                } else if (data.current_model_id.includes("gpt-4o")) {
                    description = "Golden ratio between speed and intelligence";
                }
                else if (data.current_model_id.includes("gpt-4.5")) {
                    description = "best for creative tasks and writing";
                } else if (data.current_model_id.startsWith("o1") || data.current_model_id.startsWith("o3")) {
                    description = "best for accurate mathematical tasks";
                }

                setCurrentModelDescription(description);
            })
            .catch((error) => {
                console.error('Error fetching model:', error);
            });
    }, []);

    // Find the selected model object
    const selectedObj = models.find((m) => m.model_name === selectedModel) || { model_name: "", model_description: "" };

    return (
        <div className="relative inline-block text-left mx-2" ref={dropdownRef}>
            {/* Selected Model Button */}
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex justify-between w-52 rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-black hover:bg-gray-200 focus:outline-none"
            >
                <span>{selectedObj.model_name}</span>
                <svg
                    className="-mr-1 ml-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {dropdownOpen && (
                <>
                    {/* Dropdown List for Desktop */}
                    <div className="hidden sm:block fixed top-[calc(63px+1rem)] left-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 max-h-[calc(100vh-80px)] overflow-y-auto">
                        <div className="py-1">
                            {models.map((model) => (
                                <div
                                    key={model.model_name}
                                    onClick={() => handleSelect(model)}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                    <div className="font-medium text-gray-900">{model.model_name}</div>
                                    <div className="text-xs text-gray-500">{model.model_description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dropdown List for Mobile as Modal */}
                    <div className="block sm:hidden fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="w-[80%] mx-4 bg-white rounded-md shadow-lg">
                            <div className="py-1">
                                {models.map((model) => (
                                    <div
                                        key={model.model_name}
                                        onClick={() => handleSelect(model)}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <div className="font-medium text-gray-900">{model.model_name}</div>
                                        <div className="text-xs text-gray-500">{model.model_description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}