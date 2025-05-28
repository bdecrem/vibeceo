import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { loadEnvironment } from "./lib/discord/env-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvironment();

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

// Load weekend activities data
const weekendActivitiesPath = path.resolve(__dirname, "data", "weekend-activities.json");
const weekendActivities = JSON.parse(fs.readFileSync(weekendActivitiesPath, "utf8"));

// Function to randomly select a weekend activity based on city and duration
function getRandomWeekendActivity(city, duration) {
	try {
		// Validate inputs
		const validCities = ["Berlin", "Vegas", "Tokyo"];
		const validDurations = ["short", "medium", "long"];
		
		if (!validCities.includes(city)) {
			console.error(`Invalid city: ${city}. Using default city Berlin.`);
			city = "Berlin";
		}
		
		if (!validDurations.includes(duration)) {
			console.error(`Invalid duration: ${duration}. Using default duration short.`);
			duration = "short";
		}
		
		// Get activities for the specified city and duration
		const activities = weekendActivities[city][duration];
		
		if (!activities || activities.length === 0) {
			throw new Error(`No activities found for ${city}, ${duration}.`);
		}
		
		// Select a random activity
		const randomActivity = activities[Math.floor(Math.random() * activities.length)];
		
		console.log(`Selected activity in ${city} (${duration}): "${randomActivity.name}" - ${randomActivity.type}`);
		
		return randomActivity;
	} catch (error) {
		console.error("Error selecting weekend activity:", error);
		// Return a fallback activity
		return {
			name: "Improv Comedy Night",
			type: "entertainment",
			description: "Last-minute tickets to a local improv show with drinks included.",
			duration: "2 hours",
			source: "fallback"
		};
	}
}

const selectedSeed = getRandomSeed();

// Function to build a dynamic weekend plans prompt
function buildWeekendPlansPrompt(city, duration, selectedActivity) {
	return `
It is 7:00 PM on a weekend night in ${city}. The coaches have approximately ${duration === "short" ? "under 90 minutes" : duration === "medium" ? "1–3 hours" : "more than 3 hours"} to do something together.

Tonight's selected activity is: **"${selectedActivity.name}"** — a ${selectedActivity.type}
> ${selectedActivity.description}

They will have a chaotic Slack-style conversation about what to do tonight, and MUST eventually agree (badly) to do this activity.

⸻

FORMAT:
CoachName 7:00 PM  
ultra-short, lowercase Slack message (most <10 words, many <5)

⸻

CAST (keep distinct voices):
- DonteDisrupt – buzzword prophet. lowercase only. "chaos is the strategy"
- AlexirAlex – wellness-obsessed. emoji abuser. says things like "energy" and "vibes"
- RohanTheShark – ruthless operator. one-word responses. "never" or "trash"
- VenusStrikes – tries to framework chaos and fails. uses Notion like a weapon.
- KaileyConnector – calendar anxiety personified. fully melting down.
- EljasCouncil – finnish mystic. sauna logic, compost wisdom, quietly strange.

⸻

STRUCTURAL RULES:
- 40% of messages MUST be under 6 words
- At least 5 messages MUST be single-word or emoji-only
- MAX 15 words per message
- include at least 3 typos
- break thread patterns — people talk over each other
- same timestamp sometimes (two posts at once)
- some messages get ignored
- abrupt topic changes (at least 2)
- someone posts twice in a row
- reference activity ideas no one understands
- someone tries to schedule a Notion doc party
- someone creates a fake framework for the night
- someone suggests something illegal and then walks it back
- someone quotes vibes like it's a source

⸻

CHARACTER ARCS (disguise as natural chaos):
- Donte creates "Operation NightDrive" or similar
- Kailey can't find calendar slots even for partying
- Venus tries to rank options in a matrix
- Rohan calls everything garbage and wants out
- Alex suggests moonlight meditation or vibesync
- Eljas says something about mushrooms or steam

⸻

TANGIBLE ARTIFACTS:
- 2 fake Notion docs or frameworks (e.g. "Party Metrics v0.2" or "The Chaos Ladder")
- 1 proposed invite or event name ("Full Moon Night Ops")

⸻

ENDING:
The convo must resolve with the coaches agreeing (chaotically) to do: **"${selectedActivity.name}"**

End with a mic-drop line like:
- "we're doing it. see you in the fog."
- "chaos is booked. 7:45 sharp."
- "i've created a doc called regret.ops"

⸻

REMEMBER:
This is raw, funny, human Slack. Meme-core meets founder meltdown. Make it overlap, unravel, and resolve — badly.
`;
}

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

