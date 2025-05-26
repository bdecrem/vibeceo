import { TextChannel } from 'discord.js';
import { getLocationAndTime, isWeekend } from './locationTime.js';
import { generateWatercoolerBumper } from './watercoolerPrompts.js';
import { generateWaterheaterBumper } from "./waterheaterPrompts.js";
import { addScene, getCurrentEpisode } from "./episodeStorage.js";
import { updateCurrentScene, client } from "./bot.js";
import { getLatestWeekendReason, getLatestWeekendActivity } from "./weekendvibes.js";
import { postSystemAnnouncement } from "./systemAnnouncement.js";
import path from "path";
import fs from "fs";

// Create a local cache for custom event messages
// This will be populated by argumentGenerator.ts
export const customEventMessageCache: Record<string, { intro: string; outro: string }> = {};

// List of micropost services that should use simplified arrival format
const MICROPOST_SERVICES = [
	'coachquotes',
	'crowdfaves',
	'microclass',
	'upcomingevent',
	'alextipsy'
];

export const EVENT_MESSAGES = {
	watercooler: {
		intro: "Hey everyone, time for a quick water cooler chat!",
		outro: "Thanks for chatting, everyone! Back to work now."
	},
	waterheater: {
		intro: "Hey everyone, it's time for a waterheater! Brace yourselves...",
		outro: "That was... interesting. Let's get back to work now."
	},
	newschat: {
		intro:
			"{arrival}One of them is getting all worked up about a story in tech news.",
		outro: "The coaches have scattered.",
	},
	tmzchat: {
		intro:
			"{arrival}Coach is bored and is checking out the celebs and entertainment news.",
		outro: "The coaches, begrudgingly, have returned to their desks.",
	},
	pitchchat: {
		intro: "{arrival}A pitch came in and they are gathering in the Board room.",
		outro:
			"The Board room has emptied out. These folks need to clean up after themselves.",
	},
	pitch: {
		intro: "{arrival}The coaches are gathering to review an exciting new pitch.",
		outro: "The coaches have finished their pitch review and are heading out.",
	},
	coachquotes: {
		intro: "{simplifiedArrival}The coaches are discussing their favorite quotes.",
		outro: "The quote discussion has concluded."
	},
	crowdfaves: {
		intro: "{simplifiedArrival}The coaches are talking about community favorites.",
		outro: "The coaches have finished discussing community favorites."
	},
	microclass: {
		intro: "{simplifiedArrival}A mini learning session is about to begin.",
		outro: "The micro-learning session has concluded."
	},
	upcomingevent: {
		intro: "{simplifiedArrival}The coaches are discussing upcoming events.",
		outro: "The event discussion has wrapped up."
	},
	staffmeeting: {
		intro: "Hey everyone, time for a quick staff meeting because {reason}.",
		outro: "Thanks for the staff meeting, everyone! That was... productive?"
	},
	simplestaffmeeting: {
		intro: "{arrival}The coaches are gathering for a quick staff meeting because {reason}.",
		outro: "The quick staff meeting has concluded. The coaches have returned to their duties.",
	},
	weekendvibes: {
		intro: "{arrival}The coaches are antsy, eager to make a plan for the night.",
		outro: "After their chaotic planning session, the coaches settled on {activity}: a {activityType} featuring {activityDescription}"
	},
	weekendstory: {
		intro: "{arrival}The coaches are about to embark on their weekend adventure.",
		outro: "The weekend adventure has concluded. The coaches reflect silently on what just happened."
	},
} as const;

// Keep original scene index for event system
let currentSceneIndex = 0;

// Add new scene index for story info display
let storyInfoSceneIndex = 0;

