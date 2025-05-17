import { WebhookClient } from "discord.js";
import { GENERAL_CHANNEL_ID, THELOUNGE_CHANNEL_ID, PITCH_CHANNEL_ID } from "./bot.js";

// Store webhook clients for each channel
export const channelWebhooks = new Map<string, Map<string, WebhookClient>>();

// Initialize webhooks for a channel
export async function initializeWebhooks(
	channelId: string,
	webhookUrls: Record<string, string>
) {
	console.log("[DEBUG-WEBHOOKS] Initializing webhooks for channel:", channelId);
	console.log("[DEBUG-WEBHOOKS] Available webhook URLs:", Object.keys(webhookUrls));

	// Clean up any existing webhooks for this channel
	cleanupWebhooks(channelId);

	const webhooks = new Map<string, WebhookClient>();

	for (const [characterId, url] of Object.entries(webhookUrls)) {
		console.log(`[DEBUG-WEBHOOKS] Creating webhook client for ${characterId} in channel ${channelId}, URL: ${url.substring(0, 20)}...`);
		webhooks.set(characterId, new WebhookClient({ url }));
	}

	channelWebhooks.set(channelId, webhooks);
	console.log("[DEBUG-WEBHOOKS] Webhooks initialized for channel:", channelId);
	console.log("[DEBUG-WEBHOOKS] Current webhook map state:", {
		channels: Array.from(channelWebhooks.keys()),
		webhooks: Array.from(webhooks.keys())
	});
}

// Get avatar URL for a given character
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
	characterId: string,
	message: string
): Promise<void> {
	try {
		console.log(`[DEBUG-WEBHOOKS] Attempting to send message as ${characterId} (normalized: ${characterId.toLowerCase()}) to channel ${channelId}`);
		
		// Debug current state of webhook map
		console.log(`[DEBUG-WEBHOOKS] Current webhook map state:`, {
			channels: Array.from(channelWebhooks.keys()),
			webhooks: Array.from(channelWebhooks.get(channelId)?.keys() || [])
		});
		
		// Normalize character ID for case insensitivity
		const normalizedCharId = characterId.toLowerCase().trim();
		
		// Possible webhook keys to check, based on channel
		const possibleKeys: string[] = [];
		
		// Determine which channel type we're in
		if (channelId === GENERAL_CHANNEL_ID) {
			// Staff meetings channel (#general)
			possibleKeys.push(
				`general_${normalizedCharId}`,
				`general_${characterId}`,
				`staff_${normalizedCharId}`,
				`staff_${characterId}`,
				normalizedCharId,  // Also try without prefix as fallback
				characterId
			);
		} else if (channelId === THELOUNGE_CHANNEL_ID) {
			// The Lounge channel
			possibleKeys.push(
				`lounge_${normalizedCharId}`,
				`lounge_${characterId}`,
				normalizedCharId,  // Also try without prefix as fallback
				characterId
			);
		} else if (channelId === PITCH_CHANNEL_ID) {
			// The Pitch channel
			possibleKeys.push(
				`pitch_${normalizedCharId}`,
				`pitch_${characterId}`,
				normalizedCharId,  // Also try without prefix as fallback
				characterId
			);
		} else {
			// Fallback - try all possible prefixes
			possibleKeys.push(
				`general_${normalizedCharId}`,
				`general_${characterId}`,
				`staff_${normalizedCharId}`,
				`staff_${characterId}`,
				`lounge_${normalizedCharId}`,
				`lounge_${characterId}`,
				`pitch_${normalizedCharId}`,
				`pitch_${characterId}`,
				normalizedCharId,
				characterId
			);
		}
		
		console.log(`[DEBUG-WEBHOOKS] Looking for webhook with possible keys: ${JSON.stringify(possibleKeys)}`);
		
		const webhooks = channelWebhooks.get(channelId);
		if (!webhooks) {
			throw new Error(`No webhooks initialized for channel ${channelId}`);
		}
		
		// Find a matching webhook
		let webhookKey: string | undefined;
		let webhook: WebhookClient | undefined;
		
		for (const key of possibleKeys) {
			if (webhooks.has(key)) {
				webhookKey = key;
				webhook = webhooks.get(key);
				break;
			}
		}
		
		if (!webhook) {
			throw new Error(`No webhook found for character ${characterId} in channel ${channelId}`);
		}
		
		console.log(`[DEBUG-WEBHOOKS] Found webhook with key: ${webhookKey} for ${characterId} in channel ${channelId}, sending message...`);
		console.log(`[DEBUG-WEBHOOKS] Message content: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
		
		// Get the coach's full handle name
		const displayName = coachHandleMap[normalizedCharId] || characterId;
		
		// CRITICAL: Ensure we're sending the actual message content
		// Make sure content field contains the full message, not just timestamp
		await webhook.send({
			content: message,
			username: displayName
		});
		
		console.log(`[DEBUG-WEBHOOKS] Successfully sent message as ${characterId} to channel ${channelId}`);
	} catch (error) {
		console.error(`[DEBUG-WEBHOOKS] Error sending message as ${characterId}:`, error);
		throw error;
	}
}

// Clean up webhooks for a channel
export function cleanupWebhooks(channelId: string) {
	console.log(`[DEBUG-WEBHOOKS] Cleaning up webhooks for channel ${channelId}`);
	const webhooks = channelWebhooks.get(channelId);
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			webhook.destroy();
		}
		channelWebhooks.delete(channelId);
		console.log(`[DEBUG-WEBHOOKS] Cleaned up webhooks for channel ${channelId}`);
	} else {
		console.log(`[DEBUG-WEBHOOKS] No webhooks found to clean up for channel ${channelId}`);
	}
}
