import fs from "fs";
import path from "path";
import { triggerWatercoolerChat } from "./handlers.js";
import { triggerNewsChat } from "./news.js";
import { triggerTmzChat } from "./tmz.js";
import { triggerPitchChat } from "./pitch.js";
import { Client, TextChannel } from "discord.js";
import { sendEventMessage, EVENT_MESSAGES } from "./eventMessages.js";

// Path to the schedule file
const SCHEDULE_PATH = path.join(process.cwd(), "data", "schedule.txt");

// Service mapping
const serviceMap: Record<
	string,
	(channelId: string, client: Client) => Promise<void>
> = {
	watercooler: triggerWatercoolerChat,
	newschat: triggerNewsChat,
	tmzchat: triggerTmzChat,
	pitchchat: triggerPitchChat,
	// Add more services here as needed
};

type EventType = keyof typeof EVENT_MESSAGES;

let scheduleByHour: Record<number, EventType> = {};

function loadSchedule() {
	try {
		const content = fs.readFileSync(SCHEDULE_PATH, "utf-8");
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		scheduleByHour = {};
		for (const line of lines) {
			const match = line.match(/^(\d{2}):(\d{2})\s+(\w+)$/);
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
				scheduleByHour[hour] = service as EventType;
			} else {
				console.warn(`[Scheduler] Invalid schedule line: ${line}`);
			}
		}
		if (Object.keys(scheduleByHour).length !== 24) {
			console.warn(
				`[Scheduler] Schedule should have 24 valid lines, found ${
					Object.keys(scheduleByHour).length
				}.`
			);
		}
		console.log("[Scheduler] Schedule loaded:", scheduleByHour);
	} catch (err) {
		console.error("[Scheduler] Failed to load schedule:", err);
		scheduleByHour = {};
	}
}

// Load schedule at startup
loadSchedule();

// Optionally, watch for changes
fs.watchFile(SCHEDULE_PATH, (curr, prev) => {
	console.log("[Scheduler] Detected schedule file change, reloading...");
	loadSchedule();
});

async function runServiceWithMessages(
	channelId: string,
	client: Client,
	serviceName: string
) {
	const channel = client.channels.cache.get(channelId) as TextChannel;
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
		// Send intro message
		await sendEventMessage(
			channel,
			serviceName as EventType,
			true,
			gmtHour,
			gmtMinutes
		);

		// Run the actual service
		const serviceFn = serviceMap[serviceName];
		if (serviceFn) {
			await serviceFn(channelId, client);
		} else {
			console.warn(`[Scheduler] No service mapped for '${serviceName}'`);
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

export function startCentralizedScheduler(channelId: string, client: Client) {
	const FAST_MODE = !!process.env.FAST_SCHEDULE;
	const FAST_INTERVAL_MINUTES = parseInt(process.env.FAST_SCHEDULE || "60");
	const FAST_INTERVAL_MS = FAST_INTERVAL_MINUTES * 60 * 1000;
	const START_TIME = Date.now();

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
				`[Scheduler] [FAST] Pseudo-hour ${pseudoHour}: scheduled service is '${serviceName}'`
			);
			runServiceWithMessages(channelId, client, serviceName)
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
			setTimeout(fastTick, FAST_INTERVAL_MS);
		}, 0);
	} else {
		console.log("[Scheduler] NORMAL MODE: 1 hour = 1 hour");
		function runScheduledService() {
			const now = new Date();
			const hour = now.getHours();
			const serviceName = scheduleByHour[hour];
			console.log(
				`[Scheduler] Hour ${hour}: scheduled service is '${serviceName}'`
			);
			runServiceWithMessages(channelId, client, serviceName)
				.then(() =>
					console.log(
						`[Scheduler] Successfully ran '${serviceName}' for hour ${hour}`
					)
				)
				.catch((err) =>
					console.error(`[Scheduler] Error running '${serviceName}':`, err)
				);
		}

		// Calculate ms until next hour
		function msUntilNextHour() {
			const now = new Date();
			return (
				(60 - now.getMinutes()) * 60 * 1000 -
				now.getSeconds() * 1000 -
				now.getMilliseconds()
			);
		}

		setTimeout(function tick() {
			runScheduledService();
			setTimeout(tick, 60 * 60 * 1000); // Every hour
		}, msUntilNextHour());
	}
}
