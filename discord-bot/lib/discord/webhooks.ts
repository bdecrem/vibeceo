import { WebhookClient } from "discord.js";

// Store webhook clients for each channel
export const channelWebhooks = new Map<string, Map<string, WebhookClient>>();

// Initialize webhooks for a channel
export async function initializeWebhooks(
	channelId: string,
	webhookUrls: Record<string, string>
) {
	console.log("[Webhooks] Initializing webhooks for channel:", channelId);
	console.log("[Webhooks] Available webhook URLs:", Object.keys(webhookUrls));

	// Clean up any existing webhooks for this channel
	cleanupWebhooks(channelId);

	const webhooks = new Map<string, WebhookClient>();

	for (const [characterId, url] of Object.entries(webhookUrls)) {
		console.log(`[Webhooks] Creating webhook client for ${characterId} in channel ${channelId}`);
		webhooks.set(characterId, new WebhookClient({ url }));
	}

	channelWebhooks.set(channelId, webhooks);
	console.log("[Webhooks] Webhooks initialized for channel:", channelId);
	console.log("[Webhooks] Current webhook map state:", {
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

// Send a message as a character
export async function sendAsCharacter(channelId: string, characterName: string, content: string): Promise<void> {
	try {
		console.log(`[Webhooks] Attempting to send message as ${characterName} to channel ${channelId}`);
		console.log("[Webhooks] Current webhook map state:", {
			channels: Array.from(channelWebhooks.keys()),
			webhooks: channelWebhooks.get(channelId) ? Array.from(channelWebhooks.get(channelId)!.keys()) : 'none'
		});
		
		// Get the webhook for this character in this channel
		const channelHooks = channelWebhooks.get(channelId);
		if (!channelHooks) {
			throw new Error(`No webhooks initialized for channel ${channelId}`);
		}

		// Determine which webhook to use based on the channel
		const isStaffMeeting = channelId === '1369356692428423240';
		const webhookKey = isStaffMeeting ? `staff_${characterName}` : `general_${characterName}`;
		
		const webhook = channelHooks.get(webhookKey);
		if (!webhook) {
			throw new Error(`No webhook found for character: ${characterName} in channel ${channelId}`);
		}

		console.log(`[Webhooks] Found webhook for ${characterName} in channel ${channelId}, sending message...`);
		await webhook.send({
			content,
			avatarURL: getAvatarUrl(characterName)
		});
		console.log(`[Webhooks] Successfully sent message as ${characterName} to channel ${channelId}`);
	} catch (error) {
		console.error(`[Webhooks] Error sending message as ${characterName} to channel ${channelId}:`, error);
		throw error;
	}
}

// Clean up webhooks for a channel
export function cleanupWebhooks(channelId: string) {
	console.log(`[Webhooks] Cleaning up webhooks for channel ${channelId}`);
	const webhooks = channelWebhooks.get(channelId);
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			webhook.destroy();
		}
		channelWebhooks.delete(channelId);
		console.log(`[Webhooks] Cleaned up webhooks for channel ${channelId}`);
	} else {
		console.log(`[Webhooks] No webhooks found to clean up for channel ${channelId}`);
	}
}
