import fs from "fs";
import path from "path";
import { triggerWatercoolerChat, triggerWaterheaterChat } from "./handlers.js";
import { triggerNewsChat } from "./news.js";
import { triggerTmzChat } from "./tmz.js";
import { triggerPitchChat } from "./pitch.js";
import { triggerWeekendVibesChat } from "./weekendvibes.js";
import { triggerWeekendStory } from "./weekend-story.js";
import { triggerSimpleStaffMeeting } from "./simpleStaffMeeting.js";
import { Client, TextChannel } from "discord.js";
import { sendEventMessage, EVENT_MESSAGES } from "./eventMessages.js";
import { ceos, CEO } from "../../data/ceos.js";
import { waterheaterIncidents } from "../../data/waterheater-incidents.js";
import { isWeekend } from "./locationTime.js";

// Path to the schedule files
const WEEKDAY_SCHEDULE_PATH = path.join(process.cwd(), "data", "schedule.txt");
const WEEKEND_SCHEDULE_PATH = path.join(process.cwd(), "data", "weekend-schedule.txt");

// Service mapping
const serviceMap: Record<
	string,
	(channelId: string, client: Client) => Promise<void>
> = {
	watercooler: triggerWatercoolerChat,
	newschat: triggerNewsChat,
	tmzchat: triggerTmzChat,
	pitchchat: triggerPitchChat,
	waterheater: triggerWaterheaterChat,
	weekendvibes: triggerWeekendVibesChat,
	weekendstory: triggerWeekendStory,
	simplestaffmeeting: triggerSimpleStaffMeeting,
	// Add more services here as needed
};

type EventType = keyof typeof EVENT_MESSAGES;

let scheduleByHour: Record<number, EventType> = {};
let discordClient: Client | null = null;

// Initialize scheduler with Discord client
export function initializeScheduler(client: Client) {
	discordClient = client;
	loadSchedule();
	startScheduler();
}

function loadSchedule() {
	try {
		const isWeekendMode = isWeekend();
		console.log(`[Scheduler] Is weekend mode: ${isWeekendMode}`);
		const schedulePath = isWeekendMode ? WEEKEND_SCHEDULE_PATH : WEEKDAY_SCHEDULE_PATH;
		console.log(`[Scheduler] Loading ${isWeekendMode ? 'weekend' : 'weekday'} schedule from ${schedulePath}`);
		
		const content = fs.readFileSync(schedulePath, "utf-8");
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.filter(line => !line.startsWith('#') && !line.startsWith('LOCATION')); // Skip comments and location blocks
		
		scheduleByHour = {};
		for (const line of lines) {
			const match = line.match(/^(\d{2}):(\d{2})(?:\s+(\w+))?$/);
			if (match) {
				const hour = parseInt(match[1], 10);
				// Only accept 00 minutes for now
				if (match[2] !== "00") {
					console.warn(
						`[Scheduler] Only 00 minutes supported. Skipping: ${line}`
					);
					continue;
				}
				const service = match[3];
				if (service) {
					scheduleByHour[hour] = service as EventType;
				} else {
					// Handle empty service (blank timeslot)
					console.log(`[Scheduler] Empty timeslot for hour ${hour}`);
				}
			} else {
				console.warn(`[Scheduler] Invalid schedule line: ${line}`);
			}
		}
		console.log("[Scheduler] Schedule loaded:", scheduleByHour);
	} catch (err) {
		console.error("[Scheduler] Failed to load schedule:", err);
		scheduleByHour = {};
	}
}

// Watch for changes in both schedule files
fs.watchFile(WEEKDAY_SCHEDULE_PATH, (curr, prev) => {
	console.log("[Scheduler] Detected weekday schedule file change, reloading...");
	loadSchedule();
});

fs.watchFile(WEEKEND_SCHEDULE_PATH, (curr, prev) => {
	console.log("[Scheduler] Detected weekend schedule file change, reloading...");
	loadSchedule();
});

