import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { update_memory, returnUpdateMemoryPrompt } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const assistantId = process.env.CASUAL_CONVERSATION_ASSISTANT_ID;
    if (!assistantId) {
        return NextResponse.json(
            { error: "CASUAL_CONVERSATION_ASSISTANT_ID is not defined" },
            { status: 500 }
        );
    }

    console.log("Started updating memory...")

    const { threadId } = await req.json();

    const messages = await openai.beta.threads.messages.list(
        threadId
    );

    const listOfMessages = messages.data

    listOfMessages.reverse();

    let messagesHistoryString = "";

    for (const message of listOfMessages) {
        const messageRole = message.role;

        let messageContent = "";
        if ('text' in message.content[0]) {
            messageContent = message.content[0].text.value;
        }
        
        messagesHistoryString += `Role: ${messageRole}\nContent: ${messageContent}\n\n`;
    }

    const assistant = await openai.beta.assistants.retrieve(assistantId);

    // Assuming the assistant object has an 'instructions' attribute:
    const rawInstructions = assistant.instructions;

    const instructions = rawInstructions?.split("DYNAMIC MEMORY:")[0] || "";
    const currentMemory = rawInstructions?.split("DYNAMIC MEMORY:")[1] || "";

    console.log(`Instructions: ${instructions}\n\n\nCurrent Memory: ${currentMemory}\n\n\nMessages History: ${messagesHistoryString}`);

    const formedPrompt = returnUpdateMemoryPrompt(currentMemory, messagesHistoryString, instructions);
    
    const result = await update_memory(formedPrompt, instructions);

    console.log(`Memory updated: ${result}`);

    return NextResponse.json({ was_memory_updated: result });
}
