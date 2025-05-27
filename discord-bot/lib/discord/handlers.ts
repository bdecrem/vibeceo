import { Message, TextChannel, ThreadChannel, Client } from "discord.js";
import { ceos, CEO } from "../../data/ceos.js";
import { waterheaterIncidents } from "../../data/waterheater-incidents.js";
import {
	getCharacter,
	getCharacters,
	setActiveCharacter,
	handleCharacterInteraction,
	formatCharacterList,
	getActiveCharacter,
} from "./characters.js";
import { initializeWebhooks, sendAsCharacter } from "./webhooks.js";
import { generateCharacterResponse } from "./ai.js";
import { WebhookClient } from "discord.js";
import IORedis from "ioredis";
import { handlePitchCommand, handlePitchYCCommand } from "./pitch.js";
import { scheduler } from "./timer.js";
import { triggerNewsChat } from "./news.js";
import { triggerTmzChat } from "./tmz.js";
import { getNextMessage, handleAdminCommand } from "./adminCommands.js";
import { getCurrentStoryInfo, generateRandomCoachIrritation } from './bot.js';
import { formatStoryInfo } from './sceneFramework.js';
import {
	getRandomCharactersWithPairConfig,
	setWatercoolerPairConfig,
} from "./characterPairs.js";
import { getLocationAndTime, isWeekend } from "./locationTime.js";
import fs from "fs";
import path from "path";
import { sendEventMessage } from "./eventMessages.js";
import { getWatercoolerPairConfig } from "./characterPairs.js";
import { triggerStaffMeeting } from "./staffMeeting.js";
import { COACH_DISCORD_HANDLES } from './coachHandles.js';
import { DISCORD_CONFIG } from "./config.js";
import OpenAI from "openai";

// Message deduplication system
class MessageDeduplication {
	private redis: IORedis | null = null;
	private memoryCache: Map<string, number> = new Map();
	private readonly CACHE_EXPIRY = 300000; // 5 minutes in ms

	constructor() {
		// Initialize Redis if URL is provided
		if (process.env.REDIS_URL) {
			try {
				this.redis = new IORedis(process.env.REDIS_URL);
				console.log("Redis connected successfully");
			} catch (error) {
				console.error("Failed to connect to Redis:", error);
				console.log("Falling back to in-memory cache");
			}
		} else {
			console.log("No Redis URL provided, using in-memory cache");
		}
	}

	async isMessageProcessed(messageId: string): Promise<boolean> {
		try {
			if (this.redis) {
				// Try Redis first
				const key = `processed:${messageId}`;
				const result = await this.redis.set(key, "1", "EX", 300, "NX");
				return result === null; // If null, key already existed
			} else {
				// Use in-memory cache
				const now = Date.now();
				if (this.memoryCache.has(messageId)) {
					return true;
				}
				this.memoryCache.set(messageId, now);

				// Cleanup old entries
				for (const [key, timestamp] of this.memoryCache.entries()) {
					if (now - timestamp > this.CACHE_EXPIRY) {
						this.memoryCache.delete(key);
					}
				}
				return false;
			}
		} catch (error) {
			console.error("Error checking message status:", error);
			// On error, fall back to in-memory cache
			return this.memoryCache.has(messageId);
		}
	}

	async cleanup() {
		if (this.redis) {
			await this.redis.quit();
		}
		this.memoryCache.clear();
	}
}

// Initialize message deduplication
const messageDedup = new MessageDeduplication();

// Export cleanup function
export async function cleanup() {
	await messageDedup.cleanup();
}

// Command prefix for bot commands
const PREFIX = "!";

// Natural language triggers for character selection
const NATURAL_TRIGGERS = ["hey", "hi", "hello", "yo"];

// Track active group chats and their discussion states
interface GroupChatState {
	participants: string[];
	topic?: string;
	isDiscussing: boolean;
	messageCount: Record<string, number>;
	conversationHistory: Array<{ character: string; message: string }>;
}

const activeGroupChats = new Map<string, GroupChatState>();

// Handle group chat interactions
async function handleGroupChat(message: Message, state: GroupChatState) {
	try {
		// If no topic set, this message becomes the topic
		if (!state.topic) {
			state.topic = message.content;
			state.isDiscussing = true;
			state.conversationHistory = [];
			await message.reply(
				`Great! The coaches will discuss: "${message.content}"`
			);

			// Start the discussion with a random character
			const firstCharacter = getCharacter(state.participants[0]);
			if (firstCharacter) {
				const contextPrompt = `You are starting a group discussion about: "${
					message.content
				}".
        You are discussing this with ${state.participants
					.slice(1)
					.map((id) => getCharacter(id)?.name)
					.join(" and ")}.
        Share your initial thoughts on this topic, speaking in your unique voice and style.`;

				const response = await generateCharacterResponse(
					firstCharacter.prompt + "\n" + contextPrompt,
					message.content
				);
				await sendAsCharacter(message.channelId, firstCharacter.id, response);
				state.messageCount[firstCharacter.id] = 1;
				state.conversationHistory.push({
					character: firstCharacter.id,
					message: response,
				});

				// Queue up next response
				setTimeout(() => continueDiscussion(message.channelId, state), 2000);
			}
			return;
		}

		// If already discussing and user sends a message, have a character respond if possible
		if (state.isDiscussing) {
			// Check if any character has messages left
			const totalMessages = Object.values(state.messageCount).reduce(
				(a, b) => a + b,
				0
			);
			if (totalMessages >= 9) {
				return; // All messages used up
			}

			// Find eligible characters (haven't spoken 3 times and weren't last to speak)
			const eligibleCharacters = state.participants.filter(
				(id) =>
					(state.messageCount[id] || 0) < 3 &&
					id !==
						state.conversationHistory[state.conversationHistory.length - 1]
							?.character
			);

			if (eligibleCharacters.length > 0) {
				// Pick random eligible character, preferring those who have spoken less
				const leastSpokenCount = Math.min(
					...eligibleCharacters.map((id) => state.messageCount[id] || 0)
				);
				const priorityCharacters = eligibleCharacters.filter(
					(id) => (state.messageCount[id] || 0) === leastSpokenCount
				);
				const respondingCharacter = getCharacter(
					priorityCharacters[
						Math.floor(Math.random() * priorityCharacters.length)
					]
				);

				if (respondingCharacter) {
					// Get context of recent messages including user's
					let contextMessages = [`User: "${message.content}"`];
					if (state.conversationHistory.length > 0) {
						const lastMessage =
							state.conversationHistory[state.conversationHistory.length - 1];
						contextMessages.unshift(
							`${getCharacter(lastMessage.character)?.name}: "${
								lastMessage.message
							}"`
						);
					}

					const contextPrompt = `You are ${
						respondingCharacter.name
					} in a group discussion about "${state.topic}".
          The user just said: "${message.content}"

          Recent messages:
          ${contextMessages.join("\n")}

          Respond briefly to the user's message while staying in character and on topic.
          Keep your response focused and concise (1-2 sentences).`;

					const response = await generateCharacterResponse(
						respondingCharacter.prompt + "\n" + contextPrompt,
						message.content
					);
					await sendAsCharacter(
						message.channelId,
						respondingCharacter.id,
						response
					);
					state.messageCount[respondingCharacter.id] =
						(state.messageCount[respondingCharacter.id] || 0) + 1;
					state.conversationHistory.push({
						character: respondingCharacter.id,
						message: response,
					});

					// Continue the discussion after responding to user
					const delay = 1500 + Math.random() * 1000;
					setTimeout(() => continueDiscussion(message.channelId, state), delay);
				}
			}
		}
	} catch (error) {
		console.error("Error in group chat:", error);
		await message.reply("Sorry, there was an error in the group chat.");
	}
}

