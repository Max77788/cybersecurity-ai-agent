import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

let assistantId_1 = process.env.CASUAL_CONVERSATION_ASSISTANT_ID || "assistant-1";

export async function GET() {

    try {
        const myAssistant = await openai.beta.assistants.retrieve(
            assistantId_1
        );

        return NextResponse.json({ current_model_id: myAssistant.model });
    } catch (error) {
        console.error("Error retrieving models:", error);
        return NextResponse.json(
            { error: "Failed to retrieve models" },
            { status: 500 }
        );
    }
}
