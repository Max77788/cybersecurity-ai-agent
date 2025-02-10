import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();
import { v4 as uuid } from 'uuid';
import { ObjectId } from 'mongodb';

import { DateTime } from "luxon";

import { getCollection } from '../mongodb';


const resend = new Resend(process.env.RESEND_API_KEY);
// const RECIPIENT_EMAIL = 'mmatronin@gmail.com';
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'bdeleoa@gmail.com';

export async function sendEmail(task: string, time: string) {
    const date = new Date(time);

    const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        // timeZone: 'UTC' // Optional: Adjust as needed
    });
    
    try {
        const data = await resend.emails.send({
            from: 'Max Mat <contact@maxmat.biz>', // Ensure the 'from' field includes a valid email address
            to: RECIPIENT_EMAIL,
            subject: `Task Reminder - ${task.substring(0, 10)}${task.length > 10 ? '...' : ''} | ${uuid().slice(0, 4)}`,
            html: `
        <p>Hi Bamidele,</p>
        <p>This is a reminder that you are supposed to complete <strong>${task}</strong> by <strong>${formattedDate}</strong>.</p>
        <p>Best regards,<br/>Your CS AI Agent</p>
      `,
        });
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export async function sendConfirmationEmail(number_of_tasks: number) {
    try {
        let now = new Date();

        now.setHours(now.getHours() - 6);
        
        const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(now);
        
        const data = await resend.emails.send({
            from: 'Max <contact@maxmat.biz>', // Ensure the 'from' field includes a valid email address
            to: RECIPIENT_EMAIL,
            subject: `Task Reminder - Confirmation | ${uuid().slice(0, 4)}`,
            html: `
        <p>Hi Bamidele,</p>
        <p>This is a confirmation that <strong>${number_of_tasks} tasks</strong> has been successfully added on ${formattedDate}.</p>
        <p>Best regards,<br/>Your CS AI Agent & Max</p>
      `,
        });
    } catch (error) {
        console.error('Error sending email:', error);
    }
}



export async function saveTranscriptAndTasks(transcript: string, tasks: any[], unique_id: string) {
    const tasksCollection = await getCollection("tasks");
    const collection = await getCollection("transcripts");
    
    const idsOfInsertedTasks: any[] = [];

    const empty_transcript = await collection?.insertOne({});

    tasks = tasks.map(task => ({ ...task, start_datetime: new Date(Date.parse(task.start_datetime)), end_datetime: new Date(Date.parse(task.end_datetime)), sent: false, completed: false, related_transcript_record_id: empty_transcript?.insertedId }))
    
    for (const task of tasks) {
        const result = await tasksCollection?.insertOne(task);
        idsOfInsertedTasks.push(result?.insertedId);
    };
    
    const transcript_to_insert = {
        transcript: transcript,
        idsOfInsertedTasks: idsOfInsertedTasks,
        unique_id: unique_id,
        dateAdded: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }

    const result1 = await collection?.updateOne({ "_id": empty_transcript?.insertedId }, { "$set": transcript_to_insert });

    if (result1?.upsertedId) {
        console.log('Document inserted with ID:', result1?.upsertedId);
        return true;
    } else {
        return false;
    }
}


export async function getInsertionStatus(unique_id: string) {
    const collection = await getCollection("transcripts");

    console.log(`Collection is working: ${collection}`)
    
    const result1 = await collection?.findOne({ unique_id: unique_id });

    return { inserted: result1 !== null, record: result1 }
}



export async function getAllData() {
    // const collectionTasks = await getCollection("tasks");
    const collectionTranscripts = await getCollection("transcripts");
    
    const allTranscripts = await collectionTranscripts?.find().sort({ dateAdded: -1 }).limit(100).toArray();

    // const allTasks = await collectionTasks?.find().limit(100).toArray();
    // const allTranscripts = await collectionTranscripts?.find().toArray();
    
    return allTranscripts;
}

export async function getTasksByIds(list_of_ids:string[]) {
   const collectionTasks = await getCollection("tasks");

   const objectIds = list_of_ids.map(id => new ObjectId(id));

   const tasksToReturn = await collectionTasks?.find({ _id: { $in: objectIds }}).toArray();

   return tasksToReturn;
}

export async function getTodaysTasks() {
    const collectionTasks = await getCollection("tasks");

    const now = DateTime.now().setZone("America/Chicago"); // Adjust to a city in GMT-6
    const startOfDay = now.startOf("day").toJSDate();
    const endOfDay = now.endOf("day").toJSDate();

    const tasksToday = await collectionTasks?.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).toArray();

    return tasksToday;
}