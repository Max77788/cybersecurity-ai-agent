import { deepseek as openai } from "@/lib/utils/deepseek_stuff";

import { NextResponse } from "next/server";
import { Readable } from 'stream';
import { File } from '@web-std/file';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';

import { dotenv } from 'dotenv';
dotenv.config();

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const writeFile = promisify(fs.writeFile);
const tempUploadDir = IS_DEVELOPMENT ? path.join(process.cwd(), 'tmp') : "/tmp"; // Temporary storage folder

console.log("Temp Upload Dir:", tempUploadDir);

export async function POST(req) {
    console.log(req);
    
    const data = await req.formData();

    const files = [];

    // Extract all files dynamically from FormData
    for (const key of data.keys()) {
        if (key.startsWith("images[")) { // Match keys like images[0], images[1]
            const file = data.get(key);
            files.push(file);
        }
    };

    if (files.length === 0) {
        return NextResponse.json({ success: false, error: "No files uploaded" }, { status: 400 });
    }
    
    const responses_ids = [];

    console.log("Files:", files);

    try {
        for (const file of files) {
            // if (!file || !(file instanceof File)) continue;

            // Generate a unique file name to avoid collisions
            const uniqueSuffix = crypto.randomBytes(6).toString('hex');
            const tempFilePath = path.join(tempUploadDir, `${uniqueSuffix}-${file.name}`);

            // Write file to temporary storage
            await writeFile(tempFilePath, Buffer.from(await (file).arrayBuffer()));

            // Use fs.createReadStream
            const fileStream = fs.createReadStream(tempFilePath);

            // Upload file to OpenAI
            const response = await openai.files.create({
                file: fileStream,
                purpose: "assistants",
            });

            responses_ids.push(response.id);

            // Delete the temporary file
            fs.unlinkSync(tempFilePath);
        }
        return NextResponse.json({ success: true, file_ids_list: responses_ids });
    } catch (error) {
        console.error("Error uploading to OpenAI:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}