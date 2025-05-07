import { Client, TextChannel } from "discord.js";
import { sendAsCharacter, initializeWebhooks, cleanupWebhooks, channelWebhooks } from "./webhooks.js";
import { StaffMeeting, StaffMeetingMessage } from "./types.js";
import fs from "fs";
import path from "path";
import { getWebhookUrls } from "./config.js";
import { COACH_DISCORD_HANDLES } from './coachHandles.js';
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Load and select a random seed
function getRandomSeed(): string {
    const seeds = [
        "The roadmap is now a Figma moodboard.",
        "Our vibe sync ended in silence.",
        "Donte brought a gong to sprint planning."
    ];
    return seeds[Math.floor(Math.random() * seeds.length)];
}

const STAFF_MEETING_PROMPT = `You are generating a group chat between fictional startup coaches for a satirical project called Advisors Foundry.

The tone is: chaotic, self-important, emotionally unstable, and occasionally brilliant. Think: a Slack thread between six coaches who believe they're changing the world through alignment and pitch decks — but they can't even agree on a calendar.

Your goal is to make the conversation feel real, layered, reactive, and hilarious.

SCENE:
The seed for today's meeting is: {{SEED}}

FORMAT:
[Name] [Time]  
[Short message in their voice — 1–2 lines max]

CHARACTERS:
- DonteDisrupt = poetic nonsense / fake visionary / "let's cook" energy
- RohanTheShark = VC predator / execution maximalist / allergic to emotions
- AlexirAlex = Gen Z wellness disruptor / emoji-overuser / vibes first
- VenusStrikes = ruthless quant / precision obsessed / hates vibes
- KaileyTheSync = ops lead on the edge / compulsive Notion scheduler / gets ignored often
- EljasCouncil = compost mystic from Finland / haunting metaphors / always wins the room with 1 line

RULES:
- Characters must directly reference or react to each other
- They should dunk, build, contradict, or hijack the thread
- Include sarcasm, spirals, fake rituals, invented tools, and weird metaphors
- Escalate tension — the thread should unravel into brilliance or disaster
- End with either: a punchline, someone ghosting, or a fake decision no one agrees with

AVOID:
- Turn-taking
- Generic slogans
- "Everyone gets a line" energy
- Repeating startup clichés

This is NOT a "sample dialogue." This is a group of brilliant egomaniacs trapped in a Slack thread, trying to align without imploding.`;

// Map of real names to Discord handles
const COACH_NAME_TO_HANDLE: Record<string, string> = {
    'DonteDisrupt': COACH_DISCORD_HANDLES.donte,
    'RohanTheShark': COACH_DISCORD_HANDLES.rohan,
    'AlexirAlex': COACH_DISCORD_HANDLES.alex,
    'VenusStrikes': COACH_DISCORD_HANDLES.venus,
    'KaileyTheSync': COACH_DISCORD_HANDLES.kailey,
    'EljasCouncil': COACH_DISCORD_HANDLES.eljas
};

function parseMessage(line: string): StaffMeetingMessage | null {
    // Skip any lines that don't look like messages
    if (line === '**END**' || !line.includes(':')) {
        console.log('[STAFFMEETING] Skipping non-message line:', line);
        return null;
    }

    // Try both timestamped and bold formats
    const timestampMatch = line.match(/^\[?(\d{1,2}:\d{2})\]?\s*(\w+):\s*(.*)$/);
    const boldMatch = line.match(/^\*\*(\w+):\*\*\s*(.*)$/);
    const match = timestampMatch || boldMatch;

    if (!match) {
        console.warn('[STAFFMEETING] Line did not match expected format:', line);
        return null;
    }

    // For timestamped format, match[1] is time, match[2] is name, match[3] is content
    // For bold format, match[1] is name, match[2] is content
    const coachName = timestampMatch ? match[2] : match[1];
    const messageContent = timestampMatch ? match[3] : match[2];
    
    // Get the Discord handle for this coach
    const coachHandle = COACH_NAME_TO_HANDLE[coachName];
    if (!coachHandle) {
        console.warn('[STAFFMEETING] No handle found for coach:', coachName);
        return null;
    }
    
    return {
        coach: coachHandle,
        content: messageContent,
        format: timestampMatch ? 'timestamped' : 'bold',
        status: 'pending'
    };
}

