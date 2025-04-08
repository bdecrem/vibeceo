import { WebhookClient } from 'discord.js';
import { CEO } from '../../data/ceos.js';

// Store webhook clients for each channel
const channelWebhooks = new Map<string, Map<string, WebhookClient>>();

// Initialize webhooks for a channel
export async function initializeWebhooks(channelId: string, webhookUrls: Record<string, string>) {
  console.log('Initializing webhooks for channel:', channelId);
  console.log('Available webhook URLs:', Object.keys(webhookUrls));
  
  const webhooks = new Map<string, WebhookClient>();
  
  for (const [characterId, url] of Object.entries(webhookUrls)) {
    console.log(`Creating webhook client for ${characterId}`);
    webhooks.set(characterId, new WebhookClient({ url }));
  }
  
  channelWebhooks.set(channelId, webhooks);
  console.log('Webhooks initialized for channel:', channelId);
}

// Send a message as a character
export async function sendAsCharacter(channelId: string, characterId: string, content: string) {
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
export function cleanupWebhooks(channelId: string) {
  const webhooks = channelWebhooks.get(channelId);
  if (webhooks) {
    for (const webhook of webhooks.values()) {
      webhook.destroy();
    }
    channelWebhooks.delete(channelId);
  }
} 