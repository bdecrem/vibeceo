import { WebhookClient } from "discord.js";

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

function getAvatarUrl(characterName: string): string {
	// Map character names to their avatar URLs
	const avatarMap: { [key: string]: string } = {
		'Donte': 'https://i.imgur.com/example1.png',
		'Rohan': 'https://i.imgur.com/example2.png',
		'Alex': 'https://i.imgur.com/example3.png',
		'Eljas': 'https://i.imgur.com/example4.png',
		'Venus': 'https://i.imgur.com/example5.png',
		'Kailey': 'https://i.imgur.com/example6.png'
	};
	return avatarMap[characterName] || '';
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
		
		// Possible webhook keys to check (general_*, staff_* and just the character ID)
		const possibleKeys = [
			`general_${normalizedCharId}`,
			`general_${characterId}`,
			normalizedCharId,
			characterId
		];
		
		// If we're in staff meetings channel, prioritize staff webhooks
		if (channelId === "1369356692428423240") {
			possibleKeys.unshift(`staff_${normalizedCharId}`, `staff_${characterId}`);
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
