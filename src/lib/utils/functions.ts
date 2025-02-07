import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();
import { v4 as uuid } from 'uuid'; 

import { clientPromiseTasksCollection, clientPromiseTranscriptCollection } from '../mongodb';


const resend = new Resend(process.env.RESEND_API_KEY);
const RECIPIENT_EMAIL = 'mmatronin@gmail.com';
// const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'bdeleoa@gmail.com';

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



export async function saveTranscriptAndTasks(transcript: string, tasks: any[]) {
    tasks = tasks.map(task => ({ ...task, start_datetime: new Date(Date.parse(task.start_datetime)), end_datetime: new Date(Date.parse(task.end_datetime)), sent: false }))
    
    const tasksCollection = await clientPromiseTasksCollection;
    const collection = await clientPromiseTranscriptCollection;
    
    const idsOfInsertedTasks: any[] = [];
    
    for (const task of tasks) {
        const result = await tasksCollection.insertOne(task);
        idsOfInsertedTasks.push(result.insertedId);
    };
    
    const transcript_to_insert = {
        transcript: transcript,
        idsOfInsertedTasks: idsOfInsertedTasks,
        dateAdded: new Date()
    }

    const result1 = await collection.insertOne(transcript_to_insert);

    if (result1?.insertedId) {
        console.log('Document inserted with ID:', result1.insertedId);
        return true;
    } else {
        return false;
    }
}

export async function getTodaysTasks() {
    const collection = await clientPromiseTasksCollection;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to start of the day

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set time to start of next day

    const result = await collection.find({
        start_datetime: { $gte: today, $lt: tomorrow }
    }).toArray();

    /*
    // Convert to a primitive array of action_items
    const actionItemsArray = result.flatMap(item =>
        item.tasks.map((task: any) => ({
            id: item._id,
            action_item: task.action_item,
            start_datetime: task.start_datetime,
            end_datetime: task.end_datetime,
            sent: task.sent ?? false // Ensure `sent` is always present
        }))
    );
    */

    return result;
}