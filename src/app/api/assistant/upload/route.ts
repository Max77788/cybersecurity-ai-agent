import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { update_memory, returnUpdateMemoryPrompt } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";
import fs from "fs";

export async function POST(req: Request) {
    const file = await openai.files.create({
        file: fs.createReadStream("mydata.jsonl"),
        purpose: "assistant",
    });
}