async function runServiceWithMessages(
	channelId: string,
	serviceName: string
) {
	if (!discordClient) {
		console.error("[Scheduler] Discord client not initialized");
		return;
	}

	const channel = discordClient.channels.cache.get(channelId) as TextChannel;
	if (!channel) {
		console.error(`[Scheduler] Channel ${channelId} not found`);
		return;
	}

	if (!(serviceName in EVENT_MESSAGES)) {
		console.warn(
			`[Scheduler] No messages defined for service '${serviceName}'`
		);
		return;
	}

	try {
		const now = new Date();
		const gmtHour = now.getUTCHours();
		const gmtMinutes = now.getUTCMinutes();

		// For waterheater, select incident first
		let selectedIncident = null;
		let selectedCoachId: string | undefined;
		if (serviceName === 'waterheater') {
			const availableCharacters = ceos.filter((char: CEO) => char.id !== 'system');
			const randomCoach = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
			selectedCoachId = randomCoach.id;
			const coachIncidents = waterheaterIncidents.find((c: { id: string }) => c.id === randomCoach.id);
			if (coachIncidents) {
				const randomIndex = Math.floor(Math.random() * coachIncidents.incidents.length);
				selectedIncident = coachIncidents.incidents[randomIndex];
			}
		}

		// Send intro message
		await sendEventMessage(
			channel,
			serviceName as EventType,
			true,
			gmtHour,
			gmtMinutes,
			selectedIncident
		);

		// If it's a waterheater event, trigger the chat
		if (serviceName === 'waterheater') {
			await triggerWaterheaterChat(channel.id, discordClient, selectedIncident, selectedCoachId);
		} else {
			// Run the actual service for non-waterheater events
			const serviceFn = serviceMap[serviceName];
			if (serviceFn) {
				await serviceFn(channelId, discordClient);
			} else {
				console.warn(`[Scheduler] No service mapped for '${serviceName}'`);
			}
		}

		// Send outro message
		await sendEventMessage(
			channel,
			serviceName as EventType,
			false,
			gmtHour,
			gmtMinutes
		);
	} catch (err) {
		console.error(`[Scheduler] Error running '${serviceName}':`, err);
	}
}

function startScheduler() {
	if (!discordClient) {
		console.error("[Scheduler] Discord client not initialized");
		return;
	}

	const FAST_MODE = !!process.env.FAST_SCHEDULE;
	const FAST_INTERVAL_MINUTES = parseInt(process.env.FAST_SCHEDULE || "60");
	const FAST_INTERVAL_MS = FAST_INTERVAL_MINUTES * 60 * 1000;
	const START_TIME = Date.now();
	const channelId = process.env.DISCORD_CHANNEL_ID!;

	if (FAST_MODE) {
		console.log(
			`[Scheduler] FAST-FORWARD MODE ENABLED: 1 hour = ${FAST_INTERVAL_MINUTES} minutes`
		);
		setTimeout(function fastTick() {
			const minutesSinceStart = Math.floor((Date.now() - START_TIME) / 60000);
			const pseudoHour =
				Math.floor(minutesSinceStart / FAST_INTERVAL_MINUTES) % 24;
			const serviceName = scheduleByHour[pseudoHour];
			console.log(
				`[Scheduler] [FAST] Pseudo-hour ${pseudoHour}: scheduled service is '${serviceName || "NONE"}'`
			);
			if (serviceName) {
				runServiceWithMessages(channelId, serviceName)
					.then(() =>
						console.log(
							`[Scheduler] [FAST] Successfully ran '${serviceName}' for pseudo-hour ${pseudoHour}`
						)
					)
					.catch((err) =>
						console.error(
							`[Scheduler] [FAST] Error running '${serviceName}':`,
							err
						)
					);
			} else {
				console.log(`[Scheduler] [FAST] No service scheduled for pseudo-hour ${pseudoHour}`);
			}
			setTimeout(fastTick, FAST_INTERVAL_MS);
		}, 0);
	} else {
		console.log("[Scheduler] NORMAL MODE: 1 hour = 1 hour");
		function runScheduledService() {
			const now = new Date();
			const hour = now.getHours();
			const serviceName = scheduleByHour[hour];
			console.log(
				`[Scheduler] Hour ${hour}: scheduled service is '${serviceName || "NONE"}'`
			);
			if (serviceName) {
				runServiceWithMessages(channelId, serviceName)
					.then(() =>
						console.log(
							`[Scheduler] Successfully ran '${serviceName}' for hour ${hour}`
						)
					)
					.catch((err) =>
						console.error(
							`[Scheduler] Error running '${serviceName}':`,
							err
						)
					);
			} else {
				console.log(`[Scheduler] No service scheduled for hour ${hour}`);
			}
		}

		function msUntilNextHour() {
			const now = new Date();
			const nextHour = new Date(now);
			nextHour.setHours(now.getHours() + 1, 0, 0, 0);
			return nextHour.getTime() - now.getTime();
		}

		// Run immediately if it's the start of an hour
		const now = new Date();
		if (now.getMinutes() === 0) {
			runScheduledService();
		}

		// Then schedule for the next hour
		setTimeout(function tick() {
			runScheduledService();
			setTimeout(tick, msUntilNextHour());
		}, msUntilNextHour());
	}
}

// Export for testing
export { loadSchedule, runServiceWithMessages };
