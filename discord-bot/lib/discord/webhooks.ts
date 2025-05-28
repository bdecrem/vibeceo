import { WebhookClient } from "discord.js";

// Channel IDs are now passed as parameters, originating from validated configuration.

// Store webhook clients for each channel
export const channelWebhooks = new Map<string, Map<string, WebhookClient>>();

// Initialize webhooks for a channel
export async function initializeWebhooks(
	channelId: string,
	characterWebhookUrls: Record<string, string> // e.g., { donte: "url1", alex: "url2" }
) {
	console.log(`[WEBHOOKS] Initializing webhooks for channel: ${channelId}`);
	console.log(`[WEBHOOKS] Provided character webhook URLs:`, Object.keys(characterWebhookUrls));

	// Clean up any existing webhooks for this channel
	cleanupWebhooks(channelId);

	const webhooks = new Map<string, WebhookClient>();

	for (const [characterKey, url] of Object.entries(characterWebhookUrls)) {
		// characterKey here is already the simple name, e.g., "donte", "alex"
		const normalizedCharacterKey = characterKey.toLowerCase().trim(); // Ensure consistency
		console.log(`[WEBHOOKS] Creating webhook client for character '${normalizedCharacterKey}' in channel ${channelId}`);
		try {
			webhooks.set(normalizedCharacterKey, new WebhookClient({ url }));
		} catch (error) {
			console.error(`[WEBHOOKS] Failed to create webhook client for ${normalizedCharacterKey} in channel ${channelId} with URL ${url}:`, error);
		}
	}

	channelWebhooks.set(channelId, webhooks);
	console.log(`[WEBHOOKS] Webhooks initialized for channel: ${channelId}. ${webhooks.size} webhooks loaded.`);
	console.log(`[WEBHOOKS] Current webhook map state for channel ${channelId}:`, {
		characters: Array.from(webhooks.keys())
	});
}

// Get avatar URL for a given character (remains unchanged, but not used by sendAsCharacter directly)
function getAvatarUrl(characterName: string): string {
	// Base URL for Discord avatar images
	const baseUrl = "https://cdn.discordapp.com/avatars/";
	// Default avatar if no match is found
	return "https://i.imgur.com/6GHG6PX.png";
}

// Map of coach IDs to their full handle names
const coachHandleMap: { [key: string]: string } = {
	'donte': 'DonteDisrupt',
	'rohan': 'RohanTheShark',
	'alex': 'AlexirAlex',
	'eljas': 'EljasCouncil',
	'venus': 'VenusStrikes',
	'kailey': 'KaileyConnector'
};

// Send a message as a character
export async function sendAsCharacter(
	channelId: string,
	characterId: string, // This should be the simple character name, e.g., "donte"
	message: string
): Promise<void> {
	try {
		const normalizedCharId = characterId.toLowerCase().trim();
		console.log(`[WEBHOOKS] Attempting to send message as '${normalizedCharId}' to channel ${channelId}`);
		
		const webhooksForChannel = channelWebhooks.get(channelId);
		if (!webhooksForChannel) {
			console.error(`[WEBHOOKS] No webhooks initialized for channel ${channelId}. Available channels: ${Array.from(channelWebhooks.keys()).join(', ')}`);
			throw new Error(`No webhooks initialized for channel ${channelId}`);
		}
		
		const webhook = webhooksForChannel.get(normalizedCharId);
		if (!webhook) {
			console.error(`[WEBHOOKS] No webhook found for character '${normalizedCharId}' in channel ${channelId}. Available characters in this channel: ${Array.from(webhooksForChannel.keys()).join(', ')}`);
			throw new Error(`No webhook found for character '${normalizedCharId}' in channel ${channelId}`);
		}
		
		console.log(`[WEBHOOKS] Found webhook for '${normalizedCharId}' in channel ${channelId}. Sending message...`);
		console.log(`[WEBHOOKS] Message content: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
		
		const displayName = coachHandleMap[normalizedCharId] || characterId; // Fallback to original characterId if not in map
		
		await webhook.send({
			content: message,
			username: displayName
			// avatarURL: getAvatarUrl(normalizedCharId) // Optional: if you have specific avatar URLs per character
		});
		
		console.log(`[WEBHOOKS] Successfully sent message as '${normalizedCharId}' to channel ${channelId}`);
	} catch (error) {
		console.error(`[WEBHOOKS] Error sending message as '${characterId}' (normalized: '${characterId.toLowerCase().trim()}') in channel ${channelId}:`, error);
		throw error; // Re-throw to allow caller to handle
	}
}

// Clean up webhooks for a channel
export function cleanupWebhooks(channelId: string) {
	console.log(`[WEBHOOKS] Cleaning up webhooks for channel ${channelId}`);
	const webhooks = channelWebhooks.get(channelId);
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			webhook.destroy();
		}
		channelWebhooks.delete(channelId);
		console.log(`[WEBHOOKS] Cleaned up webhooks for channel ${channelId}`);
	} else {
		console.log(`[WEBHOOKS] No webhooks found to clean up for channel ${channelId}`);
	}
}
