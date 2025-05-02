import { TextChannel } from "discord.js";
import { getLocationAndTime } from "./locationTime.js";
import { generateWatercoolerBumper } from "./watercoolerPrompts.js";
import { generateWaterheaterBumper } from "./waterheaterPrompts.js";
import { addScene, getCurrentEpisode } from "./episodeStorage.js";
import { updateCurrentScene } from "./bot.js";
import path from "path";
import fs from "fs";

export const EVENT_MESSAGES = {
	watercooler: {
		intro: "{arrival}They are gathering by the water cooler.",
		outro: "The coaches have wandered back to their executive suites.",
	},
	waterheater: {
		intro: "{arrival}",
		outro: "The coaches have dispersed like rising vapor to their workstations.",
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
	gmtMinutes: number
) {
	let message: string;
	let prompt: string | undefined;
	let waterheaterIssue: string = ""; // Store waterheater issue separately

	if (eventType === 'watercooler') {
		// Generate dynamic bumper for watercooler events
		const { text, prompt: generatedPrompt } = await generateWatercoolerBumper(isIntro);
		message = isIntro ? `{arrival}${text}` : text;
		prompt = generatedPrompt;
	} else if (eventType === 'waterheater') {
		// Generate dynamic bumper for waterheater events
		const { text, prompt: generatedPrompt } = await generateWaterheaterBumper(isIntro);
		waterheaterIssue = text; // Store the issue
		message = isIntro ? "{arrival}" : text; // Only use arrival placeholder for now
		prompt = generatedPrompt;
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
		const arrivalText = isNewLocation
			? `It's ${formattedTime}${ampm} and the coaches have just arrived at their ${location}, where ${weather} skies ${weatherEmoji} stretch overhead. `
			: `It's ${formattedTime}${ampm} at the ${location}, where ${weather} skies ${weatherEmoji} stretch overhead. `;
		
		// Handle waterheater differently to preserve the issue text
		if (eventType === 'waterheater') {
			message = `${arrivalText}${waterheaterIssue}`;
		} else {
			message = message.replace("{arrival}", arrivalText);
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

	await channel.send(message);
}
