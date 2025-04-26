import OpenAI from 'openai';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local in project root
config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCharacterResponse(prompt: string, userMessage: string): Promise<string> {
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
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate character response');
  }
} 