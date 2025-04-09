import PDFParser from 'pdf2json';
import { Readable } from 'stream';

import { deepseek as openai } from "@/lib/utils/deepseek_stuff";

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Promisify file system functions
const writeFile = promisify(fs.writeFile);
const unlinkFile = promisify(fs.unlink);

// Determine temporary upload directory.
// Use local tmp folder in development; Vercel’s /tmp directory in production.
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const tempUploadDir = IS_DEVELOPMENT ? path.join(process.cwd(), 'tmp') : "/tmp";
console.log("Temp Upload Dir:", tempUploadDir);

export async function extractDocumentText(uploadedDocument) {
    return new Promise((resolve, reject) => {
        try {
            // Ensure uploadedDocument is a Node.js Buffer.
            const buffer =
                uploadedDocument instanceof Buffer
                    ? uploadedDocument
                    : Buffer.from(uploadedDocument);

            console.log(`Buffer size: ${buffer.byteLength} bytes`);

            const pdfParser = new PDFParser();

            pdfParser.on("pdfParser_dataError", (errData) => {
                console.error("Error during PDF parsing:", errData.parserError);
                reject(errData.parserError);
            });

            pdfParser.on("pdfParser_dataReady", (pdfData) => {
                let extractedText = "";
                console.log("PDF data ready:", JSON.stringify(pdfData));

                // Check for both possible page properties.
                const pages =
                    (pdfData.formImage && Array.isArray(pdfData.formImage.Pages)
                        ? pdfData.formImage.Pages
                        : pdfData.Pages) || [];

                pages.forEach((page) => {
                    if (page.Texts && Array.isArray(page.Texts)) {
                        page.Texts.forEach((textItem) => {
                            if (textItem.R && Array.isArray(textItem.R)) {
                                textItem.R.forEach((item) => {
                                    // Decode the URL-encoded text; use empty string if missing.
                                    extractedText += decodeURIComponent(item.T || "") + " ";
                                });
                            }
                        });
                    }
                    extractedText += "\n";
                });

                // Remove extra spaces between letters (i.e. join letters that are separated by spaces).
                extractedText = extractedText.replace(/(?<=\w)\s+(?=\w)/g, '');

                const finalText = extractedText.trim();
                console.log("Extracted text:", finalText);
                resolve(finalText);
            });

            // Parse the buffer.
            pdfParser.parseBuffer(buffer);
        } catch (error) {
            console.error("Error during PDF parsing:", error);
            reject(error);
        }
    });
}

export async function extractTranscriptFromVideo(uploadedVideoBinary, video_duration_in_secs=100) {
    // console.log(`uploadedVideoBinary in function: ${JSON.stringify(uploadedVideoBinary)}`);
    
    const blob = new Blob([uploadedVideoBinary], { type: 'video/mp4' });
    
    const form = new FormData();
    form.append('video', uploadedVideoBinary, `sample-${Math.floor(Math.random() * 1e6)}.mp4`);
    form.append('start_time', '0');
    form.append('duration', video_duration_in_secs.toString());
    form.append('output_format', 'mp3');

    // --- Step 1: POST FormData to get direct download URL for the audio file ---
    const audioResponse = await fetch('https://api.apyhub.com/extract/video/audio/file/url?output=test-sample', {
        method: 'POST',
        headers: {
            'apy-token': 'APY0iUB9Z9Fsa1K92i8hUEzeab7ohjAIw1AO8C0jp0OrzbkIUU3DPArzCFj1ObVbfaTcVcFkTRuikd'
            // Do not set Content-Type when using FormData.
        },
        body: form  // <-- your previously prepared FormData
    });
    console.log("Audio file response:", audioResponse);

    // --- Step 2: Parse JSON response to extract the download URL ---
    const jsonResponse = await audioResponse.json();
    console.log("JSON response:", jsonResponse);

    const downloadUrl = jsonResponse.data; // Assumes 'data' contains the direct download URL.
    console.log("Download URL:", downloadUrl);

    // --- Step 3: Download the audio file from the download URL ---
    const audioFileResponse = await fetch(downloadUrl);
    if (!audioFileResponse.ok) {
        throw new Error(`Failed to download file: ${audioFileResponse.status}`);
    }
    // For Node.js (v18+), using arrayBuffer() then converting to Buffer:
    const arrayBuffer = await audioFileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    console.log("File buffer size:", fileBuffer.length);

    // --- Step 4: Save the downloaded file locally ---
    const fileName = `sample_${Date.now()}.mp3`;
    const filePath = path.join(tempUploadDir, fileName);
    await writeFile(filePath, fileBuffer);
    console.log(`Saved file to disk at ${filePath}`);

    // --- Step 5: Create a file stream from the saved file ---
    const fileStream = fs.createReadStream(filePath);

    // --- Step 6: Upload the file to OpenAI for transcription ---
    const transcription = await openai.audio.transcriptions.create({
        file: fileStream,        // Pass the file stream
        model: "gpt-4o-transcribe",
        filename: fileName       // Provide a filename to help identify the file type
    });
    console.log("Transcription:", transcription);

    // --- Step 7: Clean up by deleting the temporary file ---
    await unlinkFile(filePath);
    console.log(`Deleted temporary file: ${filePath}`);


    // You can now use the transcription as needed.
    return transcription.text;
}