// Continue the discussion among characters
async function continueDiscussion(channelId: string, state: GroupChatState) {
	try {
		// Check if discussion should continue
		const totalMessages = Object.values(state.messageCount).reduce(
			(a, b) => a + b,
			0
		);
		if (totalMessages >= 9) {
			// 3 messages each for 3 participants
			state.isDiscussing = false;
			activeGroupChats.delete(channelId);
			const client = new WebhookClient({
				url: process.env.WEBHOOK_URL_SYSTEM || "",
			});
			await client.send("The discussion has concluded!");
			return;
		}

		// Find characters who haven't spoken enough
		const eligibleCharacters = state.participants.filter(
			(id) =>
				(state.messageCount[id] || 0) < 3 &&
				id !==
					state.conversationHistory[state.conversationHistory.length - 1]
						?.character
		);

		if (eligibleCharacters.length === 0) return;

		// Pick random eligible character, but prefer those who have spoken less
		const leastSpokenCount = Math.min(
			...eligibleCharacters.map((id) => state.messageCount[id] || 0)
		);
		const priorityCharacters = eligibleCharacters.filter(
			(id) => (state.messageCount[id] || 0) === leastSpokenCount
		);
		const nextCharacterId =
			priorityCharacters[Math.floor(Math.random() * priorityCharacters.length)];
		const nextCharacter = getCharacter(nextCharacterId);

		if (!nextCharacter) return;

		// Get more focused context - last message and one other relevant message
		let contextMessages = [];
		const lastMessage =
			state.conversationHistory[state.conversationHistory.length - 1];
		contextMessages.push(
			`${getCharacter(lastMessage.character)?.name}: "${lastMessage.message}"`
		);

		// Find one earlier message from another character that's most relevant
		for (let i = state.conversationHistory.length - 2; i >= 0; i--) {
			const msg = state.conversationHistory[i];
			if (
				msg.character !== lastMessage.character &&
				msg.character !== nextCharacterId
			) {
				contextMessages.unshift(
					`${getCharacter(msg.character)?.name}: "${msg.message}"`
				);
				break;
			}
		}

		const contextPrompt = `You are ${
			nextCharacter.name
		} in a quick group discussion about "${
			state.topic
		}" with ${state.participants
			.filter((id) => id !== nextCharacterId)
			.map((id) => getCharacter(id)?.name)
			.join(" and ")}.

    Recent messages:
    ${contextMessages.join("\n")}

    Respond briefly and naturally to what was just said, adding your perspective while staying in character.
    Keep your response focused and concise (1-2 sentences).`;

		const response = await generateCharacterResponse(
			nextCharacter.prompt + "\n" + contextPrompt,
			lastMessage.message
		);
		await sendAsCharacter(channelId, nextCharacter.id, response);
		state.messageCount[nextCharacter.id] =
			(state.messageCount[nextCharacter.id] || 0) + 1;
		state.conversationHistory.push({
			character: nextCharacter.id,
			message: response,
		});

		// Vary the timing between responses to feel more natural
		if (Object.values(state.messageCount).reduce((a, b) => a + b, 0) < 9) {
			const delay = 1500 + Math.random() * 1000; // Random delay between 1.5-2.5 seconds
			setTimeout(() => continueDiscussion(channelId, state), delay);
		}
	} catch (error) {
		console.error("Error continuing discussion:", error);
	}
}

// Get story context based on scene index
export function getStoryContext(
	sceneIndex: number
): { intensity: number; context: string; promptInjection: string } | null {
	try {
		const storyArcs = JSON.parse(
			fs.readFileSync(
				path.join(process.cwd(), "data", "story-themes", "story-arcs.json"),
				"utf-8"
			)
		);
		const selectedArc = storyArcs.storyArcs.donte.getting_irritated_by_kailey;

		if (!selectedArc) {
			console.error("Story arc not found in story-arcs.json");
			return null;
		}

		// Determine time of day based on scene index (24 scenes per episode)
		let timeOfDay: "morning" | "midday" | "afternoon";
		if (sceneIndex < 8) timeOfDay = "morning"; // Scenes 0-7
		else if (sceneIndex < 16) timeOfDay = "midday"; // Scenes 8-15
		else timeOfDay = "afternoon"; // Scenes 16-23

		// Get the progression data for the current time of day
		const progression = selectedArc.progression.scenes[timeOfDay];
		// Get the specific intensity level for this scene (0-7 within the time period)
		const sceneIndexInPeriod = sceneIndex % 8;
		const intensity = progression[sceneIndexInPeriod];

		// Get the appropriate context for this intensity level
		const levelContext = Object.entries(selectedArc.levelContexts).reduce(
			(closest, [level, context]) => {
				const levelNum = parseFloat(level);
				return Math.abs(levelNum - intensity) <
					Math.abs(parseFloat(closest[0]) - intensity)
					? [level, context]
					: closest;
			},
			["0.2", ""]
		)[1];

		return {
			intensity,
			context: selectedArc.context,
			promptInjection: selectedArc.promptInjection
				.replace("{level}", intensity.toString())
				.replace("{context}", levelContext),
		};
	} catch (error) {
		console.error("Error reading story context:", error);
		return null;
	}
}