function saveStaffMeeting(meeting: StaffMeeting): void {
    const meetingsDir = path.join(process.cwd(), 'data', 'staff-meetings');
    
    try {
        // Create directory if it doesn't exist
    if (!fs.existsSync(meetingsDir)) {
        fs.mkdirSync(meetingsDir, { recursive: true });
    }

        // Save the new meeting file
    const filename = `meeting-${meeting.timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(meetingsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(meeting, null, 2));
    console.log('[STAFFMEETING] Saved meeting to:', filepath);

        // Get all meeting files
        const files = fs.readdirSync(meetingsDir)
            .filter(file => file.startsWith('meeting-') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(meetingsDir, file),
                timestamp: fs.statSync(path.join(meetingsDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

        // Keep only the 3 most recent files
        if (files.length > 3) {
            const filesToDelete = files.slice(3);
            for (const file of filesToDelete) {
                fs.unlinkSync(file.path);
                console.log('[STAFFMEETING] Deleted old meeting file:', file.name);
            }
        }
    } catch (error) {
        console.error('[STAFFMEETING] Error managing meeting files:', error);
        // Still throw the error to maintain existing error handling
        throw error;
    }
}

export async function triggerStaffMeeting(channelId: string, client: Client): Promise<number> {
    try {
        console.log('\n🔔 STAFF MEETING TRIGGERED 🔔');
        console.log('Time:', new Date().toISOString());
        console.log('Channel ID:', channelId);
        console.log('----------------------------------------');
        
        console.log('[STAFFMEETING] Entered triggerStaffMeeting');
        const now = new Date();
        
        // Use the staff meetings channel ID directly
        const staffMeetingsChannelId = '1369356692428423240';
        console.log('[STAFFMEETING] Using channel ID:', staffMeetingsChannelId);
        
        // Initialize webhooks for the staff meetings channel
        const webhookUrls = getWebhookUrls();
        console.log('[STAFFMEETING] Initializing webhooks with URLs:', Object.keys(webhookUrls));
        
        // First, clean up any existing webhooks for this channel
        cleanupWebhooks(staffMeetingsChannelId);
        
        // Then initialize new webhooks
        await initializeWebhooks(staffMeetingsChannelId, webhookUrls);
        
        // Verify webhooks were initialized
        const channelHooks = channelWebhooks.get(staffMeetingsChannelId);
        if (!channelHooks) {
            throw new Error('Failed to initialize webhooks for staff meetings channel');
        }
        console.log('[STAFFMEETING] Webhooks initialized for staff meetings channel:', Array.from(channelHooks.keys()));
        
        const channel = await client.channels.fetch(staffMeetingsChannelId) as TextChannel;
        if (!channel) {
            throw new Error('Staff meetings channel not found');
        }
        console.log('[STAFFMEETING] Found channel:', channel.name);

        // Generate the conversation using GPT-4
        const selectedSeed = getRandomSeed();
        const systemPrompt = STAFF_MEETING_PROMPT + '\n\nIMPORTANT: Do NOT have each character speak once in order. Do NOT ignore the seed. The conversation must spiral, escalate, and reference the seed repeatedly.';
        const userPrompt = `The seed for today's meeting is: ${selectedSeed}\n\nGenerate a chaotic, reactive, and hilarious group chat as described above. The seed must be referenced, hijacked, or escalated throughout the conversation. Avoid turn-taking. Avoid generic slogans. Make it feel like a real, messy Slack thread.`;
        
        console.log('\n=== STAFF MEETING PROMPT DEBUG ===');
        console.log('Selected Seed:', selectedSeed);
        console.log('\nSystem Prompt:', systemPrompt);
        console.log('\nUser Prompt:', userPrompt);
        console.log('\nFull Messages Array:', JSON.stringify([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], null, 2));
        console.log('=== END PROMPT DEBUG ===\n');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 1.0,
        });

        const fullConversation = response.choices[0].message.content;
        if (!fullConversation) {
            throw new Error('No conversation generated from GPT-4');
        }

        console.log('[STAFFMEETING] Raw GPT-4 response:', fullConversation);

        // Parse messages
        const lines = fullConversation.split('\n').filter(line => line.trim());
        console.log(`[STAFFMEETING] Parsed ${lines.length} lines from conversation.`);

        // Create staff meeting object
        let parsedMessages = lines
            .map((line: string) => parseMessage(line))
            .filter((msg: StaffMeetingMessage | null): msg is StaffMeetingMessage => msg !== null);

        // If fewer than 30 messages, pad with banter
        const MIN_MESSAGES = 30;
        const banterLines: Record<string, string[]> = {
            [COACH_DISCORD_HANDLES.donte]: [
                "Chaos is just another word for opportunity.",
                "Let's turn this brainstorm into a revenue storm.",
                "Disruption is my love language."
            ],
            [COACH_DISCORD_HANDLES.rohan]: [
                "Can we monetize this tangent?",
                "If it doesn't scale, it fails.",
                "Let's KPI that idea to death."
            ],
            [COACH_DISCORD_HANDLES.alex]: [
                "Vibes are up, cortisol is down!",
                "Let's Notion our way to nirvana.",
                "Wellness check: who's hydrated?"
            ],
            [COACH_DISCORD_HANDLES.eljas]: [
                "Compost your doubts, grow your vision.",
                "Silence is the best framework.",
                "Let's recycle this idea into something greener."
            ],
            [COACH_DISCORD_HANDLES.venus]: [
                "Frameworks before feelings, people.",
                "Airtable is my happy place.",
                "Let's sprint, not stroll."
            ],
            [COACH_DISCORD_HANDLES.kailey]: [
                "Alignment is just a meeting away!",
                "My calendar is scarier than your roadmap.",
                "Let's onboard this chaos."
            ]
        };
        const coachHandles = Object.values(COACH_DISCORD_HANDLES);
        let banterIndex = 0;
        while (parsedMessages.length < MIN_MESSAGES) {
            const coach = coachHandles[banterIndex % coachHandles.length];
            const banter = banterLines[coach][Math.floor(Math.random() * banterLines[coach].length)];
            parsedMessages.push({
                coach,
                content: banter,
                format: 'bold',
                status: 'pending'
            });
            banterIndex++;
        }

        const meeting: StaffMeeting = {
            timestamp: now.toISOString(),
            messages: parsedMessages,
            metadata: {
                total_messages: 0, // Will be updated after filtering
                expected_duration: 0, // Will be updated after filtering
                validation_status: 'valid'
            }
        };

        // Update metadata
        meeting.metadata.total_messages = meeting.messages.length;
        meeting.metadata.expected_duration = meeting.messages.length * 2000; // 2 seconds per message

        console.log('[STAFFMEETING] Created meeting object with', meeting.messages.length, 'messages');

        // Save the meeting
        saveStaffMeeting(meeting);

        // Send messages
        console.log('[STAFFMEETING] Starting to send messages...');
        for (const message of meeting.messages) {
            try {
                console.log(`[STAFFMEETING] Attempting to send message as ${message.coach}:`, message.content);
                await sendAsCharacter(staffMeetingsChannelId, message.coach, message.content);
                console.log(`[STAFFMEETING] Successfully sent message as ${message.coach}`);
                message.status = 'sent';
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`[STAFFMEETING] Error sending message as ${message.coach}:`, err);
                message.status = 'failed';
            }
        }

        // Update the saved meeting with message statuses
        saveStaffMeeting(meeting);
        console.log('[STAFFMEETING] Completed sending all messages');

        return meeting.metadata.expected_duration;
    } catch (error) {
        console.error("[STAFFMEETING] Error in staff meeting:", error);
        throw error;
    }
} 