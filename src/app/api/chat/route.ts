import { create_ds_completion } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request
        const { prompt, mode, messagesHistory } = await request.json();

        // Validate input (simple check)
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Invalid prompt provided.' },
                { status: 400 }
            );
        }

        // Call OpenAI (or your AI backend) to generate a response
        const answer = await create_ds_completion(mode, messagesHistory);

        // Return the AI's answer as JSON
        return NextResponse.json({ answer });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        return NextResponse.json(
            { error: 'Something went wrong processing your request.' },
            { status: 500 }
        );
    }
}