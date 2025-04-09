export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/functions';
// import pdf from 'pdf-parse';

export async function POST(request) {
    try {
        // Read the raw request body as an ArrayBuffer
        const rawBody = await request.arrayBuffer();

        // Convert the ArrayBuffer to a Node.js Buffer
        const buffer = Buffer.from(rawBody);

        // Extract text from the PDF using pdf-parse
        const extractedText = await extractDocumentText(buffer);

        console.log('Extracted text:', extractedText);

        return NextResponse.json({ text: extractedText }, { status: 200 });
    } catch (error) {
        console.error('Error in extraction API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}