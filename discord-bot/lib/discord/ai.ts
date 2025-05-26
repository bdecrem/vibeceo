import OpenAI from "openai";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in project root
config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not set in environment variables");
}

export const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCharacterResponse(
	prompt: string,
	userMessage: string,
	maxWords?: number
): Promise<string> {
	try {
		// Log the full prompt being sent to GPT
		console.log('=== GPT REQUEST ===');
		console.log('SYSTEM PROMPT:');
		console.log(prompt);
		console.log('\nUSER MESSAGE:');
		console.log(userMessage);
		console.log('===================');

		// Calculate max tokens based on word count (roughly 1.33 tokens per word + buffer)
		const maxTokens = maxWords ? Math.ceil(maxWords * 1.5) : parseInt(process.env.OPENAI_MAX_TOKENS || "1000");

		const response = await openai.chat.completions.create({
			model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: prompt + (maxWords ? `\n\nIMPORTANT: Your response MUST be ${maxWords} words or less. This is a strict requirement.` : ''),
				},
				{
					role: "user",
					content: userMessage,
				},
			],
			max_tokens: maxTokens,
			temperature: 0.7,
		});

		const content = response.choices[0].message.content || "Sorry, I could not generate a response.";
		
		// Log the response
		console.log('=== GPT RESPONSE ===');
		console.log(content);
		console.log('===================');

		return content;
	} catch (error) {
		console.error("Error generating AI response:", error);
		throw new Error("Failed to generate character response");
	}
}
