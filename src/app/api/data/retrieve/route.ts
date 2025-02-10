import { getAllData } from "@/lib/utils/functions";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const allTranscripts = await getAllData();
    
    return NextResponse.json({ allTranscripts });
}