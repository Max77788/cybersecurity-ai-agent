// /api/chat/post-message-streaming/route.ts
import { create_assistant_run_streaming } from "@/lib/utils/deepseek_stuff";

export async function POST(request: Request) {
    const { userMessage, mode, file_ids_LIST, threadId } = await request.json();

    // 1) kick off the run and get a ReadableStream
    const openaiStream = await create_assistant_run_streaming(userMessage, mode, threadId, file_ids_LIST);
    
    // 2) return it as the HTTP response body
    return new Response(openaiStream.toReadableStream(), {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
