import { getInsertionStatus } from "@/lib/utils/functions";
import { sendConfirmationEmail } from "@/lib/utils/functions";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const unique_id = url.searchParams.get('unique_id') || '';
    
    if (!unique_id) {
        return NextResponse.json({ success: false, error: "Missing unique_id" }, { status: 400 });
    }
    
    const { inserted, record } = await getInsertionStatus(unique_id);

    await sendConfirmationEmail(record?.idsOfInsertedTasks.length);

    return NextResponse.json({ success: inserted });
}