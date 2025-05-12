import { TextChannel } from "discord.js";
import { getLocationAndTime } from "./locationTime.js";
import { generateWatercoolerBumper } from "./watercoolerPrompts.js";
import { generateWaterheaterBumper } from "./waterheaterPrompts.js";
import { addScene, getCurrentEpisode } from "./episodeStorage.js";
import { updateCurrentScene } from "./bot.js";
import { getLatestWeekendReason, getLatestWeekendActivity } from "./weekendvibes.js";
import path from "path";
import fs from "fs";

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
	eventType: keyof typeof EVENT_MESSAGES,
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
			message = isIntro ? `{arrival}${selectedIncident.intro}` : EVENT_MESSAGES[eventType].outro;
		} else {
			// Generate dynamic bumper for waterheater events
			const { text, prompt: generatedPrompt } = await generateWaterheaterBumper(isIntro);
			message = isIntro ? `{arrival}${text}` : text;
			prompt = generatedPrompt;
		}
	} else {
		// Use static messages for other event types
		message = isIntro
			? EVENT_MESSAGES[eventType].intro
			: EVENT_MESSAGES[eventType].outro;
	}

	if (isIntro) {
		const locationTime = await getLocationAndTime(
			gmtHour,
			gmtMinutes
		);
		const { location, formattedTime, ampm, isNewLocation, weather, weatherEmoji } = locationTime;
		
		// Determine the correct preposition based on location
		let cityText = '';
		if (location.includes('Berlin') || location.includes('Vegas') || location.includes('Tokyo')) {
			// For weekend cities, use "in [City]"
			// Extract just the city name without "office" or "penthouse"
			const cityName = location.replace(' office', '').replace(' penthouse', '');
			cityText = `in ${cityName}`;
		} else {
			// For office locations, use "at their [Location]"
			cityText = `at their ${location}`;
		}
		
		const arrivalText = isNewLocation
			? `It's ${formattedTime}${ampm} and the coaches have just arrived ${cityText}, where ${weather} ${weatherEmoji} stretches overhead. `
			: `It's ${formattedTime}${ampm} ${cityText}, where ${weather} ${weatherEmoji} stretches overhead. `;
		
		message = message.replace("{arrival}", arrivalText);
		
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
	await targetChannel.send(message);
}
