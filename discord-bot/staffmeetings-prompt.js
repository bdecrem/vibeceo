import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
	console.error("Error loading .env.local:", result.error);
	process.exit(1);
}

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Load staff meeting seeds
const seedsPath = path.resolve(__dirname, "data", "staff-meeting-seeds.json");
const staffMeetingSeeds = JSON.parse(fs.readFileSync(seedsPath, "utf8"));

// Updated function to get a random seed from the JSON file
function getRandomSeed() {
	try {
		// Get all category keys from the seeds file
		const categories = Object.keys(staffMeetingSeeds);

		// Select a random category
		const randomCategory =
			categories[Math.floor(Math.random() * categories.length)];

		// Get the seeds array from the selected category
		const seedsArray = staffMeetingSeeds[randomCategory].seeds;

		// Select a random seed from the array
		const randomSeedObj =
			seedsArray[Math.floor(Math.random() * seedsArray.length)];
		
		// Extract the text and sentence_fragment from the seed object
		const randomSeedText = randomSeedObj.text;
		const sentenceFragment = randomSeedObj.sentence_fragment;

		console.log(
			`Selected seed from category "${staffMeetingSeeds[randomCategory].name}": "${randomSeedText}" with fragment: "${sentenceFragment}"`
		);
		
		// Return both the text and sentence_fragment
		return {
			text: randomSeedText,
			sentence_fragment: sentenceFragment
		};
	} catch (error) {
		console.error("Error selecting random seed:", error);
		// Fallback to hardcoded seeds if there's an error
		const fallbackSeeds = [
			{
				text: "The roadmap is now a Figma moodboard.",
				sentence_fragment: "the roadmap has become a Figma moodboard"
			},
			{
				text: "Our vibe sync ended in silence.",
				sentence_fragment: "their vibe sync ended in silence"
			},
			{
				text: "Donte brought a gong to sprint planning.",
				sentence_fragment: "Donte brought a gong to sprint planning"
			}
		];
		const fallbackSeed = fallbackSeeds[Math.floor(Math.random() * fallbackSeeds.length)];
		return fallbackSeed;
	}
}

const selectedSeed = getRandomSeed();

// Updated system prompt with stricter chaos instructions
const STAFF_MEETING_PROMPT = `
The seed for today's meeting is: ${selectedSeed.text}

Generate a MESSY, RAW Slack group chat between 6 startup coaches. This isn't clever - it's chaotic and authentically human:

⸻

FORMAT:
CoachName 9:00 AM
ultra-short, lowercase Slack message (most <10 words, many <5)

⸻

CAST (keep distinct voices):
- DonteDisrupt – buzzword prophet. lowercase only. "truth is just vibes that got funding"
- AlexirAlex – wellness-obsessed. emoji abuser. says things like "energy" and "vibes"
- RohanTheShark – ruthless operator. one-word responses. "never" or "garbage"
- VenusStrikes – tries to framework chaos and fails. "metrics" and "systems" person
- KaileyConnector – calendar anxiety personified. scheduling breakdown imminent.
- EljasCouncil – finnish mystic. sauna, compost, and nature metaphors.

⸻

STRICT STRUCTURAL REQUIREMENTS:
- 40% of messages MUST be under 6 words
- At least 5 messages MUST be single-word or emoji-only
- MAX 15 words for any message
- include at least 3 typos (real human ones, not fake "teh")
- break thread pattern - people talk over each other
- same timestamp sometimes (two people posting at once)
- some messages get zero responses
- abrupt topic changes (at least 2 that make no sense)
- someone posts, then immediately posts again
- reference google docs, notion docs, or deliverables no one has seen
- someone meta-comments on the chaos
- lowercase everything except names

⸻

CHARACTER ARCS (disguise these as natural typing):
- Donte turns random comment into new initiative with operation name
- Kailey has calendar/scheduling breakdown
- Rohan threatens to quit/start rival company
- Venus tries to create framework for something absurd
- Alex suggests crystal/energy healing for business problem
- Eljas delivers nature wisdom that makes no sense

⸻

CONCRETE ARTIFACTS (include at least 2):
- Notion doc or framework with absurd name ("Revenue Healing Framework v0.1")
- Scheduled meeting with ridiculous purpose ("Scream Into The Void. Daily.")
- Playbook or guide referencing the chaos ("Crystal Cashflow Playbook")

⸻

ENDING:
The conversation MUST end with a powerful mic-drop line from one of the coaches. Examples:
- "chaos is just compost with ambition"
- "new meeting: scream into the void. daily."
- "i've started a doc called burn.it.down"

⸻

THINK REAL SLACK: messy, people talking over each other, inside jokes, no perfect replies, chaos.
`;

// const priorMessages = [
//   { role: "assistant", content: "DonteDisrupt 9:00 AM\ni think the roadmap deleted itself 🌀" }
// ];

