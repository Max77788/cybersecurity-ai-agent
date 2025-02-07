import { saveTranscriptAndTasks } from "@/lib/utils/functions";
import { sendConfirmationEmail } from "@/lib/utils/functions";
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request
        const { transcript_text, tasks_times } = await request.json();

        console.log(JSON.stringify(transcript_text), JSON.stringify(tasks_times));
        
        // Validate input (simple check)
        if (!transcript_text || typeof transcript_text !== 'string') {
            return NextResponse.json(
                { error: 'Invalid prompt provided.' },
                { status: 400 }
            );
        }

        // Save the transcript and tasks
        const success = await saveTranscriptAndTasks(transcript_text, tasks_times);

        // Return the AI's answer as JSON
        if (success) {
            await sendConfirmationEmail(tasks_times.length);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save transcript and tasks.' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in /api/chat:', error);
        return NextResponse.json(
            { error: 'Something went wrong processing your request.' },
            { status: 500 }
        );
    }
}