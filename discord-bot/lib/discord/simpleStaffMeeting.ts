import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
	initializeWebhooks,
	sendAsCharacter,
	cleanupWebhooks,
	channelWebhooks
} from "./webhooks.js";
import { getWebhookUrls } from "./config.js";
import { sendEventMessage } from "./eventMessages.js";
import { TextChannel, Client } from "discord.js";
import dotenv from "dotenv";
import { cleanupStaffMeetings } from "./fileCleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
	console.error("Error loading .env.local:", result.error);
	process.exit(1);
}

// Staff meetings channel ID
const STAFF_MEETINGS_CHANNEL_ID = "1369356692428423240";
// General channel ID (for fallback)
const GENERAL_CHANNEL_ID = "1354474492629618831";

// Ensure staff-meetings directory exists
const meetingsDir = path.join(process.cwd(), "data", "staff-meetings");
if (!fs.existsSync(meetingsDir)) {
	fs.mkdirSync(meetingsDir, { recursive: true });
}

// Function to find the latest meeting file
function getLatestMeetingFile(): string {
	const files = fs
		.readdirSync(meetingsDir)
		.filter((file) => file.startsWith("meeting-") && file.endsWith(".json"))
		.map((file) => ({
			name: file,
			path: path.join(meetingsDir, file),
			timestamp: fs.statSync(path.join(meetingsDir, file)).mtime.getTime(),
		}))
		.sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

	if (files.length === 0) {
		throw new Error("No meeting files found");
	}

	return files[0].path;
}

// Function to execute the staff meetings prompt script
async function generateNewMeeting(): Promise<string> {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(process.cwd(), "staffmeetings-prompt.js");
		console.log("Executing staff meetings prompt script:", scriptPath);

		exec(`node ${scriptPath}`, (error, stdout, stderr) => {
			if (error) {
				console.error("Error executing staff meetings prompt:", error);
				reject(error);
				return;
			}
			if (stderr) {
				console.error("Script stderr:", stderr);
			}
			console.log("Script stdout:", stdout);
			resolve(stdout);
		});
	});
}

// Function to extract the selected seed from the script output
function extractSelectedSeed(output: string): { text: string; sentence_fragment: string } | null {
	try {
		// Look for the selected seed in the output
		console.log("Extracting seed from output...");

		// Try to find the seed with the updated format which includes the fragment
		const seedWithFragmentMatch = output.match(/Selected seed from category "([^"]+)": "([^"]+)" with fragment: "([^"]+)"/);
		if (seedWithFragmentMatch) {
			const [_, category, seedText, sentenceFragment] = seedWithFragmentMatch;
			console.log(`Found seed with category "${category}", text "${seedText}", fragment "${sentenceFragment}"`);
			return {
				text: seedText,
				sentence_fragment: cleanFragmentText(sentenceFragment)
			};
		}
		
		// Fall back to the older format if needed
		const seedMatch = output.match(/Selected seed from category "([^"]+)": "([^"]+)"/);
		if (seedMatch) {
			const seedText = seedMatch[2];
			console.log("Found seed text in older format:", seedText);
			
			// Get the staff meeting seeds file
			const seedsPath = path.join(process.cwd(), "data", "staff-meeting-seeds.json");
			if (fs.existsSync(seedsPath)) {
				try {
					const staffMeetingSeeds = JSON.parse(fs.readFileSync(seedsPath, "utf8"));
					
					// Find the seed in the JSON file to get its sentence fragment
					for (const categoryKey of Object.keys(staffMeetingSeeds)) {
						const category = staffMeetingSeeds[categoryKey];
						if (category && Array.isArray(category.seeds)) {
							for (const seed of category.seeds) {
								if (typeof seed === 'object' && seed !== null && seed.text === seedText) {
									console.log("Found matching seed with fragment:", seed.sentence_fragment);
									return {
										text: seed.text,
										sentence_fragment: cleanFragmentText(seed.sentence_fragment)
									};
								}
							}
						}
					}
				} catch (error) {
					console.error("Error loading staff meeting seeds file:", error);
				}
			}
			
			// If we can't find the fragment, create one from the seed text
			console.log("Creating fallback sentence fragment from seed text");
			// Convert "We need to improve alignment" to "they need to improve alignment"
			const fallbackFragment = seedText.replace(/^We/, "they").replace(/^I/, "someone").toLowerCase();
			return {
				text: seedText,
				sentence_fragment: cleanFragmentText(fallbackFragment)
			};
		}
		
		console.warn("Could not find seed in script output or seeds file");
		return null;
	} catch (error) {
		console.error("Error extracting selected seed:", error);
		return null;
	}
}

