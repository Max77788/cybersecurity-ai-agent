import { getTodaysTasks } from "@/lib/utils/functions";
import { NextResponse } from 'next/server';
import { sendEmail } from "@/lib/utils/functions";
import { getCollection } from "@/lib/mongodb";

export async function GET(request: Request) {
    try {
        // Get all transcripts and tasks
        const tasks = await getTodaysTasks();

        console.log('Tasks: ', JSON.stringify(tasks));

        if (!tasks) {
            return NextResponse.json(
                { error: 'No tasks for now - chillin...' },
                { status: 200 }
            );
        }

        let filtered_tasks: any[] = [];

        tasks.forEach((task: any) => {
            filtered_tasks = tasks.filter((task: any) => !task.sent);
        });

        let date = new Date();
        date.setHours(date.getHours() - 6);

        const thresholdTime = new Date(date);
        thresholdTime.setMinutes(thresholdTime.getMinutes() + 5);

        const collection = await getCollection("tasks");

        for (const task of filtered_tasks) {
            if (task.start_datetime <= thresholdTime) {
                sendEmail(task.action_item, task.end_datetime);
                
                // task.sent = true;
                await collection?.updateOne(
                    { _id: task._id },
                    { $set: { sent: true } }
                );
            }
        };
        
        // Return the transcripts and tasks as JSON
        return NextResponse.json({ tasks });
    } catch (error) {
        console.error('Error in /api/get-transcripts-tasks:', error);
        return NextResponse.json(
            { error: 'Something went wrong processing your request.' },
            { status: 500 }
        );
    }
}