// Select a story arc (hardcoded to Donte's irritation by Kailey)
export function selectStoryArc() {
	try {
		const storyArcs = JSON.parse(
			fs.readFileSync(
				path.join(process.cwd(), "data", "story-themes", "story-arcs.json"),
				"utf-8"
			)
		);
		const arc = storyArcs.storyArcs.donte.getting_irritated_by_kailey;

		// If probability is 0, return null to indicate no story arc
		if (arc.watercoolerPresence.probability === 0) {
			return null;
		}

		return arc;
	} catch (error) {
		console.error("Error selecting story arc:", error);
		return null;
	}
}

// Initialize story arc configuration
export function initializeStoryArc() {
	try {
		const selectedArc = selectStoryArc();

		if (!selectedArc) {
			console.log("No story arc active (probability is 0)");
			return;
		}

		const { requiredCharacters, probability, speakingOrder } =
			selectedArc.watercoolerPresence;

		// Set up character pair configuration from story arc data
		setWatercoolerPairConfig({
			coach1: requiredCharacters[0],
			coach2: requiredCharacters[1] || requiredCharacters[0],
			probability: probability,
			order: {
				first: speakingOrder.first,
				second: speakingOrder.second,
			},
		});
		console.log("Story arc configuration initialized:", {
			arc: selectedArc.context,
			characters: requiredCharacters,
			probability,
			speakingOrder,
		});
	} catch (error) {
		console.error("Error initializing story arc:", error);
	}
}

