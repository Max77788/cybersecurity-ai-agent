import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const assistantId = process.env.CASUAL_CONVERSATION_ASSISTANT_ID;
    if (!assistantId) {
        return NextResponse.json(
            { error: "CASUAL_CONVERSATION_ASSISTANT_ID is not defined" },
            { status: 500 }
        );
    }

    const { newInstructions, newMemory } = await req.json();

    const instructionsToSet = `
    ${newInstructions}

    DYNAMIC MEMORY:
    ${newMemory}
    `

    try {
        const assistant = await openai.beta.assistants.update(
            assistantId,
            {
                instructions: instructionsToSet
            }
        );
        console.log(`Retrieved assistant: ${JSON.stringify(assistant)}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error retrieving assistant:", error);
        return NextResponse.json(
            { error: "Failed to retrieve assistant" },
            { status: 500 }
        );
    }
}
