import { deepseek as openai } from "@/lib/utils/deepseek_stuff";
import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const writeFile = promisify(fs.writeFile);
const unlinkFile = promisify(fs.unlink);

// Use Vercel's /tmp directory in production; local tmp folder in development
const tempUploadDir = IS_DEVELOPMENT ? path.join(process.cwd(), 'tmp') : "/tmp";
console.log("Temp Upload Dir:", tempUploadDir);

export async function POST(req) {
    const data = await req.formData();
    const audioFiles = [];

    // Extract all audio files dynamically from FormData keys (e.g., audio[0], audio[1])
    for (const key of data.keys()) {
        if (key.startsWith("audio")) {
            const file = data.get(key);
            audioFiles.push(file);
        }
    }

    console.log(`Received ${audioFiles.length} audio files`);

    if (audioFiles.length === 0) {
        return NextResponse.json({ success: false, error: "No audio files uploaded" }, { status: 400 });
    }

    const responses_ids = [];

    try {

        let transcription;
        for (const file of audioFiles) {
            if (!file) continue;

            // Generate a unique file name using Date.now() and Math.random()
            const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
            const tempFilePath = path.join(tempUploadDir, `${uniqueSuffix}-${file.name}`);

            // Write the audio file to temporary storage
            await writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));

            // Create a read stream from the temporary file
            const fileStream = fs.createReadStream(tempFilePath);

            // Upload the audio file to OpenAI (adjust the purpose if needed)
            transcription = await openai.audio.transcriptions.create({
                file: fileStream,
                model: "gpt-4o-transcribe",
            });

            // Delete the temporary file
            await unlinkFile(tempFilePath);
        }
        return NextResponse.json({ success: true, transcription: transcription.text });
    } catch (error) {
        console.error("Error uploading audio to OpenAI:", error);
        return NextResponse.json({ success: false, error: error.toString() }, { status: 500 });
    }
}