// Watercooler chat function that can be called directly or by timer
export async function triggerWatercoolerChat(
	channelId: string,
	client: Client
) {
	try {
		// Diagnostic logging for watercooler pair config
		const pairConfig = getWatercoolerPairConfig();
		console.log(
			"[DIAGNOSTIC] Current watercoolerPairConfig:",
			JSON.stringify(pairConfig, null, 2)
		);

		console.log("Starting watercooler chat for channel:", channelId);
		const characters = getCharacters();
		console.log(
			"Available characters:",
			characters.map((c) => c.name).join(", ")
		);

		// Check for admin message
		const adminMessage = getNextMessage("watercooler");

		// Get current scene index from episode context
		const storyInfo = getCurrentStoryInfo();
		const sceneIndex = storyInfo?.sceneIndex ?? 0;
		console.log("[WATERCOOLER] Current scene index:", sceneIndex);

		// Read story arcs and current irritation
		const storyArcsPath = path.join(
			process.cwd(),
			"data",
			"story-themes",
			"story-arcs.json"
		);
		const storyArcs = JSON.parse(fs.readFileSync(storyArcsPath, "utf-8"));
		const currentIrritation = storyArcs.currentIrritation;

		// Check if we should apply irritation based on currentIrritation probability
		const shouldApplyIrritation =
			currentIrritation &&
			currentIrritation.probability > 0 &&
			Math.random() < currentIrritation.probability;

		console.log("[WATERCOOLER] Irritation check:", {
			hasIrritation: !!currentIrritation,
			probability: currentIrritation?.probability,
			shouldApply: shouldApplyIrritation,
		});

		// If applying irritation, get the correct intensity based on time of day
		let intensity = 0;
		if (shouldApplyIrritation) {
			// Determine time of day based on scene index (24 scenes per episode)
			let timeOfDay: "morning" | "midday" | "afternoon";
			if (sceneIndex < 8) timeOfDay = "morning"; // Scenes 0-7
			else if (sceneIndex < 16) timeOfDay = "midday"; // Scenes 8-15
			else timeOfDay = "afternoon"; // Scenes 16-23

			// Get the specific intensity level for this scene (0-7 within the time period)
			const sceneIndexInPeriod = sceneIndex % 8;
			intensity = currentIrritation.intensity[timeOfDay][sceneIndexInPeriod];

			console.log("\n=== WATERCOOLER INTENSITY DEBUG ===");
			console.log(`Scene Index: ${sceneIndex}`);
			console.log(`Time of Day: ${timeOfDay}`);
			console.log(`Scene Index in Period: ${sceneIndexInPeriod}`);
			console.log(
				`Intensity Array: [${currentIrritation.intensity[timeOfDay].join(
					", "
				)}]`
			);
			console.log(`Selected Intensity: ${intensity}`);
			console.log("================================\n");

			console.log("[WATERCOOLER] Irritation intensity:", {
				timeOfDay,
				sceneIndexInPeriod,
				intensity,
			});
		}

		// If applying irritation, ensure the irritated coach is included
		let selectedCharacterIds;
		if (shouldApplyIrritation) {
			// Force target to speak first, coach to speak second
			selectedCharacterIds = [
				currentIrritation.target,
				currentIrritation.coach,
			];
			// Then get 1 more random coach, excluding both target and coach
			const otherCoaches = getCharacters()
				.filter(
					(c) =>
						c.id !== currentIrritation.target &&
						c.id !== currentIrritation.coach
				)
				.map((c) => c.id);
			const randomCoach =
				otherCoaches[Math.floor(Math.random() * otherCoaches.length)];
			selectedCharacterIds.push(randomCoach);

			console.log("[WATERCOOLER] Enforced speaking order:", {
				first: currentIrritation.target,
				second: currentIrritation.coach,
				third: randomCoach,
			});
		} else {
			// If not applying irritation, just get 3 random coaches
			selectedCharacterIds = getRandomCharactersWithPairConfig(3);
		}

		const selectedCharacters = selectedCharacterIds.map((id) =>
			getCharacter(id)
		);

		// Validate that we have all required characters
		if (selectedCharacters.some((char) => !char)) {
			console.error("Invalid character IDs selected:", selectedCharacterIds);
			throw new Error("Failed to get valid characters for watercooler chat");
		}

		// After validation, we know all characters are defined
		const validCharacters = selectedCharacters as CEO[];
		console.log(
			"Selected characters:",
			validCharacters.map((c) => c.name).join(", ")
		);

		// Get story context if Donte is present
		const storyContext = selectedCharacterIds.includes("donte")
			? getStoryContext(sceneIndex)
			: null;
		console.log("[WATERCOOLER] Story context for Donte:", {
			hasContext: !!storyContext,
			intensity: storyContext?.intensity,
			context: storyContext?.context,
			promptInjection: storyContext?.promptInjection,
		});

		const selectedArc = storyContext ? selectStoryArc() : null;
		console.log("[WATERCOOLER] Selected story arc:", {
			hasArc: !!selectedArc,
			promptAttribute: selectedArc?.promptAttribute,
			context: selectedArc?.context,
		});

		// First coach shares something about their day or the admin message
		let firstMessage;
		if (adminMessage) {
			// Generate Donte's message in his own voice, using the admin message as a seed
			const dontePrompt = `You are Donte, the hyper-efficient, control-obsessed startup founder who's always optimizing everything.

First, state this situation: Your dog is staying with you for a week and disrupting your carefully controlled environment.

Then, express your deep frustration about this in your characteristic voice.

IMPORTANT DONTE TRAITS TO INCLUDE:
1. Always frame things in terms of efficiency, optimization, or control
2. Use startup/tech analogies and metrics
3. Mention specific tools, systems, or processes you use
4. Show mild irritation at inefficiency
5. Reference your perfectly organized workspace or routines

Example voice: "My dog is staying with me this week, and it's catastrophic. My workspace efficiency has dropped 47% due to random bark interruptions. My Pomodoro timer can't sync with these unpredictable pet variables!"

Make it authentically Donte, with his obsession with control and optimization. Always start by mentioning the dog situation, then dive into your optimization complaints. (max 50 words)`;
			firstMessage = await generateCharacterResponse(
				validCharacters[0].prompt + "\n" + dontePrompt,
				adminMessage
			);
			await sendAsCharacter(channelId, validCharacters[0].id, firstMessage);
			console.log("First message (Donte, generated) sent successfully");
		} else {
			console.log("Generating first message...");
			let firstPrompt;
			
			// Check if it's weekend and the character is Alex
			if (validCharacters[0].id === 'alex' && isWeekend()) {
				console.log("Using tipsy Alex prompt for first message (weekend)");
				firstPrompt = `You are Alex Monroe, a wellness tech founder currently enjoying the weekend nightlife. You're tipsy and having a great time letting loose after a busy week. Share a brief update about something fun you're doing this weekend.
				
				Your communication style is:
				- You speak in a mix of tech startup jargon and wellness buzzwords, but your speech is more casual and loose than usual
				- You occasionally miss words or use light slang due to being tipsy
				- You're more enthusiastic and emotional than during the workweek
				- You make references to parties, clubs, and weekend adventures
				- You mention experimental wellness treatments you've been trying
				- You occasionally laugh a bit too much at your own comments
				
				Keep it natural, fun and in your tipsy weekend voice (max 30 words).`;
			} else {
				firstPrompt = `You are ${validCharacters[0].name}. Share a brief, authentic update about something that happened today that relates to your background (${validCharacters[0].character}). For example, if you're Donte, maybe you just came from a heated debate about startup valuations, or if you're Venus, maybe you just updated your energy consumption models. Keep it natural and in your voice (max 30 words).`;
			}
			
			firstMessage = await generateCharacterResponse(
				validCharacters[0].prompt + "\n" + firstPrompt,
				"random_update"
			);
			console.log(
				"First message generated:",
				firstMessage.substring(0, 50) + "..."
			);
			await sendAsCharacter(channelId, validCharacters[0].id, firstMessage);
			console.log("First message sent successfully");
		}

		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Second coach responds
		console.log("Generating second message...");
		let secondPrompt = "";
		
		// Check if it's weekend and the character is Alex
		if (validCharacters[1].id === 'alex' && isWeekend()) {
			console.log("Using tipsy Alex prompt for second message (weekend)");
			secondPrompt = `You are Alex Monroe, a wellness tech founder currently enjoying the weekend nightlife. You're tipsy and having a great time letting loose after a busy week. ${validCharacters[0].name} just said: "${firstMessage}"
			
			Your communication style is:
			- You speak in a mix of tech startup jargon and wellness buzzwords, but your speech is more casual and loose than usual
			- You occasionally miss words or use light slang due to being tipsy
			- You're more enthusiastic and emotional than during the workweek
			- You make references to parties, clubs, and weekend adventures
			- You mention experimental wellness treatments you've been trying
			- You occasionally laugh a bit too much at your own comments
			
			Respond to their message in your tipsy weekend voice (max 30 words).`;
		} else if (
			shouldApplyIrritation &&
			validCharacters[1].id === currentIrritation.coach
		) {
			console.log(
				"[WATERCOOLER] Applying irritation for",
				currentIrritation.coach,
				"towards",
				currentIrritation.target
			);

			// Get the story arc for this irritation
			const storyArc =
				storyArcs.storyArcs[currentIrritation.coach]?.[
					`getting_irritated_by_${currentIrritation.target}`
				];
			if (storyArc) {
				// Get the appropriate level context based on intensity
				const levelContext =
					storyArc.levelContexts[Math.round(intensity * 10) / 10] ||
					storyArc.levelContexts["0.6"];
				const promptInjection = storyArc.promptInjection
					.replace("{level}", intensity.toString())
					.replace("{context}", levelContext);

				secondPrompt = `You are ${validCharacters[1].name}. ${validCharacters[0].name} just said: "${firstMessage}"\n\n${promptInjection}

Your response MUST show clear signs of irritation through:
1. Being dismissive or condescending
2. Using short, clipped responses
3. Focusing on efficiency and optimization
4. Showing frustration with inefficiency
5. Using startup/tech analogies to criticize

The intensity of your irritation is ${intensity} (where 0 is calm and 1 is extremely irritated).
- At 0.0: Stay completely calm and professional
- At 0.4: Show mild frustration with their approach
- At 0.6: Show active frustration with their methods and approach
- At 1.0: Show complete frustration and be openly hostile

Keep it under 30 words and make your irritation level match the intensity.`;
			} else {
				// Fallback to default irritation prompt if story arc not found
				secondPrompt = `You are ${validCharacters[1].name}. ${validCharacters[0].name} just said: "${firstMessage}"

Your irritation with ${currentIrritation.target}'s approach is at level ${intensity} (where 0 is calm and 1 is extremely irritated).

Your response MUST show clear signs of irritation through:
1. Being dismissive or condescending
2. Using short, clipped responses
3. Focusing on efficiency and optimization
4. Showing frustration with inefficiency
5. Using startup/tech analogies to criticize

The intensity of your irritation is ${intensity} (where 0 is calm and 1 is extremely irritated).
- At 0.0: Stay completely calm and professional
- At 0.4: Show mild frustration with their approach
- At 0.6: Show active frustration with their methods and approach
- At 1.0: Show complete frustration and be openly hostile

Keep it under 30 words and make your irritation level match the intensity.`;
			}
		} else {
			secondPrompt = `You are ${validCharacters[1].name} (${validCharacters[1].character}). ${validCharacters[0].name} just said: "${firstMessage}". Respond to their update with your unique perspective and background. Stay true to your character's personality and interests. Keep it natural and in your voice (max 30 words).`;
		}
		const secondMessage = await generateCharacterResponse(
			validCharacters[1].prompt + "\n" + secondPrompt,
			firstMessage
		);
		console.log(
			"Second message generated:",
			secondMessage.substring(0, 50) + "..."
		);
		await sendAsCharacter(channelId, validCharacters[1].id, secondMessage);
		console.log("Second message sent successfully");

		// Add another small delay
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Third coach responds
		console.log("Generating third message...");
		let thirdPrompt = "";
		
		// Check if it's weekend and the character is Alex
		if (validCharacters[2].id === 'alex' && isWeekend()) {
			console.log("Using tipsy Alex prompt for third message (weekend)");
			thirdPrompt = `You are Alex Monroe, a wellness tech founder currently enjoying the weekend nightlife. You're tipsy and having a great time letting loose after a busy week. Responding to this exchange:
			${validCharacters[0].name}: "${firstMessage}"
			${validCharacters[1].name}: "${secondMessage}"
			
			Your communication style is:
			- You speak in a mix of tech startup jargon and wellness buzzwords, but your speech is more casual and loose than usual
			- You occasionally miss words or use light slang due to being tipsy
			- You're more enthusiastic and emotional than during the workweek
			- You make references to parties, clubs, and weekend adventures
			- You mention experimental wellness treatments you've been trying
			- You occasionally laugh a bit too much at your own comments
			
			Respond to their conversation in your tipsy weekend voice (max 30 words).`;
		} else if (
			storyContext &&
			validCharacters[2].id === "donte" &&
			selectedArc &&
			selectedArc.promptAttribute === "engagement" &&
			storyContext.intensity === 1.0
		) {
			// Strong override for max distraction
			thirdPrompt = `You are Donte. You are completely distracted and not paying attention to the conversation.\n\nIMPORTANT: Ignore the previous messages. Your reply should be off-topic, rambling, or show you missed the point. For example, you might talk about something unrelated, ask what's going on, or mention you zoned out.`;
		} else {
			thirdPrompt = `You are ${validCharacters[2].name} (${
				validCharacters[2].character
			}). Responding to this exchange:\n    ${
				validCharacters[0].name
			}: "${firstMessage}"\n    ${
				validCharacters[1].name
			}: "${secondMessage}"\n    ${
				storyContext && validCharacters[2].id === "donte" && selectedArc
					? `\n\nIMPORTANT: ${storyContext.promptInjection}\n\nCurrent context: ${storyContext.context} (${selectedArc.promptAttribute} level: ${storyContext.intensity})\n\nYour response should clearly reflect this level of ${selectedArc.promptAttribute}.`
					: ""
			} Add your unique perspective based on your background and personality. Keep it authentic to your character and concise (max 30 words).`;
		}
		const thirdMessage = await generateCharacterResponse(
			validCharacters[2].prompt + "\n" + thirdPrompt,
			firstMessage + " " + secondMessage
		);
		console.log(
			"Third message generated:",
			thirdMessage.substring(0, 50) + "..."
		);
		await sendAsCharacter(channelId, validCharacters[2].id, thirdMessage);
		console.log("Third message sent successfully");

		// Send outro message indicating coaches have scattered
		if (client) {
			const channel = await client.channels.fetch(channelId);
			if (channel && (channel instanceof TextChannel)) {
				await channel.send("The coaches have scattered.");
			}
		}
		console.log("Watercooler chat completed with outro message");
	} catch (error) {
		console.error("Error in watercooler chat:", error);
		throw error;
	}
}

