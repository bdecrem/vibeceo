import { Client, TextChannel } from "discord.js";
import { generateCharacterResponse } from "./ai.js";
import { sendAsCharacter, initializeWebhooks, cleanupWebhooks, channelWebhooks } from "./webhooks.js";
import { StaffMeeting, StaffMeetingMessage } from "./types.js";
import fs from "fs";
import path from "path";
import { getWebhookUrls } from "./config.js";

const STAFF_MEETING_PROMPT = `You are facilitating a group chat called TEAMMEETING between the core Advisors Foundry coaches: Donte, Rohan, Alex, Eljas, Venus and Kailey. Each coach has a distinct voice, philosophy, and communication style (defined below). Your job is to produce a fast, funny, startup-flavored group exchange. The tone should blend corporate nonsense, poetic insight, brutal honesty, and mystical startup lingo. Coaches are aware they're part of a product, but treat the conversation like a real, high-functioning team full of hot takes and weird ideas. Think: the startup Slack channel that shouldn't be public but secretly reveals brilliance.

Your goal is to:
- Keep messages short (1–2 lines max)
- Preserve each character's voice
- Use banter, callbacks, sarcasm, absurd ideas, and startup clichés with intent
- End with a loose sense of alignment or a chaotic punchline

### Coach Profiles:

**Donte** – poetic founder-whisperer, always pitching in metaphor  
> "i transform chaos into $3M decks" | hates organization, loves drama

**Rohan** – unapologetic capitalist, VC-core, fast and ruthless  
> "execution > ideation" | allergic to softness | sees KPI in everything

**Alex** – Gen Z wellness disruptor, emoji-heavy, vibe-focused  
> "founder health = startup health" | chaotic good | balances cortisol and Notion docs

**Eljas** – sustainability monk, soft-spoken but piercing  
> "turns shit into power" | believes in sortition, compost, and silence

**Venus** – ops queen, execution maximalist, sarcastic realist  
> "sprints. frameworks. repeat." | allergic to fluff | will fix your entire life in Airtable

**Kailey** – optimistic chaos coordinator, empathy-coded but dangerous with a calendar
> "alignment is my kink" | lives in onboarding docs | emotionally agile but occasionally terrifying

### Format:
IMPORTANT: Each message MUST start with the coach's name in one of these formats:
- [HH:MM] Name: Message
- **Name:** Message

Example messages:
[09:00] Donte: Let's disrupt the status quo, shall we?
**Alex:** 🌟 Time to optimize our collective consciousness!

Do not include any other text, narration, or markers like "END". Just produce the raw messages.
Start with a one-liner from Donte or Alex to spark the session.
End with a soft punchline or chaotic question. Coaches should feel energized, overstimulated, and maybe accidentally aligned.`;

const COACH_DISCORD_HANDLES = {
    donte: 'donte',
    rohan: 'rohan',
    alex: 'alex',
    eljas: 'eljas',
    venus: 'venus',
    kailey: 'kailey'
} as const;

function parseMessage(line: string): StaffMeetingMessage | null {
    // Skip any lines that don't look like messages
    if (line === '**END**' || !line.includes(':')) {
        console.log('[STAFFMEETING] Skipping non-message line:', line);
        return null;
    }

    // Try both timestamped and bold formats
    const timestampMatch = line.match(/^\[?\d{1,2}:\d{2}\]?\s*(\w+):\s*(.*)$/);
    const boldMatch = line.match(/^\*\*(\w+):\*\*\s*(.*)$/);
    const match = timestampMatch || boldMatch;

    if (!match) {
        console.warn('[STAFFMEETING] Line did not match expected format:', line);
        return null;
    }

    const coachName = match[1].toLowerCase();
    const messageContent = match[2];
    const handle = COACH_DISCORD_HANDLES[coachName as keyof typeof COACH_DISCORD_HANDLES];

    if (!handle) {
        console.warn('[STAFFMEETING] No handle found for coach:', coachName);
        return null;
    }

    return {
        coach: handle,
        content: messageContent,
        format: timestampMatch ? 'timestamped' : 'bold',
        status: 'pending'
    };
}

function saveStaffMeeting(meeting: StaffMeeting): void {
    const meetingsDir = path.join(process.cwd(), 'data', 'staff-meetings');
    if (!fs.existsSync(meetingsDir)) {
        fs.mkdirSync(meetingsDir, { recursive: true });
    }

    const filename = `meeting-${meeting.timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(meetingsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(meeting, null, 2));
    console.log('[STAFFMEETING] Saved meeting to:', filepath);
}

export async function triggerStaffMeeting(channelId: string, client: Client): Promise<number> {
    try {
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

        // Generate the conversation
        console.log('[STAFFMEETING] Generating full conversation with prompt:', STAFF_MEETING_PROMPT);
        const fullConversation = await generateCharacterResponse(STAFF_MEETING_PROMPT, "staffmeeting");
        console.log('[STAFFMEETING] Full conversation generated:', fullConversation);

        // Parse messages
        const lines = fullConversation.split('\n').filter(line => line.trim());
        console.log(`[STAFFMEETING] Parsed ${lines.length} lines from conversation.`);

        // Create staff meeting object
        let parsedMessages = lines
            .map(parseMessage)
            .filter((msg): msg is StaffMeetingMessage => msg !== null);

        // If fewer than 30 messages, pad with banter
        const MIN_MESSAGES = 30;
        const banterLines: Record<string, string[]> = {
            donte: [
                "Chaos is just another word for opportunity.",
                "Let's turn this brainstorm into a revenue storm.",
                "Disruption is my love language."
            ],
            rohan: [
                "Can we monetize this tangent?",
                "If it doesn't scale, it fails.",
                "Let's KPI that idea to death."
            ],
            alex: [
                "Vibes are up, cortisol is down!",
                "Let's Notion our way to nirvana.",
                "Wellness check: who's hydrated?"
            ],
            eljas: [
                "Compost your doubts, grow your vision.",
                "Silence is the best framework.",
                "Let's recycle this idea into something greener."
            ],
            venus: [
                "Frameworks before feelings, people.",
                "Airtable is my happy place.",
                "Let's sprint, not stroll."
            ],
            kailey: [
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
                const handle = COACH_DISCORD_HANDLES[message.coach as keyof typeof COACH_DISCORD_HANDLES] || message.coach;
                console.log(`[STAFFMEETING] Attempting to send message as ${handle}:`, message.content);
                await sendAsCharacter(staffMeetingsChannelId, handle, message.content);
                console.log(`[STAFFMEETING] Successfully sent message as ${handle}`);
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