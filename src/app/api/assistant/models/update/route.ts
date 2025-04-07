// app/api/assistant/models/update/route.ts

import { NextResponse } from 'next/server';
import { deepseek as openai } from "@/lib/utils/deepseek_stuff";

export async function POST(req: Request) {
    try {
        const { model_id } = await req.json();
        if (!model_id) {
            return NextResponse.json(
                { error: 'Missing model_id in request body' },
                { status: 400 }
            );
        }



        let assistantId_1 = process.env.CASUAL_CONVERSATION_ASSISTANT_ID || "assistant-1";
        
        let assistantId_2 = process.env.TRANSCRIPT_ANALYZER_ASSISTANT_ID || "assistant-2";
        
        let updatedAssistant1;
        let updatedAssistant2;

        const updateParams = {
            model: model_id,
            ...(model_id.includes("o1") || model_id.includes("o3")
                ? { reasoning_effort: "medium", temperature: null, top_p: null }
                : { reasoning_effort: null }
            ),
        } as any;

        // Then update both assistants using the same updateParams:
        updatedAssistant1 = await openai.beta.assistants.update(assistantId_1, updateParams);
        updatedAssistant2 = await openai.beta.assistants.update(assistantId_2, updateParams);
        
        /*
        // @ts-ignore
        if (model_id.includes("o1") || model_id.includes("o3")) {
           
            updatedAssistant1 = await openai.beta.assistants.update(assistantId_1, {
                model: model_id,
                reasoning_effort: "medium",
                temperature: null,
                top_p: null
            });

            updatedAssistant2 = await openai.beta.assistants.update(assistantId_2, {
                model: model_id,
                reasoning_effort: "medium",
                temperature: null,
                top_p: null
            });
        } else {
            updatedAssistant1 = await openai.beta.assistants.update(assistantId_1, {
                model: model_id,
                reasoning_effort: null
            });

            updatedAssistant2 = await openai.beta.assistants.update(assistantId_2, {
                model: model_id,
                reasoning_effort: null
            });
        }
        */

        return NextResponse.json(updatedAssistant1, { status: 200 });
    } catch (error: any) {
        console.error("Error updating assistant model:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}