// Waterheater chat function that can be called directly or by timer
export async function triggerWaterheaterChat(
	channelId: string,
	client: Client,
	selectedIncident?: { text: string; intro: string } | null,
	selectedCoachId?: string
) {
	try {
		console.log("\n=== WATERHEATER CHAT STARTED ===");

		// Get available characters
		const availableCharacters = ceos.filter(
			(char: CEO) => char.id !== "system"
		);

		// Check for admin message
		const adminMessage = getNextMessage("waterheater");
		let randomCoach: CEO;
		let selectedIssue: { text: string; intro: string };

		if (adminMessage) {
			// Parse admin message in format "coach:issue"
			const [coachId, issue] = adminMessage.split(":");
			const foundCoach = availableCharacters.find(
				(c) => c.id === coachId.toLowerCase()
			);
			if (!foundCoach) {
				throw new Error(`Invalid coach ID in admin message: ${coachId}`);
			}
			randomCoach = foundCoach;
			selectedIssue = {
				text: issue.trim(),
				intro: issue.trim(),
			};
		} else if (selectedCoachId && selectedIncident) {
			// Use the pre-selected coach and incident
			const foundCoach = availableCharacters.find(
				(c) => c.id === selectedCoachId
			);
			if (!foundCoach) {
				throw new Error(`Invalid selected coach ID: ${selectedCoachId}`);
			}
			randomCoach = foundCoach;
			selectedIssue = selectedIncident;
		} else {
			// Auto-select random coach and incident
			randomCoach =
				availableCharacters[
					Math.floor(Math.random() * availableCharacters.length)
				];
			const coachIncidents = waterheaterIncidents.find(
				(c: { id: string }) => c.id === randomCoach.id
			);
			if (!coachIncidents) {
				throw new Error(`No incidents found for coach ${randomCoach.name}`);
			}

			// Debug logging for incident selection
			console.log("\n=== INCIDENT SELECTION DEBUG ===");
			console.log(
				`Available incidents for ${randomCoach.name}:`,
				coachIncidents.incidents
			);
			const randomIndex = Math.floor(
				Math.random() * coachIncidents.incidents.length
			);
			console.log(
				`Random index selected: ${randomIndex} out of ${coachIncidents.incidents.length} incidents`
			);
			selectedIssue = coachIncidents.incidents[randomIndex];
			console.log(`Selected incident: "${selectedIssue.text}"`);
			console.log(`Selected intro: "${selectedIssue.intro}"`);
			console.log("=== END INCIDENT SELECTION DEBUG ===\n");
		}

		// Select two additional coaches
		const otherCoaches = availableCharacters.filter(
			(c: CEO) => c.id !== randomCoach.id
		);
		const secondCoach =
			otherCoaches[Math.floor(Math.random() * otherCoaches.length)];
		const thirdCoach = otherCoaches.filter((c: CEO) => c.id !== secondCoach.id)[
			Math.floor(Math.random() * (otherCoaches.length - 1))
		];

		// Log the initial setup
		console.log("\n=== WATERHEATER SETUP ===");
		console.log(`Affected Coach: ${randomCoach.name}`);
		console.log(`Incident: "${selectedIssue.text}"`);
		console.log(`Intro: "${selectedIssue.intro}"`);
		console.log("\nParticipants:");
		console.log(`1. ${randomCoach.name} (Affected Coach)`);
		console.log(`2. ${secondCoach.name} (Coach B - Supportive/Neutral)`);
		console.log(`3. ${thirdCoach.name} (Coach C - Will trigger tension)`);

		// Message 1: Affected Coach casually shares incident
		const firstMessage = await generateCharacterResponse(
			randomCoach.prompt,
			`You are ${randomCoach.name}. Write 1 Discord-style message about this specific incident:

The incident was: "${selectedIssue.text}"

IMPORTANT:
1. You MUST directly reference the incident - no additional context or backstory
2. DO NOT repeat the incident text exactly - rephrase it in first person
3. Use first person ("I", "my", "me") - this is crucial
4. Express your immediate, authentic reaction to what happened
5. Keep it simple and concrete - no philosophical lessons or abstract concepts
6. Stay true to your character's voice and personality
7. Keep it under 30 words
8. Do NOT put your message in quotation marks.

Example style for Venus: Yikes, I thought I added a clever optimization but instead it kicked everyone off my project board. Brrr
Example style for Donte: My efficiency algorithm just kicked everyone off the board. 47% productivity drop. Not optimal.
Example style for Kailey: Ugh, my favorite pen broke right before I was about to journal. Now I have to find another one that writes just as smoothly.

BAD EXAMPLE (don't use third person): "He wrote a long anti-capitalist rant... in the wrong channel. Oops, that's a compost-worthy mix-up!"
GOOD EXAMPLE (use first person): "I accidentally posted my anti-capitalist rant in the wrong channel. Classic me, always mixing up my revolutionary manifestos."`
		);
		await sendAsCharacter(channelId, randomCoach.id, firstMessage);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Message 2: Coach B responds supportively
		const secondMessage = await generateCharacterResponse(
			secondCoach.prompt,
			`You are ${secondCoach.name}. Respond to ${randomCoach.name}'s message about "${selectedIssue.text}".

IMPORTANT:
1. Keep it to 25 words maximum
2. Use 1-2 short lines only
3. React with mild support, curiosity, or neutrality
4. No advice or analysis
5. Stay in character
6. Do not escalate or criticize
7. Limit to 25 words. Sound like a real person, not a press release.

Example style: Oh no, that's rough. Maybe try a different approach next time?`
		);
		await sendAsCharacter(channelId, secondCoach.id, secondMessage);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Message 3: Coach C responds with friction
		const thirdMessage = await generateCharacterResponse(
			thirdCoach.prompt,
			`You are ${thirdCoach.name}. Respond to the ongoing conversation about "${selectedIssue.text}".

IMPORTANT:
1. Keep it to 30 words maximum
2. Use 1-2 lines only
3. Be blunt or lightly mocking
4. No tangents or explanations
5. Stay fully in character
6. You're not trying to start a fight—but say something that rubs ${randomCoach.name} the wrong way
7. Be dismissive, dry, or subtly mocking. Don't monologue, and don't get mean. Keep it sharp, not hostile.
8. Be sharp but dry. Avoid metaphors or lectures. Let the critique land clean in one line. Max 30 words.

Example style: Sounds like a skill issue to me. Maybe you should've thought that through first?`
		);
		await sendAsCharacter(channelId, thirdCoach.id, thirdMessage);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Message 4: Affected Coach pushes back
		const fourthMessage = await generateCharacterResponse(
			randomCoach.prompt,
			`You are ${randomCoach.name}. You're starting to get annoyed at ${thirdCoach.name} for how they responded.

IMPORTANT:
1. Keep it to 25 words maximum
2. Be dry, clipped, and reactive
3. No full argument or defense
4. Stay in character
5. Don't overreact
6. Let the tension come through in your tone
7. Respond in one or two clipped lines. No explaining. Max 25 words.

Example style: Thanks for the brilliant insight. Really helpful.`
		);
		await sendAsCharacter(channelId, randomCoach.id, fourthMessage);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Message 5: Coach B follows up as mediator
		const fifthMessage = await generateCharacterResponse(
			secondCoach.prompt,
			`You are ${secondCoach.name}. Respond to the tension between ${randomCoach.name} and ${thirdCoach.name}.

IMPORTANT:
1. Keep it to 40 words maximum
2. Take on a mediator role
3. Use your character's unique perspective
4. Keep it light but meaningful
5. Stay in character
6. Can be slightly longer if it fits your voice (e.g. Rohan or Venus)
7. Respond in your voice, but don't explain a philosophy. You can propose something (e.g. co-author a zine), but keep it snappy.
8. Choose to soothe or escalate. Either way, keep it under 35 words. No TED talk monologues — stay grounded and specific.

Example style: You two should co-author a zine: 'Triggered by Tools: Notes on Emotional Infrastructure.'
Example style: Maybe we all need a moment to recalibrate our energy fields here.`
		);
		await sendAsCharacter(channelId, secondCoach.id, fifthMessage);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Message 6: Affected Coach closes
		const sixthMessage = await generateCharacterResponse(
			randomCoach.prompt,
			`You are ${randomCoach.name}. Write 1 final Discord-style message to close the conversation.

IMPORTANT:
1. You are still annoyed at ${thirdCoach.name} — let that show.
2. End with one cold or cutting line. Then add one short personal-flavor line (spiritual, sarcastic, etc.). Combined max: 25 words.
3. Keep it dry, clipped, or cold — do NOT resolve the tension.
4. Use one sharp sentence directed at ${thirdCoach.name}.
5. Then add one more line that reflects your character's personal style or belief system — something low-key iconic, ironic, or spiritual (depending on the coach).
6. Do NOT put your message in quotation marks.

Example for Alex:
Not impressed, Donte. Time to elevate your mindset.
Real alignment doesn't beg for applause — it just vibrates higher.`
		);
		await sendAsCharacter(channelId, randomCoach.id, sixthMessage);

		// Create story arc based on the tension
		const storyArcsPath = path.join(
			process.cwd(),
			"data",
			"story-themes",
			"story-arcs.json"
		);
		const storyArcs = JSON.parse(fs.readFileSync(storyArcsPath, "utf-8"));

		// Create a new story arc for the tension
		const arcName = `getting_irritated_by_${thirdCoach.id}`;
		const arcData = {
			promptAttribute: "tension",
			progression: {
				startLevel: 0.6,
				endLevel: 1.0,
				scenes: {
					morning: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
					midday: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
					afternoon: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
				},
			},
			context: `${randomCoach.name} is getting increasingly irritated by ${thirdCoach.name}'s approach to "${selectedIssue.text}"`,
			promptInjection: `You are ${randomCoach.name}. Your irritation with ${thirdCoach.name}'s approach is at level {level} (where 0 is calm and 1 is extremely irritated). This should influence how you respond to them - at this level, {context}`,
			levelContexts: {
				"0.0": "you're completely calm and professional",
				"0.6": "you're actively frustrated by their methods and approach",
				"1.0": "you're completely fed up with their methods and approach",
			},
			watercoolerPresence: {
				requiredCharacters: [randomCoach.id, thirdCoach.id],
				probability: 0.66,
				speakingOrder: {
					first: "any",
					second: randomCoach.id,
				},
				influence: {
					type: "tension",
					description: `The tension from the waterheater incident about "${selectedIssue.text}" influences all interactions between ${randomCoach.name} and ${thirdCoach.name}`,
					duration: "episode",
				},
			},
		};

		// Add the new story arc
		if (!storyArcs.storyArcs[randomCoach.id]) {
			storyArcs.storyArcs[randomCoach.id] = {};
		}
		storyArcs.storyArcs[randomCoach.id][arcName] = arcData;

		// Update the top-level currentIrritation field
		const existingIrritation = storyArcs.currentIrritation || {
			probability: 0.66,
			intensity: {
				morning: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
				midday: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
				afternoon: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
			},
		};

		storyArcs.currentIrritation = {
			coach: randomCoach.id,
			target: thirdCoach.id,
			incident: selectedIssue.text,
			probability: existingIrritation.probability,
			intensity: existingIrritation.intensity,
		};

		// Write the updated story arcs back to the file
		fs.writeFileSync(storyArcsPath, JSON.stringify(storyArcs, null, 2));

		// Log the final state
		console.log("\n=== WATERHEATER FINAL STATE ===");
		console.log(`Incident: "${selectedIssue.text}"`);
		console.log(`Affected Coach: ${randomCoach.name}`);
		console.log("\nFinal Relationships:");
		console.log(`- ${secondCoach.name} (Coach B) is supportive/neutral`);
		console.log(
			`- ${thirdCoach.name} (Coach C) has triggered tension with ${randomCoach.name}`
		);
		console.log("\nCreated Story Arc:");
		console.log(
			`- ${randomCoach.name} getting irritated by ${thirdCoach.name}`
		);
		console.log(
			`- Tension will influence all subsequent watercooler scenes in the episode`
		);
		console.log(`- Incident context: "${selectedIssue.text}"`);
		console.log("\n=== WATERHEATER CHAT COMPLETED ===\n");
	} catch (error) {
		console.error("Error in waterheater chat:", error);
		throw error;
	}
}

