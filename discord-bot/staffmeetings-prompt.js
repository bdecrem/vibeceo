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
		
		// Extract the text from the seed object
		const randomSeedText = randomSeedObj.text;

		console.log(
			`Selected seed from category "${staffMeetingSeeds[randomCategory].name}": "${randomSeedText}"`
		);
		return randomSeedText;
	} catch (error) {
		console.error("Error selecting random seed:", error);
		// Fallback to hardcoded seeds if there's an error
		const fallbackSeeds = [
			"The roadmap is now a Figma moodboard.",
			"Our vibe sync ended in silence.",
			"Donte brought a gong to sprint planning.",
		];
		return fallbackSeeds[Math.floor(Math.random() * fallbackSeeds.length)];
	}
}

const selectedSeed = getRandomSeed();

// Updated system prompt with stricter chaos instructions
const STAFF_MEETING_PROMPT = `
The seed for today's meeting is: ${selectedSeed}

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

function parseMessage(line) {
	// Skip empty lines
	if (!line.trim()) return null;

	// Improved regex to match the format: Number CoachName Time AM/PM
	// Also handles the format without the number: CoachName Time AM/PM
	const headerMatch = line.match(/^(?:\d+\s+)?(\w+)\s+(\d{1,2}:\d{2}\s+[AP]M)\s*$/);
	
	if (headerMatch) {
		// This is just a message header line, store it to pair with the content
		return {
			type: "header",
			coach: headerMatch[1],
			timestamp: headerMatch[2].trim()
		};
	} else {
		// This is a content line, to be paired with the most recent header
		return {
			type: "content",
			content: line.trim()
		};
	}
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
		const completion = await openai.chat.completions.create({
			model: "gpt-4-turbo-preview",
			messages,
			temperature: 1.0,
			max_tokens: 3500,
		});

		const response = completion.choices[0].message.content;

		// Save raw response for debugging
		const rawFilePath = path.join(__dirname, "gpt_latest_response.txt");
		fs.writeFileSync(rawFilePath, response, "utf8");

		// Process the response into structured messages
		const lines = response.split("\n").filter((line) => line.trim());
		
		// Parse the response using a more robust two-pass approach
		const parsedLines = lines.map(parseMessage).filter(line => line !== null);
		
		// Combine header lines and content lines to create complete messages
		const structuredMessages = [];
		let currentCoach = null;
		let currentTimestamp = null;
		let currentContent = [];
		
		// Process each parsed line
		for (const line of parsedLines) {
			if (line.type === "header") {
				// If we have a previous message ready, add it
				if (currentCoach && currentContent.length > 0) {
					structuredMessages.push({
						coach: coachMap[currentCoach] || inferCoachFromContent(currentContent.join(" ")),
						content: currentContent.join(" ").trim(),
						timestamp: currentTimestamp
					});
					currentContent = [];
				}
				
				// Start a new message
				currentCoach = line.coach;
				currentTimestamp = line.timestamp;
			} else if (line.type === "content") {
				// Add content to the current message
				currentContent.push(line.content);
			}
		}
		
		// Add the last message if there is one
		if (currentCoach && currentContent.length > 0) {
			structuredMessages.push({
				coach: coachMap[currentCoach] || inferCoachFromContent(currentContent.join(" ")),
				content: currentContent.join(" ").trim(),
				timestamp: currentTimestamp
			});
		}

		// Fix common issues with the parsed messages
		const cleanedMessages = structuredMessages
			.map(msg => {
				// Ensure we have a valid coach ID
				if (!msg.coach && msg.content) {
					msg.coach = inferCoachFromContent(msg.content);
				}
				
				// Default to donte if we still can't determine the coach
				if (!msg.coach) {
					msg.coach = "donte";
				}
				
				return msg;
			})
			.filter(msg => msg !== null && msg.content && msg.content.trim());

		// Make sure we have all messages and they're valid
		if (cleanedMessages.length < 5) {
			console.warn(`WARNING: Only parsed ${cleanedMessages.length} messages. This may indicate a parsing problem.`);
		}
		
		// Validate the messages
		const validatedMessages = validateMessages(cleanedMessages);

		// Create staff-meetings directory if it doesn't exist
		const meetingsDir = path.join(__dirname, "data", "staff-meetings");
		if (!fs.existsSync(meetingsDir)) {
			fs.mkdirSync(meetingsDir, { recursive: true });
		}

		// Save the structured messages to a JSON file
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const jsonFilePath = path.join(meetingsDir, `meeting-${timestamp}.json`);
		fs.writeFileSync(
			jsonFilePath,
			JSON.stringify({ messages: validatedMessages }, null, 2)
		);

		console.log("\n=== GPT RESPONSE ===\n");
		console.log(response);
		console.log("\n=== END RESPONSE ===\n");
		console.log(`\nSaved structured messages to: ${jsonFilePath}`);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

getGPTResponse().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});
