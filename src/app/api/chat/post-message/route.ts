import { create_assistant_run } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { userMessage: prompt, mode, threadId } = await request.json();

    const id_of_run = await create_assistant_run(prompt, mode, threadId)

    return NextResponse.json({ id_of_run });
}