export async function sendEventMessage(
	channel: TextChannel,
	eventType: keyof typeof EVENT_MESSAGES | string,
	isIntro: boolean,
	gmtHour: number,
	gmtMinutes: number,
	selectedIncident?: { text: string; intro: string } | null,
	meetingReason?: string
) {
	let message: string;
	let prompt: string | undefined;

	if (eventType === 'watercooler') {
		// Generate dynamic bumper for watercooler events
		const { text, prompt: generatedPrompt } = await generateWatercoolerBumper(isIntro);
		message = isIntro ? `{arrival}${text}` : text;
		prompt = generatedPrompt;
	} else if (eventType === 'waterheater') {
		if (isIntro && selectedIncident) {
			// Use the selected incident's intro
			message = isIntro ? `{arrival}${selectedIncident.intro}` : 
			           EVENT_MESSAGES[eventType as keyof typeof EVENT_MESSAGES]?.outro || "That was... interesting. Let's get back to work now.";
		} else {
			// Generate dynamic bumper for waterheater events
			const { text, prompt: generatedPrompt } = await generateWaterheaterBumper(isIntro);
			message = isIntro ? `{arrival}${text}` : text;
			prompt = generatedPrompt;
		}
	} else {
		// Check if we have a custom message in the cache FIRST
		const eventTypeStr = eventType.toString();
		if (customEventMessageCache[eventTypeStr]) {
			// Use the custom intro/outro if available
			// Make sure we don't prepend {arrival} for micropost services
			// as their format already has {simplifiedArrival}
			const isInMicropostServices = MICROPOST_SERVICES.includes(eventTypeStr);
			
			message = isIntro
				? isInMicropostServices 
					? customEventMessageCache[eventTypeStr].intro  // Don't add {arrival} for microposts
					: `{arrival}${customEventMessageCache[eventTypeStr].intro}`  // Add {arrival} for non-microposts
				: customEventMessageCache[eventTypeStr].outro;
			
			console.log(`[EventMessages] Using custom message for ${eventTypeStr} (micropost: ${isInMicropostServices})`);
		} 
		// Check if it's in the standard EVENT_MESSAGES
		else if (eventType in EVENT_MESSAGES) {
			// Use static messages for other event types
			message = isIntro
				? EVENT_MESSAGES[eventType as keyof typeof EVENT_MESSAGES].intro
				: EVENT_MESSAGES[eventType as keyof typeof EVENT_MESSAGES].outro;
		}
		// If not found anywhere, use a generic fallback
		else {
			console.warn(`[EventMessages] No message found for event type '${eventTypeStr}', using generic fallback`);
			message = isIntro
				? `{arrival}The coaches are having a conversation.`
				: `The conversation has concluded.`;
		}
	}

	if (isIntro) {
		const locationTime = await getLocationAndTime(
			gmtHour,
			gmtMinutes
		);
		const { location, formattedTime, ampm, isNewLocation, weather, weatherEmoji } = locationTime;
		
		let arrivalText = ''; // Declare arrivalText here to fix scope issue
		
		// Check if it's a micropost service that needs simplified arrival format
		if (MICROPOST_SERVICES.includes(eventType as string) && message.includes("{simplifiedArrival}")) {
			// Extract just the city name without "office" or "penthouse"
			const cityName = location.replace(' office', '').replace(' penthouse', '');
			
			// Check if it's the weekend to use a different format
			let simplifiedArrival;
			if (isWeekend()) {
				// Get current day of week
				const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
				const today = new Date().getDay();
				const dayName = days[today];
				
				// Format the special weekend messages for Foundry Heat - nightlife edition
				const weekendFormats = [
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and "strategy" now means picking the next bar. 🍸 ${weatherEmoji}`,
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and everyone's arguing about who's covering the Uber. 🚕 ${weatherEmoji}`,
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and the pitch decks have stains from cocktail napkins. 🥃 ${weatherEmoji}`,
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and someone's insisting the club promoter is a potential investor. 💃 ${weatherEmoji}`,
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and expense reports will be creative fiction tomorrow. 💸 ${weatherEmoji}`,
					`The coaches are in ${cityName} where it's ${formattedTime}${ampm} on ${dayName} and they're explaining "product-market fit" to a bartender. 🍹 ${weatherEmoji}`
				];
				
				// Select a random weekend format
				const formatIndex = Math.floor(Math.random() * weekendFormats.length);
				
				// Use the special weekend format
				simplifiedArrival = weekendFormats[formatIndex];
			} else {
				// Regular format
				simplifiedArrival = `The coaches are in ${cityName} where it's ${formattedTime}${ampm}. ${weatherEmoji}`;
			}
			message = message.replace("{simplifiedArrival}", simplifiedArrival);
		} else {
			// Regular arrival message format for non-micropost services
			// Determine the correct preposition based on location
			let cityText = '';
			if (location.includes('Berlin') || location.includes('Vegas') || location.includes('Tokyo') || location.includes('Paris')) {
				// For weekend cities, use "in [City]"
				// Extract just the city name without "office" or "penthouse"
				const cityName = location.replace(' office', '').replace(' penthouse', '');
				cityText = `in ${cityName}`;
			} else {
				// For office locations, use "at their [Location]"
				cityText = `at their ${location}`;
			}
			
			arrivalText = isNewLocation
				? `It's ${formattedTime}${ampm} and the coaches have just arrived ${cityText}, where ${weather} ${weatherEmoji} stretches overhead. `
				: `It's ${formattedTime}${ampm} ${cityText}, where ${weather} ${weatherEmoji} stretches overhead. `;
			
			message = message.replace("{arrival}", arrivalText);
		}
		
		// Replace {location} placeholder for weekendvibes
		if (eventType === 'weekendvibes') {
			const cityOnly = location.replace(' office', '').replace(' penthouse', '');
			message = message.replace("{location}", cityOnly);
		}
		
		// Replace {reason} placeholder for simplestaffmeeting
		if (eventType === 'simplestaffmeeting' && meetingReason) {
			console.log(`Replacing {reason} placeholder with: "${meetingReason}"`);
			console.log(`Message before replacement: "${message}"`);
			
			// Check if the message actually contains the placeholder
			if (!message.includes("{reason}")) {
				console.warn("WARNING: Message does not contain {reason} placeholder!");
				// Default to a complete message with the reason
				message = `${arrivalText}The coaches are gathering for a quick staff meeting because ${meetingReason}.`;
			} else {
				message = message.replace("{reason}", meetingReason);
			}
			
			console.log(`Message after replacement: "${message}"`);
		} else if (eventType === 'simplestaffmeeting') {
			console.warn(`No meetingReason provided for simplestaffmeeting! eventType=${eventType}, isIntro=${isIntro}, meetingReason=${meetingReason}`);
			// Default reason if missing
			if (message.includes("{reason}")) {
				message = message.replace("{reason}", "there's an urgent need to synchronize");
				console.log(`Used default reason. Message after replacement: "${message}"`);
			} else {
				// Handle completely missing placeholder - construct a default complete message
				message = `${arrivalText}The coaches are gathering for a quick staff meeting because there's an urgent need to synchronize.`;
				console.log(`Used default complete message: "${message}"`);
			}
		}
	} else if (eventType === 'weekendvibes') {
		// Handle the location placeholder in the outro message
		const locationTime = await getLocationAndTime(gmtHour, gmtMinutes);
		const cityOnly = locationTime.location.replace(' office', '').replace(' penthouse', '');
		message = message.replace("{location}", cityOnly);
		
		// For outro messages, replace activity placeholders
		if (!isIntro) {
			const activityInfo = getLatestWeekendActivity();
			message = message
				.replace("{activity}", activityInfo.name)
				.replace("{activityType}", activityInfo.type)
				.replace("{activityDescription}", activityInfo.description);
			console.log("Updated weekend outro with activity info:", activityInfo);
		}
	}

	// Store the scene in episode storage if it's a watercooler or waterheater event
	if (eventType === 'watercooler' || eventType === 'waterheater') {
		const currentEpisode = getCurrentEpisode();
		if (!currentEpisode) {
			throw new Error('No active episode');
		}

		// Find the last scene for this event type
		const lastScene = currentEpisode.scenes
			.filter(s => s.type === eventType)
			.pop();

		if (isIntro) {
			// Increment both scene indices
			currentSceneIndex++;
			storyInfoSceneIndex++;
			
			// Update the story info scene index in bot.ts
			updateCurrentScene(storyInfoSceneIndex);
			
			// Trigger system announcement for specific scene indexes
			if (storyInfoSceneIndex === 5 || storyInfoSceneIndex === 11 || 
				storyInfoSceneIndex === 17 || storyInfoSceneIndex === 23) {
				try {
					console.log(`Triggering system announcement after scene ${storyInfoSceneIndex}`);
					await postSystemAnnouncement(client, storyInfoSceneIndex);
				} catch (error) {
					console.error(`Error posting system announcement for scene ${storyInfoSceneIndex}:`, error);
				}
			}
			
			const locationTime = await getLocationAndTime(gmtHour, gmtMinutes);
			await addScene({
				index: currentSceneIndex,
				type: eventType,
				intro: message,
				outro: '',
				location: locationTime.location,
				localTime: `${gmtHour}:${gmtMinutes}`,
				coaches: []
			});
		} else if (lastScene) {
			// Update the last scene with the outro
			lastScene.outro = message;
			const filePath = path.join(process.cwd(), 'data', 'episodes', `${currentEpisode.id}.json`);
			fs.writeFileSync(filePath, JSON.stringify(currentEpisode, null, 2));
		}
	}

	// For staff meetings, use the specific staff meetings channel
	const targetChannel = eventType === 'staffmeeting' 
		? await channel.client.channels.fetch('1369356692428423240') as TextChannel
		: channel;

	if (!targetChannel) {
		throw new Error(`Target channel not found for event type ${eventType}`);
	}

	// Send the message to the target channel
	// Skip sending if it's an empty outro (for microposts)
	if (!(!isIntro && MICROPOST_SERVICES.includes(eventType as string) && message.trim() === "")) {
		await targetChannel.send(message);
	}
}
