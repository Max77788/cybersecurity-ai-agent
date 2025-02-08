import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function GET() {
    const emptyThread = await openai.beta.threads.create();

    console.log(`Empty thread: ${JSON.stringify(emptyThread)}`)

    return NextResponse.json({ threadId: emptyThread.id });
}