const userPrompt = `continue with 25-30 chaotic short messages.

MUST FOLLOW:
- 40% of messages MUST be under 6 words
- include at least 5 single-word or emoji-only responses
- MAX 15 words per message
- keep it MESSY and RAW - this is real human slack
- include real typos, lowercase, people interrupting
- break thread pattern - reactions come late or don't come
- conversations overlap and derail
- include at least 2 abrupt topic shifts
- meta-commentary on the chaos
- disguise character moments as natural typing
- some messages at same timestamp (people posting simultaneously)
- reference tangible deliverables (notion docs, playbooks, frameworks)

CRITICAL:
- end with a POWERFUL mic-drop line (not something soft)
- include at least 2 fake deliverables or concrete artifacts

remember: authentic slack is MESSY - not clever or polished
`;

const messages = [
	{ role: "system", content: STAFF_MEETING_PROMPT },
	// ...priorMessages,
	{ role: "user", content: userPrompt },
];

console.log("\n=== EXACT PROMPT SENT TO GPT ===\n");
console.log(JSON.stringify(messages, null, 2));
console.log("\n=== END PROMPT ===\n");

// Map of coach names to their IDs
const coachMap = {
	DonteDisrupt: "donte",
	AlexirAlex: "alex",
	RohanTheShark: "rohan",
	VenusStrikes: "venus",
	KaileyConnector: "kailey",
	EljasCouncil: "eljas",
};

function inferCoachFromContent(content) {
	// Look for coach mentions or characteristic phrases
	for (const [coachName, coachId] of Object.entries(coachMap)) {
		if (content.includes(coachName) || content.includes(`@${coachName}`)) {
			return coachId;
		}
	}

	// Infer from characteristic phrases
	if (content.match(/crystal|energy|vibe|healing|🔮|✨|🌞/i)) return "alex";
	if (content.match(/garbage|never|useless|out|quit/i)) return "rohan";
	if (content.match(/framework|metric|system|structure|document/i))
		return "venus";
	if (content.match(/schedule|calendar|booking|time|meeting/i)) return "kailey";
	if (content.match(/forest|nature|sauna|compost|mud|steam/i)) return "eljas";
	if (content.match(/initiative|chaos|pivot|disrupt|roadmap/i)) return "donte";

	return null;
}

// This function completely replaced to disable error-prone parsing
function parseMessage(line) {
	// Forcing a consistent "null" return to skip all parsing
	console.log(`[STAFFMEETING] Skipping parsing for line: "${line}"`);
	return {
		type: "content",
		content: line.trim()
	};
}

function validateMessages(messages) {
	const errors = [];

	// Check if we have at least 5 messages
	if (messages.length < 5) {
		errors.push(
			`Not enough messages generated (got ${messages.length}, need at least 5)`
		);
	}

	// Check if we have messages from at least 3 different coaches
	const uniqueCoaches = new Set(messages.map((m) => m.coach));
	if (uniqueCoaches.size < 3) {
		errors.push(
			`Not enough different coaches (got ${uniqueCoaches.size}, need at least 3)`
		);
	}

	// Check if we have at least 1 message with emojis
	const emojiMessages = messages.filter((m) => /\p{Emoji}/u.test(m.content));
	if (emojiMessages.length < 1) {
		errors.push(`No messages with emojis found`);
	}

	// If we have any errors, throw them all at once
	if (errors.length > 0) {
		throw new Error("Validation failed:\n" + errors.join("\n"));
	}

	return messages;
}

