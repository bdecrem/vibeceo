import { Client, Events, GatewayIntentBits } from "discord.js";
import { getNewsDiscussionTopic } from "@src/news/index.js";
import { startDiscussion, addToDiscussion } from "@lib/discord/discussion.js";
import { handleMessage as handleGroupChat } from "@lib/discord/handlers.js";
import { handlePitchCommand } from "@lib/discord/pitch.js";
import { formatCharacterList } from "@lib/discord/characters.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name and load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Available commands
const commands = {
	"!help": "Show this help message",
	"!character list": "List all available characters",
	"!character select [name]": "Select a character to talk to",
	"!discuss-news": "Start a new discussion about current tech news",
	"!group-chat [char1] [char2] [char3]":
		"Start a group discussion with 3 characters",
	"!pitch [your idea]":
		"Present your business idea to all coaches for feedback and voting",
};

// Track the current discussion
let currentDiscussion = {
	isActive: false,
	channelId: null,
	participatingCoaches: new Set(),
	messageCount: 0,
	lastMessageTime: null,
};

// Command handler
export async function handleCommand(message) {
	// Split into command and args, preserving hyphens in the command
	const fullCommand = message.content.slice(1);
	const spaceIndex = fullCommand.indexOf(" ");
	const command = (
		spaceIndex === -1 ? fullCommand : fullCommand.slice(0, spaceIndex)
	).toLowerCase();
	const args =
		spaceIndex === -1 ? [] : fullCommand.slice(spaceIndex + 1).split(/\s+/);

	try {
		switch (command) {
			case "help":
				const helpText = Object.entries(commands)
					.map(([cmd, desc]) => `${cmd}: ${desc}`)
					.join("\n");
				await message.reply(`Available commands:\n${helpText}`);
				break;

			case "discuss-news":
				try {
					// Get a news topic
					const topic = await getNewsDiscussionTopic();

					if (!topic) {
						await message.reply(
							"Sorry, I couldn't find any suitable news topics at the moment."
						);
						return;
					}

					// Start the discussion
					const started = await startDiscussion(topic);

					if (!started) {
						await message.reply(
							"A discussion is already in progress. Please wait for it to finish."
						);
						return;
					}

					// Set up discussion tracking
					currentDiscussion = {
						isActive: true,
						channelId: message.channelId,
						participatingCoaches: new Set(),
						messageCount: 0,
						lastMessageTime: Date.now(),
					};

					// Acknowledge the command
					await message.reply(
						"Starting a new discussion about: " + topic.title
					);

					// Schedule the discussion continuation
					continueDiscussion();
				} catch (error) {
					console.error("Error handling discuss-news command:", error);
					await message.reply(
						"Sorry, there was an error starting the discussion."
					);
				}
				break;

			case "pitch":
				// Check if an idea was provided
				if (args.length === 0) {
					await message.reply(
						"Please provide an idea to pitch! Usage: !pitch <your idea>"
					);
					return;
				}
				const idea = args.join(" ");
				await handlePitchCommand(message, idea);
				break;

			case "group-chat":
				// Check if coaches are specified
				if (args.length < 3) {
					await message.reply(
						"Please specify 3 coaches. Example: !group-chat alex donte rohan"
					);
					return;
				}
				const selectedCoaches = args
					.slice(0, 3)
					.map((name) => name.toLowerCase());
				const state = {
					participants: selectedCoaches,
					isDiscussing: false,
					messageCount: {},
					conversationHistory: [],
				};
				await handleGroupChat(message, state);
				break;

			case "coaches":
				const coachesList = await formatCharacterList();
				await message.reply(`Meet our amazing coaches:\n\n${coachesList}`);
				break;

			case "stop-discussion":
				if (currentDiscussion.isActive) {
					currentDiscussion.isActive = false;
					await message.reply("Discussion stopped.");
				} else {
					await message.reply("No active discussion to stop.");
				}
				break;

			default:
				await message.reply(
					"Unknown command. Type !help to see available commands."
				);
				break;
		}
	} catch (error) {
		console.error("Error handling command:", error);
		await message.reply("Sorry, there was an error processing your command.");
	}
}

// Continue the discussion by adding more coach messages
export async function continueDiscussion() {
	if (!currentDiscussion.isActive) return;

	const coaches = ["donte", "alex", "rohan", "venus", "eljas", "kailey"];
	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	try {
		// Add messages from coaches who haven't participated much
		for (const coach of coaches) {
			if (currentDiscussion.messageCount >= 25) break;

			await addToDiscussion(coach);
			currentDiscussion.participatingCoaches.add(coach);
			currentDiscussion.messageCount++;
			currentDiscussion.lastMessageTime = Date.now();

			// Random delay between messages (2-5 seconds)
			await delay(2000 + Math.random() * 3000);
		}

		// If discussion isn't complete, schedule more messages
		if (currentDiscussion.messageCount < 10) {
			setTimeout(continueDiscussion, 5000);
		}
	} catch (error) {
		console.error("Error continuing discussion:", error);
	}
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle incoming messages
client.on(Events.MessageCreate, async (message) => {
	// Ignore messages from bots
	if (message.author.bot) return;

	// Handle commands
	if (message.content.startsWith("!")) {
		await handleCommand(message);
	}
});

// Log in to Discord with your client's token
export function startBot() {
	return client.login(process.env.DISCORD_BOT_TOKEN);
}

// Export for testing
export const testHelpers = {
	client,
	handleCommand,
	getCurrentDiscussion: () => currentDiscussion,
	continueDiscussion,
};
