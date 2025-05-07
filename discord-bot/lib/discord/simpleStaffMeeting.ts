import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeWebhooks, sendAsCharacter, cleanupWebhooks } from './webhooks.js';
import { getWebhookUrls } from './config.js';
import { sendEventMessage } from './eventMessages.js';
import { TextChannel, Client } from 'discord.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
}

// Staff meetings channel ID
const STAFF_MEETINGS_CHANNEL_ID = '1369356692428423240';

// Ensure staff-meetings directory exists
const meetingsDir = path.join(process.cwd(), 'data', 'staff-meetings');
if (!fs.existsSync(meetingsDir)) {
    fs.mkdirSync(meetingsDir, { recursive: true });
}

async function postLatestMeetingToDiscord(client: Client) {
    try {
        // 2. Hardcode the path to the latest meeting file
        const latestMeetingPath = path.join(meetingsDir, 'meeting-2025-05-07T21-04-25-647Z.json');
        console.log('Reading meeting file from:', latestMeetingPath);

        // 3. Read the meeting file
        const latestMeeting = JSON.parse(
            fs.readFileSync(latestMeetingPath, 'utf8')
        );

        // 4. Initialize webhooks
        console.log('Initializing webhooks...');
        const webhookUrls = getWebhookUrls();
        cleanupWebhooks(STAFF_MEETINGS_CHANNEL_ID);
        await initializeWebhooks(STAFF_MEETINGS_CHANNEL_ID, webhookUrls);

        // Get the channel for sending event messages
        const channel = await client.channels.fetch(STAFF_MEETINGS_CHANNEL_ID) as TextChannel;
        if (!channel) {
            throw new Error('Staff meetings channel not found');
        }

        // Send intro message
        const now = new Date();
        await sendEventMessage(
            channel,
            'simplestaffmeeting',
            true,
            now.getUTCHours(),
            now.getUTCMinutes()
        );

        // 5. Send messages
        console.log('Sending messages...');
        for (const message of latestMeeting.messages) {
            try {
                // Remove 'staff_' prefix if it exists
                const coachName = message.coach.replace('staff_', '').toLowerCase();
                console.log(`Sending message as ${coachName}:`, message.content);
                await sendAsCharacter(STAFF_MEETINGS_CHANNEL_ID, coachName, message.content);
                console.log(`Successfully sent message as ${coachName}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            } catch (error) {
                console.error(`Error sending message as ${message.coach}:`, error);
            }
        }

        // Send outro message
        await sendEventMessage(
            channel,
            'simplestaffmeeting',
            false,
            now.getUTCHours(),
            now.getUTCMinutes()
        );

        console.log('Finished sending all messages');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Export for use in other files
export async function triggerSimpleStaffMeeting(channelId: string, client: Client): Promise<void> {
    await postLatestMeetingToDiscord(client);
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    // Note: This won't work as a standalone script anymore since it needs a client
    console.error('This module cannot be run directly as it requires a Discord client');
    process.exit(1);
} 