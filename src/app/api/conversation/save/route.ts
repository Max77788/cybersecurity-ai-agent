import { getCollection } from '@/lib/mongodb';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
    try {
        // Parse the JSON payload from the request
        const { thread_id, chat_name } = await request.json();
        
        // Validate input (simple check)
        if (!thread_id || typeof thread_id !== 'string') {
            return NextResponse.json(
                { error: 'Invalid thread ID provided.' },
                { status: 400 }
            );
        }

        const convs_collection = await getCollection("conversations");

        const new_conv = { thread_id, chat_name, dateAdded: new Date(new Date().getTime() - 6 * 60 * 60 * 1000) }

        // Save the transcript and tasks
        await convs_collection?.insertOne(new_conv)

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in /api/conversation/save:', error);
        return NextResponse.json(
            { error: 'Something went wrong processing your request.' },
            { status: 500 }
        );
    }
}