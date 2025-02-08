import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const Action_Item = z.object({
    action_item: z.string(),
    start_datetime: z.coerce.date(),
    end_datetime: z.coerce.date()
});

const TranscriptSummarizerResponse = z.object({
  nl_answer_to_user: z.string(),
  action_items: z.array(Action_Item)
});

const BASE_URL = "https://api.deepseek.com"

// const API_KEY = process.env.DEEPSEEK_API_KEY
// const API_KEY = process.env.MAXS_DEEPSEEK_API_KEY
// const API_KEY = process.env.MAXS_OPENAI_API_KEY
const API_KEY = process.env.WHOSE_OPENAI_KEY === "MAX" ? process.env.MAXS_OPENAI_API_KEY : process.env.OPENAI_API_KEY

const CASUAL_CONVERSATION_ASSISTANT_ID = process.env.CASUAL_CONVERSATION_ASSISTANT_ID;
const TRANSCRIPT_ANALYZER_ASSISTANT_ID = process.env.TRANSCRIPT_ANALYZER_ASSISTANT_ID;

const SYSTEM_TRANSCRIPT_SUMMARIZER_PROMPT = `
You are provided with a transcription of a work meeting led by Bamidele, a renowned cybersecurity specialist. Your tasks are:

1. **Extract Action Items**: Identify all action items discussed during the meeting.

2. **Assign Timelines**: For each action item, determine the associated timeline or deadline mentioned.

**Output Format**: Return the results as a JSON object structured as follows:

{
  "nl_answer_to_user": "A brief natural language summary for the user including some trivia about the extracted events.",
  "action_items": [
    {
      "action_item": "Description of action item 1",
      "start_datetime": "Start date & time for action item 1",
      "end_datetime": "End date & time for action item 1"
    },
    {
      "action_item": "Description of action item 2",
      "start_datetime": "Start date & time for action item 2",
      "end_datetime": "End date & time for action item 2"
    }
    // Continue for all identified action items
  ]
}
`

const SYSTEM_CASUAL_CONVERSATION_PROMPT = `
You are the assistant of Bamidele, a renowned cybersecurity specialist.
You are having the usual converastion with him. Respond to his messages as you would normally do.
`


export const deepseek = new OpenAI({
    apiKey: API_KEY
});

const openai = deepseek;

export async function create_ds_completion(mode: string, messagesHistory: any[]) {
    
    let SYSTEM_PROMPT = "";

    if (mode === "transcript") {
        console.log("Transcript Summarizer Mode");
        SYSTEM_PROMPT = SYSTEM_TRANSCRIPT_SUMMARIZER_PROMPT;
    } else if (mode === "casual") {
        SYSTEM_PROMPT = SYSTEM_CASUAL_CONVERSATION_PROMPT;
    };

    
    messagesHistory.unshift({ role: "system", content: SYSTEM_PROMPT });
  
    let completion;
    
    if (mode === "transcript_summarizer") {
        completion = await deepseek.chat.completions.create({
            messages: messagesHistory,
            model: "gpt-4o",
            response_format: zodResponseFormat(TranscriptSummarizerResponse, "transcript_summarizer_response")
        },
        );
      } else {
        completion = await deepseek.chat.completions.create({
            messages: messagesHistory,
            model: "gpt-4o"
        },
        );
    }
    

    let response;
    
    response = completion.choices[0].message.content;

     
  
    if (response?.includes("```json")) {
      const cleanJsonString = response.replace(/```json|```/g, '');
      response = JSON.parse(cleanJsonString);
    }
  
    console.log(`Message Returned: ${JSON.stringify(response)} of type ${typeof response}`);
  
    return response;
}


export async function create_assistant_run(prompt: string, mode: string, threadId: string) {

  let ASSISTANT_ID;

  if (mode === "transcript") {
    console.log("Transcript Summarizer Mode");
    ASSISTANT_ID = TRANSCRIPT_ANALYZER_ASSISTANT_ID;
  } else if (mode === "casual") {
    ASSISTANT_ID = CASUAL_CONVERSATION_ASSISTANT_ID;
  }

  if (!ASSISTANT_ID) {
    throw new Error("Assistant ID is required but was not provided");
  }

  await openai.beta.threads.messages.create(
    threadId,
    {
      role: "user",
      content: prompt
    }
  );

  const run = await openai.beta.threads.runs.create(
    threadId,
    { assistant_id: ASSISTANT_ID }
  );

  return run.id
};


export async function retrieve_assistant_run(thread_id:string, run_id: string) {
  const run = await openai.beta.threads.runs.retrieve(
    thread_id,
    run_id
  );

  const run_status = run.status;

  const run_completed = run_status === "completed";

  return run_completed
}

export async function retrieve_last_response(thread_id: string, mode: string) {
  const threadMessages = await openai.beta.threads.messages.list(
    thread_id
  );

  const content = threadMessages.data[0].content[0];
  const lastResponse = content?.type === 'text' ? content.text.value : '';
  
  let response = lastResponse;
  
  if (mode === "transcript") {
    response = JSON.parse(response);
  }
  
  return response;
}


export async function retrieve_all_messages(thread_id: string) {
  const threadMessages = await openai.beta.threads.messages.list(
    thread_id
  );

  const contentList = threadMessages.data;
  
  let listok = [];

  for (const obj of contentList) {
    const content = obj.content[0];
    if (content?.type === 'text') {
      listok.push({role: obj.role, content: content.text.value});
    }
  }

  return listok;
}