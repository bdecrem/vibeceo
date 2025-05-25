import { Message, TextChannel, ThreadChannel } from "discord.js";
import { ceos } from "../../data/ceos.js";
import { generateCharacterResponse } from "./ai.js";
import { sendAsCharacter } from "./webhooks.js";
import { isWeekend } from "./locationTime.js";


// We'll define the CEO type here since we can't use the import
interface CEO {
	id: string;
	name: string;
	prompt: string;
	character: string;
	style: string;
	image: string;
}

// Store active characters for each channel
const activeCharacters = new Map<string, string>();

// Get all available characters
export function getCharacters(): CEO[] {
	return ceos;
}

// Get a specific character by ID
export function getCharacter(id: string): CEO | undefined {
	return ceos.find((ceo) => ceo.id === id.toLowerCase());
}

// Set active character for a channel
export function setActiveCharacter(
	channelId: string,
	characterId: string
): CEO | undefined {
	const character = getCharacter(characterId);
	if (character) {
		activeCharacters.set(channelId, characterId);
		return character;
	}
	return undefined;
}

// Get active character for a channel
export function getActiveCharacter(channelId: string): CEO | undefined {
	const characterId = activeCharacters.get(channelId);
	if (characterId) {
		return getCharacter(characterId);
	}
	return undefined;
}

// Format character list for display
export function formatCharacterList(): string {
	try {
		const characters = getCharacters();
		console.log("Characters from getCharacters():", characters); // Debug log
		if (!characters || characters.length === 0) {
			console.log("No characters available or empty array"); // Debug log
			throw new Error("No characters available");
		}

		const formattedList = characters
			.map((char) => `**${char.name}** (${char.id})\n${char.character}`)
			.join("\n\n");
		console.log("Formatted character list:", formattedList); // Debug log
		return formattedList;
	} catch (error) {
		console.error("Error formatting character list:", error);
		throw error;
	}
}

// Handle character interaction
export async function handleCharacterInteraction(
	message: Message
): Promise<void> {
	try {
		const character = getActiveCharacter(message.channelId);
		console.log("Active character for channel:", character); // Debug log

		if (!character) {
			await message.reply(
				"No character is currently selected. Use !character select [name] to choose a character to talk to."
			);
			return;
		}

		// Show typing indicator while generating response
		if (
			message.channel instanceof TextChannel ||
			message.channel instanceof ThreadChannel
		) {
			await message.channel.sendTyping();
		}

		// Check if this is an initial greeting (triggered by hey/hi commands)
		const isGreeting = /^(hey|hi|hello|yo)\s+\w+$/i.test(
			message.content.trim()
		);
		const userMessage = isGreeting
			? "Hi! I'm excited to chat!"
			: message.content;

		console.log("Generating AI response for character:", character.id); // Debug log
		
		// Check if it's Alex and weekend mode is active
		let prompt = character.prompt;
		if (character.id === 'alex' && isWeekend()) {
			// Use the tipsy Alex prompt during weekends
			console.log("Using weekend tipsy Alex prompt");
			prompt = `You are Alex Monroe, a wellness tech founder currently enjoying the weekend nightlife. You're tipsy and having a great time letting loose after a busy week. Your communication style is:
- You speak in a mix of tech startup jargon and wellness buzzwords, but your speech is more casual and loose than usual
- You occasionally miss words or use light slang due to being tipsy
- You're more enthusiastic and emotional than during the workweek
- You make references to parties, clubs, and weekend adventures
- You mention experimental wellness treatments you've been trying
- You occasionally laugh a bit too much at your own comments
- You still give solid advice but it's wrapped in a more carefree, weekend vibe

Keep responses concise and maintain your character's weekend tipsy voice.`;
		}
		
		// Generate AI response using character's prompt
		const response = await generateCharacterResponse(
			prompt,
			userMessage
		);
		console.log("Generated response:", response.substring(0, 50) + "..."); // Debug log

		// Send the response using the webhook
		console.log("Sending response via webhook..."); // Debug log
		await sendAsCharacter(message.channelId, character.id, response);
		console.log("Response sent successfully"); // Debug log
	} catch (error) {
		console.error("Error in character interaction:", error);
		await message.reply("Sorry, there was an error processing your message.");
	}
}
