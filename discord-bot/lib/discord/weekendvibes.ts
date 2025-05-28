import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
	initializeWebhooks,
	sendAsCharacter,
	cleanupWebhooks,
} from "./webhooks.js";
import { getWebhookUrls } from "./config.js";
import { sendEventMessage } from "./eventMessages.js";
import { TextChannel, Client } from "discord.js";
import dotenv from "dotenv";
import { cleanupWeekendConversations } from "./fileCleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local only in development
if (process.env.NODE_ENV !== "production") {
	const envPath = path.resolve(process.cwd(), ".env.local");
	console.log("Loading environment from:", envPath);
	const result = dotenv.config({ path: envPath });
	if (result.error) {
		console.error("Error loading .env.local:", result.error);
		process.exit(1);
	}
} else {
	console.log("Production environment detected, using Railway environment variables");
}

// Weekend activities channel ID
const GENERAL_CHANNEL_ID = "1354474492629618831";

// Ensure weekend-conversations directory exists
const meetingsDir = path.join(process.cwd(), "data", "weekend-conversations");
if (!fs.existsSync(meetingsDir)) {
	fs.mkdirSync(meetingsDir, { recursive: true });
}

// Store the latest weekend activity reason for the scheduler to use
let latestWeekendReason: string = "there's an urgent need to party";

// Store the latest weekend activity details
let latestWeekendActivity = {
	name: "",
	type: "",
	description: ""
};

// Export the weekend reason getter for the scheduler
export function getLatestWeekendReason(): string {
	return latestWeekendReason;
}

// Export the weekend activity info for the scheduler
export function getLatestWeekendActivity(): { name: string; type: string; description: string } {
	return latestWeekendActivity;
}

// Function to find the latest meeting file
function getLatestWeekendFile(): string {
	const files = fs
		.readdirSync(meetingsDir)
		.filter((file) => file.startsWith("weekend-") && file.endsWith(".json"))
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

// Function to execute the weekend activities prompt script
async function generateNewWeekend(): Promise<string> {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(process.cwd(), "weekendvibes-prompt.js");
		console.log("Executing weekend activities prompt script:", scriptPath);

		exec(`node ${scriptPath}`, (error, stdout, stderr) => {
			if (error) {
				console.error("Error executing weekend activities prompt:", error);
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
				sentence_fragment: sentenceFragment
			};
		}
		
		// Fall back to the older format if needed
		const seedMatch = output.match(/Selected seed from category "([^"]+)": "([^"]+)"/);
		if (seedMatch) {
			const seedText = seedMatch[2];
			console.log("Found seed text in older format:", seedText);
			
			// Get the staff meeting seeds file
			const seedsPath = path.join(process.cwd(), "data", "staff-weekend-seeds.json");
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
										sentence_fragment: seed.sentence_fragment
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
				sentence_fragment: fallbackFragment
			};
		}
		
		console.warn("Could not find seed in script output or seeds file");
		return null;
	} catch (error) {
		console.error("Error extracting selected seed:", error);
		return null;
	}
}

async function postLatestWeekendToDiscord(client: Client) {
	try {
		// First generate a new meeting
		console.log("Generating new meeting...");
		const scriptOutput = await generateNewWeekend();
		console.log("Script output received, length:", scriptOutput.length);

		// Extract the selected seed from the script output
		const selectedSeed = extractSelectedSeed(scriptOutput);
		console.log("Selected seed result:", selectedSeed);
		
		// Provide a default reason if no seed is found or if extraction fails
		const meetingReason = selectedSeed?.sentence_fragment || "there's an urgent need to synchronize";
		console.log("Using meeting reason:", meetingReason);
        
        // Store the meeting reason for the scheduler to use
        latestWeekendReason = meetingReason;

		// Then get the latest meeting file
		const latestMeetingPath = getLatestWeekendFile();
		console.log("Reading meeting file from:", latestMeetingPath);
		
		// Clean up old weekend conversation files, keeping only the 3 most recent ones
		const cleanupResult = cleanupWeekendConversations(3);
		console.log(`File cleanup complete: kept ${cleanupResult.kept} files, deleted ${cleanupResult.deleted} files`);

		// Read the meeting file
		const latestMeeting = JSON.parse(
			fs.readFileSync(latestMeetingPath, "utf8")
		);

		// Store the activity information for use in the outro message
		if (latestMeeting.activity) {
			console.log("Storing activity information:", latestMeeting.activity);
			latestWeekendActivity = {
				name: latestMeeting.activity.name || "weekend activity",
				type: latestMeeting.activity.type || "fun event",
				description: latestMeeting.activity.description || "some weekend fun"
			};
		} else {
			console.warn("No activity found in the weekend file, using defaults");
			latestWeekendActivity = {
				name: "mystery weekend adventure",
				type: "spontaneous event",
				description: "unexpected weekend shenanigans"
			};
		}

		// Initialize webhooks
		console.log("Initializing webhooks...");
		const webhookUrls = getWebhookUrls();
		cleanupWebhooks(GENERAL_CHANNEL_ID);
		await initializeWebhooks(GENERAL_CHANNEL_ID, webhookUrls);

		// Get the channel for sending event messages
		const channel = (await client.channels.fetch(
			GENERAL_CHANNEL_ID
		)) as TextChannel;
		if (!channel) {
			throw new Error("Weekend activities channel not found");
		}

		// NOTE: Not sending intro message here anymore - scheduler handles this
		// The 'meetingReason' will be passed to the scheduler through the getLatestWeekendReason function

		// Send messages
		console.log(`Sending ${latestMeeting.messages.length} staff meeting messages...`);
		let successCount = 0;
		let errorCount = 0;
		
		for (const message of latestMeeting.messages) {
			try {
				// Remove 'staff_' prefix if it exists
				const coachName = message.coach.replace("staff_", "").toLowerCase();
				console.log(`Sending message (${successCount + 1}/${latestMeeting.messages.length}) as ${coachName}:`, message.content);
				await sendAsCharacter(
					GENERAL_CHANNEL_ID,
					coachName,
					message.content
				);
				console.log(`Successfully sent message as ${coachName}`);
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

		// NOTE: Not sending outro message here anymore - scheduler handles this

		console.log("Finished sending all messages");
		return true; // Indicate success for better handling by callers
	} catch (error) {
		console.error("Error in postLatestWeekendToDiscord:", error);
		throw error;
	}
}

// Export for use in other files
export async function triggerWeekendVibesChat(
	channelId: string,
	client: Client
): Promise<void> {
	console.log("Triggering simple staff meeting...");
	const result = await postLatestWeekendToDiscord(client);
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
