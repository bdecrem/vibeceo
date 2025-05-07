import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeWebhooks, sendAsCharacter, cleanupWebhooks } from './webhooks.js';
import { getWebhookUrls } from './config.js';
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

async function postLatestMeetingToDiscord() {
    try {
        // 1. Run test-gpt-prompt.js to generate meeting
        // console.log('Generating new meeting via test-gpt-prompt.js...');
        // const scriptPath = path.join(process.cwd(), 'test-gpt-prompt.js');
        // console.log('Running script at:', scriptPath);
        
        // await new Promise((resolve, reject) => {
        //     exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        //         if (error) {
        //             console.error('Error running test-gpt-prompt.js:', error);
        //             reject(error);
        //             return;
        //         }
        //         console.log(stdout);
        //         resolve(stdout);
        //     });
        // });

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

        console.log('Finished sending all messages');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Export for use in other files
export async function triggerSimpleStaffMeeting(): Promise<void> {
    await postLatestMeetingToDiscord();
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    postLatestMeetingToDiscord().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
} 