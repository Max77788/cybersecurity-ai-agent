import { retrieve_all_messages } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { threadId } = await request.json();

    const responseListok = await retrieve_all_messages(threadId)

    responseListok.reverse();
    
    const response = responseListok;
    
    console.log(`Response returned: ${response} of type ${typeof response}`)

    return NextResponse.json({ response });
}

