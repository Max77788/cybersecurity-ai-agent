import { retrieve_last_response } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { threadId, mode } = await request.json();

    const response = await retrieve_last_response(threadId, mode)

    console.log(`Response returned: ${response} of type ${typeof response}`)

    return NextResponse.json({ response });
}

