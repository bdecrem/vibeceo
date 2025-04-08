import OpenAI from 'openai';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../../.env.local') });
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export async function generateCharacterResponse(prompt, userMessage) {
    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
            temperature: 0.7,
        });
        return response.choices[0].message.content || 'Sorry, I could not generate a response.';
    }
    catch (error) {
        console.error('Error generating AI response:', error);
        throw new Error('Failed to generate character response');
    }
}