// Initial placeholder messages array - will be updated in getGPTResponse
const messages = [
	{ role: "system", content: "placeholder" }, // Will be replaced with dynamic prompt
	// ...priorMessages,
	{ role: "user", content: userPrompt },
];

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

	// Improved regex to match the format: "CoachName Time AM/PM"
	// This handles various formats like "CoachName 9:00 AM" or "CoachName 10:15 PM"
	const headerMatch = line.match(/^(\w+)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i);
	
	if (headerMatch) {
		// This is a message header line
		return {
			type: "header",
			coach: headerMatch[1],
			timestamp: headerMatch[2].trim()
		};
	} else {
		// This is likely a content line
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

async function getGPTResponse(city = "Berlin") {
	try {
		// Validate the city
		const validCities = ["Berlin", "Vegas", "Tokyo"];
		if (!validCities.includes(city)) {
			console.warn(`Invalid city: ${city}. Using default city Berlin.`);
			city = "Berlin";
		}
		
		// Determine the appropriate duration based on available time
		// Read available time from environment variables (in minutes)
		const availableTime = process.env.AVAILABLE_TIME_MINUTES ? 
			parseInt(process.env.AVAILABLE_TIME_MINUTES, 10) : 60; // Default to 60 minutes if not specified
		
		console.log(`Available time: ${availableTime} minutes`);
		
		// Map available time to duration category
		let duration;
		if (availableTime < 90) {
			duration = "short";  // Under 90 minutes
		} else if (availableTime <= 180) {
			duration = "medium"; // 1-3 hours
		} else {
			duration = "long";   // More than 3 hours
		}
		
		console.log(`Selected duration category: ${duration} based on ${availableTime} minutes available`);
		
		// Get a random activity for this city and duration
		const selectedActivity = getRandomWeekendActivity(city, duration);
		
		console.log(`Weekend activity selected for ${city}: ${selectedActivity.name}`);

		// Build the dynamic prompt
		const weekendPrompt = buildWeekendPlansPrompt(city, duration, selectedActivity);
		
		// Update messages with the newly built prompt
		messages[0] = { role: "system", content: weekendPrompt };
		
		// Log the actual prompt AFTER it's been updated
		console.log("\n=== EXACT PROMPT SENT TO GPT ===\n");
		console.log(JSON.stringify(messages, null, 2));
		console.log("\n=== END PROMPT ===\n");

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
			
			// Check if this line has a coach name and timestamp format
			// Format: CoachName 9:00 AM
			const headerMatch = line.match(/^(\w+)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i);
			
			if (headerMatch) {
				// If we were building a previous message, finalize it now
				if (currentMessage) {
					structuredMessages.push(currentMessage);
					parsedContent++;
				}
				
				// Start a new message
				currentMessage = {
					coach: headerMatch[1],
					timestamp: headerMatch[2].trim(),
					content: "",
					rawLines: []
				};
				parsedHeaders++;
			} else if (currentMessage) {
				// Add content to the current message
				currentMessage.rawLines.push(line);
				
				// If current content is empty, this is the first content line
				if (!currentMessage.content) {
					currentMessage.content = line;
				} else {
					// Append with a space
					currentMessage.content += " " + line;
				}
			}
		}
		
		// Don't forget the last message
		if (currentMessage) {
			structuredMessages.push(currentMessage);
			parsedContent++;
		}
		
		console.log(`First pass completed: found ${parsedHeaders} headers and ${parsedContent} content blocks`);
		
		// Second pass: clean up and map coach names to IDs
		const finalMessages = structuredMessages.map(msg => {
			// Get the coach ID from the coach map, or infer it from content
			const coachId = coachMap[msg.coach] || inferCoachFromContent(msg.content);
			
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

		// Create weekend-conversations directory if it doesn't exist
		const meetingsDir = path.join(__dirname, "data", "weekend-conversations");
		if (!fs.existsSync(meetingsDir)) {
			fs.mkdirSync(meetingsDir, { recursive: true });
		}

		// Save the structured messages to a JSON file
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const jsonFilePath = path.join(meetingsDir, `weekend-${timestamp}.json`);
		
		// Create the data object to save, including the selected activity
		const dataToSave = {
			location: city,
			activity: selectedActivity,
			seed: selectedSeed.text,
			messages: validMessages
		};
		
		// Save everything to the JSON file
		fs.writeFileSync(jsonFilePath, JSON.stringify(dataToSave, null, 2));

		console.log(`Saved ${validMessages.length} structured messages with activity info to: ${jsonFilePath}`);
		
		// Print parsing stats
		console.log("\n=== PARSING STATS ===");
		console.log(`Total lines in response: ${lines.length}`);
		console.log(`Headers detected: ${parsedHeaders}`);
		console.log(`Content blocks: ${parsedContent}`);
		console.log(`Final message count: ${validMessages.length}`);
		console.log("=== END STATS ===\n");

		return {
			messages: validMessages,
			location: city,
			activity: selectedActivity
		};
	} catch (error) {
		console.error("Error in GPT response processing:", error);
		throw error;
	}
}

// Update the function call to include the city parameter
getGPTResponse("Berlin").catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});