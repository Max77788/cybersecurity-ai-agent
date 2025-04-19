// /api/chat/post-message/route.ts

import { create_assistant_run } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { userMessage: prompt, mode, file_ids_LIST, threadId } = await request.json();

    const id_of_run = await create_assistant_run(prompt, mode, threadId, file_ids_LIST)

    return NextResponse.json({ id_of_run });
}