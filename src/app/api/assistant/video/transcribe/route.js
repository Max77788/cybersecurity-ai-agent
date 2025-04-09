import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

import { extractTranscriptFromVideo } from "@/lib/functions";

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const writeFile = promisify(fs.writeFile);
const unlinkFile = promisify(fs.unlink);

// Use Vercel's /tmp directory in production; local tmp folder in development
const tempUploadDir = IS_DEVELOPMENT ? path.join(process.cwd(), 'tmp') : "/tmp";
console.log("Temp Upload Dir:", tempUploadDir);

export async function POST(req) {
    const data = await req.formData();
    const videoFiles = [];

    console.log("Received form data on /video/extract:", data);

    // Extract all audio files dynamically from FormData keys (e.g., audio[0], audio[1])
    for (const key of data.keys()) {
        if (key.startsWith("video")) {
            const file = data.get(key);
            videoFiles.push(file);
        }
    }

    console.log(`Received ${videoFiles.length} video files of type ${typeof videoFiles[0]}`);

    if (videoFiles.length === 0) {
        return NextResponse.json({ success: false, error: "No audio files uploaded" }, { status: 400 });
    }

    const responses_ids = [];

    let transcriptionText;

    try {
        for (const file of videoFiles) {
            if (!file) continue;

            console.log("Processing file:", file.name);

            console.log(Object.keys(file));
            console.dir(file);
            console.log(Object.getOwnPropertyNames(file));



            // Get the readable stream from the File object
            const stream = file.stream();

            // Convert the stream to a Blob
            const blobFromStream = await new Response(stream).blob();


            transcriptionText = await extractTranscriptFromVideo(blobFromStream);
        }
        return NextResponse.json({ success: true, transcription: transcriptionText });
    } catch (error) {
        console.error("Error transcribing video to OpenAI:", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