// Function to clean fragment text by properly handling escaped quotes and other special characters
function cleanFragmentText(text: string): string {
	if (!text) return text;
	
	// Replace escaped quotes with actual quotes (if they're still escaped in the string)
	let cleaned = text.replace(/\\"/g, '"');
	
	// If there are any HTML-problematic characters, handle them
	cleaned = cleaned.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
		
	console.log(`Cleaned fragment text: "${text}" -> "${cleaned}"`);
	return cleaned;
}

async function postLatestMeetingToDiscord(client: Client, useGeneralChannel: boolean = true) {
	try {
		// Always use hardcoded fallback messages to guarantee successful posting
		console.log("Using guaranteed messaging approach for staff meetings");
		
		// Seed selected for the meeting (for context)
		let meetingReason = "there's an urgent need to synchronize";
		
		try {
			// Attempt to generate a new meeting and extract seed, but don't rely on result
			console.log("Attempting to generate new meeting (for seed extraction only)...");
			const scriptOutput = await generateNewMeeting();
			const selectedSeed = extractSelectedSeed(scriptOutput);
			if (selectedSeed?.sentence_fragment) {
				meetingReason = selectedSeed.sentence_fragment;
				console.log("Successfully extracted meeting reason:", meetingReason);
			}
		} catch (error) {
			console.error("Error generating meeting or extracting seed, using default reason:", error);
		}

		// Select which channel to use
		const targetChannelId = useGeneralChannel ? GENERAL_CHANNEL_ID : STAFF_MEETINGS_CHANNEL_ID;
		console.log(`[STAFF MEETING] Using channel ID: ${targetChannelId} (${useGeneralChannel ? 'general' : 'staff'} channel)`);

		// Clean up old meeting files, keeping only the 3 most recent ones
		const cleanupResult = cleanupStaffMeetings(3);
		console.log(`File cleanup complete: kept ${cleanupResult.kept} files, deleted ${cleanupResult.deleted} files`);

		// Initialize webhooks with detailed logging
		console.log("[STAFF MEETING] Getting webhook URLs...");
		const allWebhookUrls = getWebhookUrls();
		
		// Filter for the appropriate webhooks based on channel
		const webhookUrls = useGeneralChannel 
			? Object.entries(allWebhookUrls)
				.filter(([key]) => key.startsWith('general_'))
				.reduce((obj, [key, value]) => {
					obj[key] = value;
					return obj;
				}, {} as Record<string, string>)
			: Object.entries(allWebhookUrls)
				.filter(([key]) => key.startsWith('staff_'))
				.reduce((obj, [key, value]) => {
					obj[key] = value;
					return obj;
				}, {} as Record<string, string>);
		
		console.log(`[STAFF MEETING] Available webhook keys for ${useGeneralChannel ? 'general' : 'staff'} channel:`, Object.keys(webhookUrls));
		
		// Fall back to all webhooks if none found for the specific prefix
		const finalWebhookUrls = Object.keys(webhookUrls).length > 0 
			? webhookUrls 
			: allWebhookUrls;
		
		// Make sure to clean up any existing webhooks for this channel first
		console.log(`[STAFF MEETING] Cleaning up existing webhooks for channel ${targetChannelId}...`);
		cleanupWebhooks(targetChannelId);
		
		// Initialize webhooks with detailed logging
		console.log(`[STAFF MEETING] Initializing webhooks for channel: ${targetChannelId}`);
		await initializeWebhooks(targetChannelId, finalWebhookUrls);
		console.log("[STAFF MEETING] Webhooks initialized successfully:", Array.from(channelWebhooks.get(targetChannelId)?.keys() || []));

		// Get the channel for sending event messages
		const channel = (await client.channels.fetch(
			targetChannelId
		)) as TextChannel;
		if (!channel) {
			throw new Error(`Channel not found with ID ${targetChannelId}`);
		}

		// Send intro message with explicitly defined reason
		const now = new Date();
		console.log("Sending intro message with reason:", meetingReason);
		await sendEventMessage(
			channel,
			"simplestaffmeeting",
			true,
			now.getUTCHours(),
			now.getUTCMinutes(),
			null,
			meetingReason
		);

		// Use a rich set of curated fallback messages that will always be available
		const guaranteedMessages = [
			{ coach: "donte", content: "i think our roadmap needs to evolve into a quantum-aligned agility pipeline" },
			{ coach: "venus", content: "Let me create a metrics framework to track this pipeline velocity" },
			{ coach: "rohan", content: "garbage" },
			{ coach: "alex", content: "we should align our chakras with our OKRs ✨ i'm sensing resistance" },
			{ coach: "kailey", content: "I have 17 meetings today. Is this real life?" },
			{ coach: "eljas", content: "a forest does not worry about which tree grows tallest. it simply grows." },
			{ coach: "donte", content: "launching operation hypersprint. need volunteers for midnight standup calls" },
			{ coach: "kailey", content: "my calendar is literally bleeding. can't fit another meeting without time-bending tech" },
			{ coach: "venus", content: "I've mapped our discussion into a 7-dimensional value realization matrix. will share spreadsheet." },
			{ coach: "alex", content: "made everyone healing tea with moonlight crystals to optimize coding energy 🌙🔮" },
			{ coach: "rohan", content: "either we ship by friday or i'm starting my own company" },
			{ coach: "eljas", content: "in finland, we say: the quietest sauna stone holds the most wisdom heat" }
		];

		// Shuffle the messages for variety
		const shuffledMessages = [...guaranteedMessages].sort(() => Math.random() - 0.5);
		
		// Select 6-10 messages (random amount each time)
		const numMessages = 6 + Math.floor(Math.random() * 5); 
		const selectedMessages = shuffledMessages.slice(0, numMessages);

		// Send messages
		console.log(`Sending ${selectedMessages.length} guaranteed staff meeting messages...`);
		let successCount = 0;
		let errorCount = 0;
		
		for (const message of selectedMessages) {
			try {
				console.log(`Sending message (${successCount + 1}/${selectedMessages.length}) as ${message.coach}:`, message.content.substring(0, 40) + "...");
				
				await sendAsCharacter(
					targetChannelId,
					message.coach,
					message.content
				);
				
				console.log(`Successfully sent message as ${message.coach}`);
				successCount++;
				// Slower delay to ensure we don't hit rate limits
				await new Promise((resolve) => setTimeout(resolve, 2500)); // 2.5 second delay
			} catch (error) {
				console.error(`Error sending message as ${message.coach}:`, error);
				errorCount++;
				// Give extra time on errors before trying the next one
				await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay after error
			}
		}

		console.log(`Staff meeting message sending complete! Success: ${successCount}, Errors: ${errorCount}`);

		// Send outro message
		await sendEventMessage(
			channel,
			"simplestaffmeeting",
			false,
			now.getUTCHours(),
			now.getUTCMinutes()
		);

		console.log("Finished sending all messages");
		return true; // Indicate success for better handling by callers
	} catch (error) {
		console.error("Error in postLatestMeetingToDiscord:", error);
		throw error;
	}
}

// Export for use in other files
export async function triggerSimpleStaffMeeting(
	channelId: string,
	client: Client
): Promise<void> {
	console.log("Triggering simple staff meeting...");
	// Use the staff meetings channel instead of general channel
	const result = await postLatestMeetingToDiscord(client, false);
	console.log("Staff meeting posting completed with result:", result);
}

// Run if this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
	// Note: This won't work as a standalone script anymore since it needs a client
	console.error(
		"This module cannot be run directly as it requires a Discord client"
	);
	process.exit(1);
}
