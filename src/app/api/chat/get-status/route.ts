import { retrieve_assistant_run } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { thread_id, id_of_run } = await request.json();

    const run_completed = await retrieve_assistant_run(thread_id, id_of_run)

    return NextResponse.json({ run_completed });
}

