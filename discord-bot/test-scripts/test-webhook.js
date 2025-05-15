import fs from 'fs';
import { WebhookClient } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Get one of the webhook URLs
const webhookUrl = process.env.GENERAL_WEBHOOK_URL_DONTE;
if (!webhookUrl) {
  console.error('No webhook URL found');
  process.exit(1);
}

console.log('Using webhook URL:', webhookUrl.slice(0, 30) + '...');

// Create a webhook client
const webhook = new WebhookClient({ url: webhookUrl });

// Send a test message
webhook.send({ content: 'Test message from webhook (manual test)' })
  .then(() => console.log('Message sent successfully'))
  .catch(err => console.error('Error sending message:', err)); 