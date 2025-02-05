import OpenAI from "openai";

const BASE_URL = "https://api.deepseek.com"

const API_KEY = process.env.DEEPSEEK_API_KEY

const SYSTEM_PROMPT = `
You accept the transcription of the work meeting of Bamidele who is very great cybersecurity specialist. 
Your goal is to extract the list of action items from the transcription with the timelines for each one.
`


const openai = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY
});

async function create_ds_completion() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "deepseek-reasoner",
    });

    console.log(completion.choices[0].message.content);
}