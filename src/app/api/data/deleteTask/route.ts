import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { id } = await request.json();

    const tasksObjectId = new ObjectId(id);

    const tasksCollection = await getCollection("tasks");
    const transcriptsCollection = await getCollection("transcripts");
    
    const recTask = await tasksCollection?.findOne({"_id": tasksObjectId})

    const related_transcript_record = await transcriptsCollection?.findOne({"_id": new ObjectId(recTask?.related_transcript_record_id)})

    const newTasksList = related_transcript_record?.idsOfInsertedTasks.filter(
        (id: any) => id.toString() !== tasksObjectId.toString()
    )
    
    console.log(`New Tasks List: ${JSON.stringify(newTasksList)}`)
    
    await transcriptsCollection?.updateOne({"_id": recTask?.related_transcript_record_id}, { "$set": {"idsOfInsertedTasks": newTasksList} })
    
    const del_res = await tasksCollection?.deleteOne({"_id": tasksObjectId})

    if (del_res) { 
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ success: false });
    }
}