import { WebhookClient } from 'discord.js';
// Store webhook clients for each channel
const channelWebhooks = new Map();
// Initialize webhooks for a channel
export async function initializeWebhooks(channelId, webhookUrls) {
    console.log('Initializing webhooks for channel:', channelId);
    console.log('Available webhook URLs:', Object.keys(webhookUrls));
    const webhooks = new Map();
    for (const [characterId, url] of Object.entries(webhookUrls)) {
        console.log(`Creating webhook client for ${characterId}`);
        webhooks.set(characterId, new WebhookClient({ url }));
    }
    channelWebhooks.set(channelId, webhooks);
    console.log('Webhooks initialized for channel:', channelId);
}
// Send a message as a character
export async function sendAsCharacter(channelId, characterId, content) {
    console.log(`Attempting to send message as ${characterId} in channel ${channelId}`);
    const channelHooks = channelWebhooks.get(channelId);
    if (!channelHooks) {
        console.error(`No webhooks initialized for channel ${channelId}`);
        throw new Error(`No webhooks initialized for channel ${channelId}`);
    }
    const webhook = channelHooks.get(characterId);
    if (!webhook) {
        console.error(`No webhook found for character ${characterId}`);
        throw new Error(`No webhook found for character ${characterId}`);
    }
    console.log(`Sending message via webhook: ${content.substring(0, 50)}...`);
    await webhook.send({
        content,
        // username and avatar will be set in the webhook configuration
    });
    console.log('Message sent successfully');
}
// Clean up webhooks for a channel
export function cleanupWebhooks(channelId) {
    const webhooks = channelWebhooks.get(channelId);
    if (webhooks) {
        for (const webhook of webhooks.values()) {
            webhook.destroy();
        }
        channelWebhooks.delete(channelId);
    }
}
