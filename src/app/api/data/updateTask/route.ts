import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const updatedTask = await request.json();

    const tasksObjectId = new ObjectId(updatedTask._id);

    const tasksCollection = await getCollection("tasks");

    const filteredObj = Object.fromEntries(
        Object.entries(updatedTask).filter(([key]) => key !== "_id")
      );
      
    
    const upd_res = await tasksCollection?.updateOne({"_id": tasksObjectId}, {"$set": filteredObj})

    if (upd_res) { 
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ success: false });
    }
}