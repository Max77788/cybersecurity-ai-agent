import { getTasksByIds } from "@/lib/utils/functions";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { tasks_ids } = await request.json();
    
    const tasks_to_return = await getTasksByIds(tasks_ids)

    return NextResponse.json({ tasks_to_return });
}