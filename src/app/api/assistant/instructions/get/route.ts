import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function GET() {
    const assistantId = process.env.CASUAL_CONVERSATION_ASSISTANT_ID;
    if (!assistantId) {
        return NextResponse.json(
            { error: "CASUAL_CONVERSATION_ASSISTANT_ID is not defined" },
            { status: 500 }
        );
    }

    try {
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        console.log(`Retrieved assistant: ${JSON.stringify(assistant)}`);

        // Assuming the assistant object has an 'instructions' attribute:
        const rawInstructions = assistant.instructions;

        console.log(`Raw Instructions: ${rawInstructions}`);

        const instructions = rawInstructions?.split("DYNAMIC MEMORY:")[0] || "";
        const currentMemory = rawInstructions?.split("DYNAMIC MEMORY:")[1] || "";

        return NextResponse.json({ instructions, currentMemory });
    } catch (error) {
        console.error("Error retrieving assistant:", error);
        return NextResponse.json(
            { error: "Failed to retrieve assistant" },
            { status: 500 }
        );
    }
}