export function initializeScheduledTasks(channelId: string, client: Client) {
	// Implementation of initializeScheduledTasks function
}

export async function handleMessage(message: Message): Promise<void> {
	try {
		// First, check if the message has already been processed
		const isDuplicate = await messageDedup.isMessageProcessed(message.id);
		if (isDuplicate) {
			console.log(`Skipping duplicate message: ${message.id}`);
			return;
		}

		// If message is a command (starts with !), handle it directly
		if (message.content.startsWith(PREFIX)) {
			try {
				// Handle the help command directly here
				if (message.content.toLowerCase() === '!help') {
					const commands = {
						"!help": "Show this help message",
						"!character list": "List all available characters",
						"!character select [name]": "Select a character to talk to",
						"!discuss-news": "Start a new discussion about current tech news",
						"!group-chat [char1] [char2] [char3]": "Start a group discussion with 3 characters",
						"!pitch [your idea]": "Present your business idea to all coaches for feedback and voting",
						"!pitch-yc": "Present a real Y Combinator-funded startup to coaches for feedback and voting",
					};
					
					const helpText = Object.entries(commands)
						.map(([cmd, desc]) => `${cmd}: ${desc}`)
						.join("\n");
					
					// Get current story info
					const storyInfo = getCurrentStoryInfo();
					let irritationInfo = "";
					
					if (storyInfo && storyInfo.currentEpisode && storyInfo.currentEpisode.generatedContent[0]) {
						// Get the first scene intro - it contains the information about what's happening
						const firstSceneIntro = storyInfo.currentEpisode.generatedContent[0].intro;
						
						// Extract the coach names using a simple parsing approach
						// First scene intro is typically formatted like:
						// "It's 9:04pm at their London office, where clear sky stretches overhead. During an important call, Kailey's affirmation wallpaper started glitching."
						let coachName = "";
						let incident = "";
						
						// Look for common patterns to identify coaches
						const coaches = ['Kailey', 'Alex', 'Rohan', 'Venus', 'Eljas', 'Donte'];
						for (const coach of coaches) {
							if (firstSceneIntro.includes(coach + "'s") || firstSceneIntro.includes(coach + ' ')) {
								coachName = coach;
								
								// Extract the incident - everything after the coach name
								const coachIndex = firstSceneIntro.indexOf(coach);
								if (coachIndex > 0) {
									const afterCoach = firstSceneIntro.substring(coachIndex + coach.length);
									// Look for the incident part - usually after "where" or ". "
									const parts = afterCoach.split('. ');
									if (parts.length > 1) {
										incident = parts[1];
									} else {
										incident = afterCoach;
									}
									break;
								}
							}
						}
						
						// Identify the target coach (usually the one responding critically in the first exchange)
						let targetCoach = "";
						if (storyInfo.currentEpisode.generatedContent[0].conversation) {
							// Look at second message which is usually a response to the first coach
							const secondMsg = storyInfo.currentEpisode.generatedContent[0].conversation[1];
							if (secondMsg) {
								targetCoach = secondMsg.coach;
							}
						}
						
						// Format the irritation info - similar to existing style
						if (coachName && incident) {
							const sceneNum = (storyInfo.sceneIndex + 1).toString().padStart(2, '0');
							const intensity = "2"; // Default value
							
							// Get pronoun based on coach name
							const genderPronouns: Record<string, string> = {
								'alex': 'She',
								'rohan': 'He', 
								'eljas': 'He',
								'venus': 'She',
								'kailey': 'She',
								'donte': 'He'
							};
							
							const pronoun = genderPronouns[coachName.toLowerCase()] || 'They';
							const targetName = targetCoach ? ceos.find(c => c.id === targetCoach)?.name.split(' ')[0] || targetCoach : '';
							
							irritationInfo = `\n\n=== Current Coach Dynamics ===\n${coachName} had a rough one: ${incident}\n\n${pronoun}'s still a little salty with ${targetName || 'someone'} after bringing it up in chat and not loving how the convo went.\n\nscene: ${sceneNum} intensity: ${intensity}`;
						}
					}
					
					await message.reply(`Available commands:\n${helpText}${irritationInfo}`);
					return;
				}
				
				// Parse the command and arguments
				const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
				const command = args.shift()?.toLowerCase();
				
				// FEATURE 2: Character commands
				if (command === 'character' && args.length > 0) {
					const subcommand = args.shift()?.toLowerCase();
					if (subcommand === 'list') {
						const characterList = formatCharacterList();
						await message.reply(characterList);
						return;
					} else if (subcommand === 'select') {
						const characterName = args.join(' ');
						const character = getCharacter(characterName);
						if (character) {
							const selectedCharacter = setActiveCharacter(message.channelId, character.id);
							if (selectedCharacter) {
								await handleCharacterInteraction(message);
							}
						} else {
							await message.reply(`Character "${characterName}" not found.`);
						}
						return;
					}
				}
				
				// FEATURE 3: Discuss-news command
				else if (command === 'discuss-news') {
					await message.reply("Starting news discussion...");
					await triggerNewsChat(message.channelId, message.client);
					return;
				}
				
				// FEATURE 4: Group-chat command
				else if (command === 'group-chat') {
					const groupMembers = args
						.map(name => getCharacter(name)?.id)
						.filter((id): id is string => id !== undefined);
					
					if (groupMembers.length >= 3) {
						const groupChat: GroupChatState = {
							participants: groupMembers,
							topic: undefined,
							isDiscussing: false,
							messageCount: {},
							conversationHistory: []
						};
						activeGroupChats.set(message.channelId, groupChat);
						await message.reply("Starting group chat. Please provide a topic to discuss.");
						await handleGroupChat(message, groupChat);
						return;
					} else {
						await message.reply('You need to specify at least 3 characters for a group chat.');
						return;
					}
				}
				
				// FEATURE 5: Pitch command
				else if (command === 'pitch') {
					const idea = args.join(' ');
					if (idea.trim()) {
						await handlePitchCommand(message, idea);
					} else {
						await message.reply('Please provide an idea to pitch. Example: !pitch An app that helps people find local events');
					}
					return;
				}
				
				// FEATURE 5.1: YC Startup Pitch command
				else if (command === 'pitch-yc') {
					await handlePitchYCCommand(message);
					return;
				}
				
				// Unknown command
				else {
					await message.reply("Unknown command. Type !help to see available commands.");
					return;
				}
			} catch (error) {
				console.error("Error handling command:", error);
				await message.reply("Sorry, there was an error processing your command.");
				return;
			}
		}

		// Handle admin commands
		const isAdmin = Object.values(COACH_DISCORD_HANDLES).some(handle => handle === message.author.tag);
		if (isAdmin && (message.content.startsWith('!admin') || message.content.startsWith('!help-admin'))) {
			await handleAdminCommand(message);
			return;
		}

		// FEATURE 1: Natural language triggers ("hey donte")
		const content = message.content.toLowerCase();
		for (const trigger of NATURAL_TRIGGERS) {
			if (content.startsWith(trigger)) {
				const words = content.split(' ');
				if (words.length >= 2) {
					const potentialCharacterId = words[1];
					const character = getCharacter(potentialCharacterId);
					if (character) {
						console.log(`Natural trigger detected: ${trigger} ${potentialCharacterId}`);
						const selectedCharacter = setActiveCharacter(message.channelId, character.id);
						if (selectedCharacter) {
							await handleCharacterInteraction(message);
							return;
						}
					}
				}
			}
		}

		// Check for active group chat or active character
		const groupChat = activeGroupChats.get(message.channelId);
		if (groupChat) {
			await handleGroupChat(message, groupChat);
			return;
		}
		
		// Check for individual character interaction
		const activeCharacter = getActiveCharacter(message.channelId);
		if (activeCharacter) {
			await handleCharacterInteraction(message);
			return;
		}

		// If no other handlers matched, just log the message
		console.log(`Received non-command message: ${message.content.substring(0, 50)}...`);
	} catch (error) {
		console.error("Error in handleMessage:", error);
	}
}
