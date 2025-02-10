import { getCollection } from '@/lib/mongodb';
import { NextResponse } from 'next/server';


export async function GET(request: Request) {
    try {
        const convs_collection = await getCollection("conversations");

        const all_convs = await convs_collection?.find().toArray()

        console.log(`All convs: ${JSON.stringify(all_convs)} and ${all_convs}`)
        
        return NextResponse.json(all_convs);
    } catch (error) {
        console.error('Error in /api/conversation/retrieve:', error);
        return NextResponse.json(
            { error: 'Something went wrong processing your request.' },
            { status: 500 }
        );
    }
}