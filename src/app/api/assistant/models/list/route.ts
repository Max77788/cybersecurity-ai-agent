import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function GET() {

    try {
        // const models = await openai.models.list();

        // let model_ids = models.data.map((model) => model.id);
        
        /*
        let model_ids = [{ model_name: "gpt-4o", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "gpt-4o-mini", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "o1", model_description: "best for accurate mathematical tasks" },
            { model_name: "o3-mini", model_description: "best for accurate mathematical tasks" },
            { model_name: "gpt-4.5-preview", model_description: "best for creative tasks and writing" },
            { model_name: "o3-mini-2025-01-31", model_description: "best for accurate mathematical tasks" },
            { model_name: "o1-2024-12-17", model_description: "best for accurate mathematical tasks" },
            { model_name: "gpt-4o-mini-2024-07-18", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "gpt-4o-2024-11-20", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "gpt-4o-2024-08-06", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "gpt-4o-2024-05-13", model_description: "Golden ratio between speed and intelligence" },
            { model_name: "gpt-4.5-preview-2025-02-27", model_description: "best for creative tasks and writing" },
        ]
        */
        let model_ids = ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "gpt-4.5-preview", "o3-mini-2025-01-31",
            "o1-2024-12-17", "gpt-4o-mini-2024-07-18", "gpt-4o-2024-11-20", "gpt-4o-2024-08-06",
            "gpt-4o-2024-05-13", "gpt-4.5-preview-2025-02-27"
        ];

        return NextResponse.json({ model_ids });
    } catch (error) {
        console.error("Error retrieving models:", error);
        return NextResponse.json(
            { error: "Failed to retrieve models" },
            { status: 500 }
        );
    }
}