async function getGPTResponse() {
	try {
		console.log("Requesting response from GPT-4...");
		const completion = await openai.chat.completions.create({
			model: "gpt-4-turbo-preview",
			messages,
			temperature: 1.0,
			max_tokens: 3500,
		});

		const response = completion.choices[0].message.content;
		console.log("Received response from GPT-4");

		// Save raw response for debugging
		const logsDir = path.join(__dirname, "logs");
		// Ensure logs directory exists
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}
		const rawFilePath = path.join(logsDir, "gpt_latest_response.txt");
		fs.writeFileSync(rawFilePath, response, "utf8");
		console.log(`Saved raw response to ${rawFilePath}`);

		// Process the response using a more robust approach with improved debugging
		console.log("Beginning response parsing...");
		
		// Split the response into lines and perform the first pass - identify headers and content
		const lines = response.split("\n");
		console.log(`Found ${lines.length} total lines in response`);
		
		// Track parsing progress
		let parsedHeaders = 0;
		let parsedContent = 0;
		
		// First pass: identify headers and content lines
		const structuredMessages = [];
		let currentMessage = null;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			// Skip empty lines
			if (!line) continue;
			
			// Use improved parsing function
			const parsedLine = parseMessage(line);
			
			if (!parsedLine) continue;
			
			if (parsedLine.type === "header") {
				// If we were building a previous message, finalize it now
				if (currentMessage) {
					structuredMessages.push(currentMessage);
					parsedContent++;
				}
				
				// Start a new message
				currentMessage = {
					coach: parsedLine.coach,
					timestamp: parsedLine.timestamp,
					content: parsedLine.content || "", // Handle case where content is included with header
					rawLines: []
				};
				parsedHeaders++;
			} else if (parsedLine.type === "content" && currentMessage) {
				// Add content to the current message
				currentMessage.rawLines.push(parsedLine.content);
				
				// If current content is empty, this is the first content line
				if (!currentMessage.content) {
					currentMessage.content = parsedLine.content;
				} else {
					// Append with a space
					currentMessage.content += " " + parsedLine.content;
				}
			}
		}
		
		// Don't forget the last message
		if (currentMessage) {
			structuredMessages.push(currentMessage);
			parsedContent++;
		}
		
		console.log(`First pass completed: found ${parsedHeaders} headers and ${parsedContent} content blocks`);
		
		// If no messages were parsed but we have lines, try a more aggressive approach
		if (structuredMessages.length === 0 && lines.length > 0) {
			console.log("[STAFFMEETING] No messages parsed but input exists, trying fallback parsing");
			
			// Try to identify coach lines by looking for known coach names
			let currentCoach = null;
			
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;
				
				// Check if line contains a coach name
				let matchedCoach = false;
				for (const [coachName, coachId] of Object.entries(coachMap)) {
					if (line.includes(coachName) || 
						line.toLowerCase().includes(coachName.toLowerCase()) ||
						line.includes(coachId) || 
						line.toLowerCase().includes(coachId.toLowerCase())) {
						
						// If we were building a message, finalize it
						if (currentCoach && currentCoach.content) {
							structuredMessages.push(currentCoach);
						}
						
						// Start new message
						currentCoach = {
							coach: coachId,
							timestamp: "00:00",
							content: "",
							rawLines: []
						};
						
						// Remove coach name from content if this is the start of content
						const contentStart = line.toLowerCase().indexOf(coachName.toLowerCase());
						if (contentStart >= 0) {
							currentCoach.content = line.substring(contentStart + coachName.length).trim();
							// Remove leading punctuation
							currentCoach.content = currentCoach.content.replace(/^[:\-\s]+/, "");
						}
						
						matchedCoach = true;
						parsedHeaders++;
						break;
					}
				}
				
				// If no coach name found and we have a current coach, add to their content
				if (!matchedCoach && currentCoach) {
					if (currentCoach.content) {
						currentCoach.content += " " + line;
					} else {
						currentCoach.content = line;
					}
					currentCoach.rawLines.push(line);
				}
			}
			
			// Add the last coach if we have one
			if (currentCoach && currentCoach.content) {
				structuredMessages.push(currentCoach);
				parsedContent++;
			}
			
			console.log(`[STAFFMEETING] Fallback parsing completed: found ${parsedHeaders} headers and ${parsedContent} content blocks`);
		}
		
		// Second pass: clean up and map coach names to IDs
		const finalMessages = structuredMessages.map(msg => {
			// Get the coach ID from the coach map, or infer it from content
			const coachId = coachMap[msg.coach] || 
				inferCoachFromContent(msg.content) || 
				Object.entries(coachMap).find(([name, id]) => 
					name.toLowerCase().includes(msg.coach.toLowerCase()) || 
					msg.coach.toLowerCase().includes(name.toLowerCase()))?.[1];
			
			return {
				coach: coachId || "donte", // Default to Donte if we can't determine
				content: msg.content.trim(),
				timestamp: msg.timestamp
			};
		});
		
		console.log(`Finalized ${finalMessages.length} messages after processing`);

		// Validate the messages
		if (finalMessages.length < 5) {
			console.warn(`WARNING: Only parsed ${finalMessages.length} messages. This may indicate a parsing problem.`);
			console.warn("Raw response first 100 chars:", response.substring(0, 100));
		}
		
		const validMessages = finalMessages.filter(msg => 
			msg.coach && msg.content && msg.content.trim().length > 0
		);
		
		console.log(`After validation: ${validMessages.length} valid messages`);

		// Create staff-meetings directory if it doesn't exist
		const meetingsDir = path.join(__dirname, "data", "staff-meetings");
		if (!fs.existsSync(meetingsDir)) {
			fs.mkdirSync(meetingsDir, { recursive: true });
		}

		// Save the structured messages to a JSON file
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const jsonFilePath = path.join(meetingsDir, `meeting-${timestamp}.json`);
		
		// Save even if validation would fail - better to have partial data than none
		fs.writeFileSync(
			jsonFilePath,
			JSON.stringify({ messages: validMessages }, null, 2)
		);

		console.log(`Saved ${validMessages.length} structured messages to: ${jsonFilePath}`);
		
		// Print parsing stats
		console.log("\n=== PARSING STATS ===");
		console.log(`Total lines in response: ${lines.length}`);
		console.log(`Headers detected: ${parsedHeaders}`);
		console.log(`Content blocks: ${parsedContent}`);
		console.log(`Final message count: ${validMessages.length}`);
		console.log("=== END STATS ===\n");

		return validMessages;
	} catch (error) {
		console.error("Error in GPT response processing:", error);
		throw error;
	}
}

getGPTResponse().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});