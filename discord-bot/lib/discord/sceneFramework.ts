// sceneFramework.ts

import { EpisodeContext } from "./episodeContext.js";
import { getLocationAndTime } from "./locationTime.js";
import { coachState } from "../../data/coach-dynamics.js";
import { coachBackstory } from "../../data/coach-backstory.js";
import { ceos } from "../../data/ceos.js";
import { CoachState, SceneCoachState } from "./types/coaches.js";
import { readFileSync } from "fs";
import { join } from "path";
import fs from "fs";
import { openai } from "./ai.js";
import { TextChannel } from "discord.js";
import pLimit from "p-limit";
import { validateSceneSeeds } from "./validateSceneSeeds.js";
import { getStoryContext } from './handlers.js';
import path from "path";
import { postSystemAnnouncement } from "./systemAnnouncement.js";

interface CoachInfo {
	id: string;
	name: string;
	style: string;
	traits: string[];
}

export interface SceneSeed {
	index: number;
	type: "watercooler" | "newschat" | "tmzchat" | "pitchchat";

	// Location & Time
	location: string;
	localTime: string;
	isLocationTransition: boolean;
	previousLocation?: string;
	travelContext?: {
		fromCity: string;
		toCity: string;
		travelTime: number;
	};

	// Environment
	weather: string;
	events: string[];

	// Characters
	coaches: string[];
	coachStates: {
		[coachId: string]: SceneCoachState;
	};

	// Prompts
	introPrompt: string;
	convoPrompt?: string; // only for watercooler
	outroPrompt: string;
}

export interface EpisodeScenes {
	seeds: SceneSeed[];
	generatedContent: {
		[sceneIndex: number]: SceneContent;
	};
	metadata: {
		startTime: string;
		unitDuration: number;
		activeArcs: string[];
		activeFlags: Set<string>;
	};
}

function readSchedule(): string[] {
	const schedulePath = join(process.cwd(), "data", "schedule.txt");
	const scheduleContent = readFileSync(schedulePath, "utf-8");
	return scheduleContent.trim().split("\n");
}

async function determineLocationAndTime(
	sceneIndex: number,
	episodeContext: EpisodeContext
): Promise<{ location: string; localTime: string }> {
	// Get the start time in UTC
	const startTime = new Date(episodeContext.startTime);
	const startHourUTC = startTime.getUTCHours();
	const startMinutesUTC = startTime.getUTCMinutes();
	
	// Calculate total minutes passed for this scene
	const minutesPassed = sceneIndex * episodeContext.unitDurationMinutes;
	
	// Calculate the scene's UTC time
	const totalMinutesUTC = startHourUTC * 60 + startMinutesUTC + minutesPassed;
	const sceneHourUTC = Math.floor(totalMinutesUTC / 60) % 24;
	const sceneMinutesUTC = totalMinutesUTC % 60;

	const { location, formattedTime, ampm } = await getLocationAndTime(sceneHourUTC, sceneMinutesUTC);
	
	// Validate time components
	if (!formattedTime || !ampm) {
		throw new Error(`Invalid time format for scene ${sceneIndex}`);
	}

	return {
		location,
		localTime: `${formattedTime}${ampm}`,
	};
}

function getEnvironmentalContext(
	location: string,
	episodeContext: EpisodeContext
): { weather: string; events: string[] } {
	const cityName = location.includes("Los Angeles")
		? "Los Angeles"
		: location.includes("Singapore")
		? "Singapore"
		: "London";

	return {
		weather: episodeContext.weatherByLocation[cityName],
		events: episodeContext.holidaysByLocation[cityName] || [],
	};
}

function selectCoachesForScene(
	sceneIndex: number,
	type: string,
	previousScene?: SceneSeed,
	episodeContext?: EpisodeContext
): { coaches: string[]; coachStates: { [coachId: string]: SceneCoachState } } {
	// Get valid coach IDs from ceos
	const validCoachIds = ceos.map((c) => c.id);
	const allCoaches = validCoachIds;

	let selectedCoaches: string[];

	// Always select 3 coaches for watercooler scenes
	if (type === "watercooler") {
		selectedCoaches = weightedCoachSelection(
			allCoaches,
			previousScene,
			3,
			episodeContext
		);
	} else {
		selectedCoaches = weightedCoachSelection(
			allCoaches,
			previousScene,
			2,
			episodeContext
		);
	}

	// Validate selected coaches
	const invalidCoaches = selectedCoaches.filter(
		(coach) => !validCoachIds.includes(coach)
	);
	if (invalidCoaches.length > 0) {
		throw new Error(`Invalid coaches selected: ${invalidCoaches.join(", ")}`);
	}

	// Get coach states safely
	const coachStates: { [coachId: string]: SceneCoachState } = {};
	for (const coach of selectedCoaches) {
		const state = getCoachState(coach);
		coachStates[coach] = {
			emotionalTone: state.emotionalTone,
			activeFlags: Object.entries(state.flags || {})
				.filter(([_, value]) => value)
				.map(([key, _]) => key),
			relationships: state.relationalTilt || {},
		};
	}

	return { coaches: selectedCoaches, coachStates };
}

function weightedCoachSelection(
	allCoaches: string[],
	previousScene: SceneSeed | undefined,
	count: number,
	episodeContext?: EpisodeContext
): string[] {
	// Validate input coaches
	const validCoachIds = ceos.map((c) => c.id);
	const validCoaches = allCoaches.filter((coach) =>
		validCoachIds.includes(coach)
	);

	if (validCoaches.length === 0) {
		throw new Error("No valid coaches available for selection");
	}

	// Start with valid coaches
	let available = [...validCoaches];

	// Remove coaches from previous scene to avoid immediate repetition
	if (previousScene) {
		available = available.filter(
			(coach) => !previousScene.coaches.includes(coach)
		);
	}

	// If we don't have enough coaches after filtering, add some back
	if (available.length < count) {
		const previousCoaches = previousScene?.coaches || [];
		const additionalCoaches = validCoaches.filter(
			(coach) => !previousCoaches.includes(coach)
		);
		available = [
			...available,
			...additionalCoaches.slice(0, count - available.length),
		];
	}

	// Calculate weights based on various factors
	const weights = new Map<string, number>();
	available.forEach((coach) => {
		let weight = 1.0;

		// Consider episode theme
		if (episodeContext?.theme && coachBackstory[coach]?.themes) {
			const themeMatch = coachBackstory[coach].themes.includes(
				episodeContext.theme
			);
			weight *= themeMatch ? 1.5 : 0.8;
		}

		// Consider time of day preferences
		const timePreference = coachBackstory[coach]?.preferredTimes;
		if (timePreference) {
			const currentHour = new Date().getHours();
			const isPreferredTime = timePreference.some(
				([start, end]: [number, number]) =>
					currentHour >= start && currentHour <= end
			);
			weight *= isPreferredTime ? 1.3 : 0.9;
		}

		// Consider location preferences
		const locationPreference = coachBackstory[coach]?.preferredLocations;
		if (locationPreference && episodeContext?.currentLocation) {
			const prefersLocation = locationPreference.includes(
				episodeContext.currentLocation
			);
			weight *= prefersLocation ? 1.4 : 0.9;
		}

		weights.set(coach, weight);
	});

	// Normalize weights
	const totalWeight = Array.from(weights.values()).reduce(
		(sum, w) => sum + w,
		0
	);
	const normalizedWeights = new Map(
		Array.from(weights.entries()).map(([coach, weight]) => [
			coach,
			weight / totalWeight,
		])
	);

	// Select coaches based on weights
	const selected: string[] = [];
	while (selected.length < count && available.length > 0) {
		const random = Math.random();
		let cumulativeWeight = 0;

		for (const coach of available) {
			cumulativeWeight += normalizedWeights.get(coach) || 0;
			if (random <= cumulativeWeight) {
				selected.push(coach);
				available = available.filter((c) => c !== coach);
				break;
			}
		}
	}

	// Validate final selection
	const invalidSelected = selected.filter(
		(coach) => !validCoachIds.includes(coach)
	);
	if (invalidSelected.length > 0) {
		throw new Error(`Invalid coaches selected: ${invalidSelected.join(", ")}`);
	}

	return selected;
}

export async function generateSceneFramework(
	episodeContext: EpisodeContext
): Promise<EpisodeScenes> {
	const schedule = readSchedule();

	const episode: EpisodeScenes = {
		seeds: [],
		generatedContent: {},
		metadata: {
			startTime: episodeContext.startTime,
			unitDuration: episodeContext.unitDurationMinutes,
			activeArcs: [episodeContext.theme],
			activeFlags: new Set(),
		},
	};

	for (let i = 0; i < 24; i++) {
		// Get scene type from schedule
		const sceneType = schedule[i] as SceneSeed["type"];

		// Determine location and time
		const locationAndTime = await determineLocationAndTime(i, episodeContext);

		// Get environmental context
		const environment = getEnvironmentalContext(
			locationAndTime.location,
			episodeContext
		);

		// Select coaches for this scene
		const { coaches, coachStates } = selectCoachesForScene(
			i,
			sceneType,
			episode.seeds[i - 1],
			episodeContext
		);

		// Build the scene seed
		const seed: SceneSeed = {
			index: i,
			type: sceneType,
			location: locationAndTime.location,
			localTime: locationAndTime.localTime,
			weather: environment.weather,
			events: environment.events,
			coaches,
			coachStates,
			isLocationTransition: false,
			introPrompt: generateIntroPrompt(
				locationAndTime,
				environment,
				coaches,
				episodeContext
			),
			convoPrompt:
				sceneType === "watercooler"
					? generateConvoPrompt(
							locationAndTime,
							environment,
							coaches,
							episodeContext
					  )
					: undefined,
			outroPrompt: generateOutroPrompt(
				locationAndTime,
				environment,
				coaches,
				episodeContext
			),
		};

		// Handle location transitions
		if (i > 0 && seed.location !== episode.seeds[i - 1].location) {
			seed.isLocationTransition = true;
			seed.previousLocation = episode.seeds[i - 1].location;
			seed.travelContext = {
				fromCity: episode.seeds[i - 1].location,
				toCity: seed.location,
				travelTime: episodeContext.unitDurationMinutes,
			};
		}

		// Track active flags
		Object.values(seed.coachStates).forEach((state) => {
			state.activeFlags.forEach((flag) =>
				episode.metadata.activeFlags.add(flag)
			);
		});

		episode.seeds.push(seed);
	}

	// Validate all scene seeds
	const validationResults = validateSceneSeeds(episode.seeds);
	const invalidScenes = validationResults.filter(
		(result: { valid: boolean }) => !result.valid
	);
	if (invalidScenes.length > 0) {
		console.error("Invalid scenes detected:", invalidScenes);
		throw new Error("Invalid scenes detected in episode generation");
	}

	return episode;
}

async function callGPT(
	prompt: string,
	maxTokens: number = 150,
	temperature: number = 0.7,
	model: "gpt-4-turbo" | "gpt-3.5-turbo" = "gpt-4-turbo"
): Promise<string> {
	try {
		console.log("Making GPT API call with prompt:", prompt);

		const response = await openai.chat.completions.create({
			model,
			messages: [
				{
					role: "system",
					content: `You are a writer describing scenes in a startup office. Your style is dry, detached, and lightly ironic.

CRITICAL RULES:
- ONLY describe what is physically visible: objects, settings, and observable actions.
- DO NOT describe or imply any thoughts, motives, strategies, emotions, or psychological states.
- DO NOT use words like "careful," "strategically," "battle," "power struggle," "assert control," "avoid," "measured distance," or any language that implies intent or feeling.
- DO NOT describe eye contact, glances, or facial expressions.
- DO NOT use cinematic, poetic, or atmospheric language.
- DO NOT explain why anyone is doing anything.
- DO NOT use dialogue or conversation.
- DO NOT summarize or foreshadow.

NEGATIVE EXAMPLES (DO NOT DO THIS):
- "engaging in a power struggle over the last muffin"
- "engaging in a passive-aggressive battle of thermostat adjustments"
- "strategically avoiding making eye contact"
- "careful to maintain a controlled distance"
- "maintaining a carefully measured distance"

POSITIVE EXAMPLES (DO THIS):
- "The coaches are pretending to troubleshoot a jammed coffee machine while sneakily checking Slack."
- "Rohan Mehta and Alex Monroe are hovering near the communal fridge, each pretending not to want the same LaCroix."
- "The coaches trickled off toward their next meetings, dodging half-finished to-do lists as they went."
- "The coaches drifted back to their desks, no wiser and only slightly more caffeinated."
`,
				},
				{
					role: "user",
					content: prompt,
				},
			],
			max_tokens: maxTokens,
			temperature: 0.5, // Lower temperature for more consistent output
			stream: false,
		});

		const content = response.choices[0]?.message?.content;
		console.log("GPT API response:", content);

		if (!content) {
			throw new Error("No content in GPT response");
		}

		return content;
	} catch (error) {
		console.error("GPT API call failed:", error);
		throw error;
	}
}

function generateIntroPrompt(
	locationAndTime: { location: string; localTime: string },
	environment: { weather: string; events: string[] },
	coaches: string[],
	episodeContext: EpisodeContext
): string {
	// Validate coaches
	if (!coaches || coaches.length === 0) {
		throw new Error("No coaches provided for scene");
	}

	const invalidCoaches = coaches.filter(
		(coach) => !ceos.find((c) => c.id === coach)
	);
	if (invalidCoaches.length > 0) {
		throw new Error(`Invalid coaches in scene: ${invalidCoaches.join(", ")}`);
	}

	const coachInfo = coaches
		.map((coach) => {
			const coachData = ceos.find((c) => c.id === coach);
			if (!coachData) {
				throw new Error(`Invalid coach ID: ${coach}`);
			}
			return `${coachData.name} (${coachData.character})`;
		})
		.filter(Boolean)
		.join(", ");

	return `Generate a scene introduction that follows these EXACT rules:

CRITICAL FORMAT RULES:
1. EXACTLY 2 lines total
2. Line 1: Pure factual setup - time, weather, place
3. Line 2: One dry, ironic group behavior - focus on small workplace absurdities
4. NO psychological descriptions or emotional interpretations
5. NO eye contact, glances, or facial expressions
6. NO mood shifts or atmosphere descriptions
7. NO dialogue or conversation
8. If you describe any motives, strategies, emotions, or psychological states, you have failed. Only describe what is physically visible.

EXAMPLE CORRECT FORMAT:
It's 11:26am on an overcast Thursday in the Los Angeles office.
The coaches are pretending to troubleshoot a jammed coffee machine while sneakily checking Slack.

SCENE CONTEXT:
- Location: ${locationAndTime.location}
- Time: ${locationAndTime.localTime}
- Weather: ${environment.weather}
- Coaches present: ${coachInfo}
- Theme: ${episodeContext.theme}

Generate a scene introduction following the exact format above.`;
}

function generateConvoPrompt(
	locationAndTime: { location: string; localTime: string },
	environment: { weather: string; events: string[] },
	coaches: string[],
	episodeContext: EpisodeContext
): string {
	// Validate coaches
	if (!coaches || coaches.length === 0) {
		throw new Error("No coaches provided for scene");
	}

	const invalidCoaches = coaches.filter(
		(coach) => !ceos.find((c) => c.id === coach)
	);
	if (invalidCoaches.length > 0) {
		throw new Error(`Invalid coaches in scene: ${invalidCoaches.join(", ")}`);
	}

	const coachContexts = coaches
		.map((coach) => {
			const coachData = ceos.find((c) => c.id === coach);
			if (!coachData) {
				throw new Error(`Invalid coach ID: ${coach}`);
			}
			return `- ${coachData.name} (${coachData.character})`;
		})
		.join("\n");

	const approvedCoaches = coaches
		.map((coach) => {
			const coachData = ceos.find((c) => c.id === coach);
			if (!coachData) {
				throw new Error(`Invalid coach ID: ${coach}`);
			}
			return `${coachData.name}`;
		})
		.join(", ");

	return `Scene Context:
- Location: ${locationAndTime.location}
- Time: ${locationAndTime.localTime}
- Weather: ${environment.weather}
- Theme: ${episodeContext.arc.theme}
- Motifs: ${episodeContext.arc.motifs.join(", ")}

Approved Coaches:
${coachContexts}

CRITICAL FORMAT RULES:
- Format each line EXACTLY as: [Full Coach Name]: [Short dialogue line]
- One line per coach, in the order listed above.
- Only use the exact names provided. No variations, nicknames, or invented characters.
- Each line should be 2–3 sentences.
- Tone must reflect ambiguity, restrained tension, and subtle misreading.
- Mention weather or surroundings lightly, but emotionally.

EXAMPLE OUTPUT:
Donte Disrupt: London feels smaller under this sky. I like it when ambition has to fight harder.
Alex Monroe: Cloudy days sharpen the senses. Or dull them, if you're too fragile.
Venus Metrics: Fragility has a 74% correlation with poor forecasting outcomes. I've seen it first-hand.

Generate a watercooler conversation with exactly 3 lines as instructed.`;
}

function generateOutroPrompt(
	locationAndTime: { location: string; localTime: string },
	environment: { weather: string; events: string[] },
	coaches: string[],
	episodeContext: EpisodeContext
): string {
	// Validate coaches
	if (!coaches || coaches.length === 0) {
		throw new Error("No coaches provided for scene");
	}

	const invalidCoaches = coaches.filter(
		(coach) => !ceos.find((c) => c.id === coach)
	);
	if (invalidCoaches.length > 0) {
		throw new Error(`Invalid coaches in scene: ${invalidCoaches.join(", ")}`);
	}

	const coachInfo = coaches
		.map((coach) => {
			const coachData = ceos.find((c) => c.id === coach);
			if (!coachData) {
				throw new Error(`Invalid coach ID: ${coach}`);
			}
			return `${coachData.name} (${coachData.character})`;
		})
		.join(", ");

	return `Generate a scene conclusion that follows these EXACT rules:

CRITICAL FORMAT RULES:
1. EXACTLY 1 sentence
2. Focus ONLY on physical dispersal
3. Light workplace irony only
4. NO psychological descriptions
5. NO emotional interpretations
6. NO predictions or foreshadowing
7. NO dialogue or conversation
8. If you describe any motives, strategies, emotions, or psychological states, you have failed. Only describe what is physically visible.

EXAMPLE CORRECT FORMAT:
The coaches trickled off toward their next meetings, dodging half-finished to-do lists as they went.

SCENE CONTEXT:
- Location: ${locationAndTime.location}
- Time: ${locationAndTime.localTime}
- Weather: ${environment.weather}
- Coaches present: ${coachInfo}
- Theme: ${episodeContext.theme}

Generate a scene conclusion following the exact format above.`;
}

interface ConversationLine {
	coach: string;
	line: string;
}

interface SceneContent {
	index: number;
	type: SceneSeed["type"];
	location: string;
	intro: string;
	conversation?: ConversationLine[];
	outro: string;
	coaches: string[];
	gptPrompt: {
		introPrompt: string;
		convoPrompt?: string;
		outroPrompt: string;
	};
	gptResponse: {
		intro: string;
		convo?: string[];
		outro: string;
	};
}

// Fallback templates
const FALLBACK_TEMPLATES = {
	intro:
		"They are gathered by the glass wall, watching the city do nothing in particular.",
	outro:
		"The coaches have returned to their corners, one thought heavier than before.",
	conversation: [
		{
			coach: "kailey",
			line: "It's quiet today. Which is almost worse than tension.",
		},
		{
			coach: "rohan",
			line: "Quiet is what happens when people are pretending.",
		},
		{
			coach: "alex",
			line: "Or processing. Not everything has to be said out loud.",
		},
	],
};

interface GPTResponse {
	intro: string;
	conversation?: ConversationLine[];
	outro: string;
}

async function parseConversationResponse(
	response: string,
	coaches: string[]
): Promise<ConversationLine[]> {
	// Split response into lines and clean up
	const lines = response
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	// Validate that no non-coach characters are mentioned
	const validCoachNames = coaches.map((coach) => {
		const coachData = ceos.find((c) => c.id === coach);
		return coachData?.name.toLowerCase();
	});

	const invalidCharacters = lines.some((line) => {
		const words = line.toLowerCase().split(" ");
		return words.some((word) => {
			// Check if word is a potential character name (capitalized)
			if (word[0] === word[0]?.toUpperCase()) {
				return !validCoachNames.includes(word);
			}
			return false;
		});
	});

	if (invalidCharacters) {
		console.error("Invalid characters detected in response:", response);
		// Use fallback conversation
		return FALLBACK_TEMPLATES.conversation;
	}

	// Map each coach to their line in order
	return coaches.map((coach, index) => ({
		coach,
		line: lines[index] || FALLBACK_TEMPLATES.conversation[index].line,
	}));
}

async function generateSceneWithGPT(
	seed: SceneSeed,
	episodeContext: EpisodeContext
): Promise<GPTResponse> {
	// Determine model based on scene type
	const model = seed.type === "watercooler" ? "gpt-4-turbo" : "gpt-3.5-turbo";

	// Generate intro
	const introPrompt = generateIntroPrompt(
		{ location: seed.location, localTime: seed.localTime },
		{ weather: seed.weather, events: seed.events },
		seed.coaches,
		episodeContext
	);

	const intro = await callGPT(introPrompt, 100, 0.7, model);

	// Generate conversation if watercooler
	let conversation: ConversationLine[] | undefined;
	if (seed.type === "watercooler") {
		const convoPrompt = generateConvoPrompt(
			{ location: seed.location, localTime: seed.localTime },
			{ weather: seed.weather, events: seed.events },
			seed.coaches,
			episodeContext
		);

		const convoResponse = await callGPT(convoPrompt, 150, 0.7, model);
		conversation = await parseConversationResponse(convoResponse, seed.coaches);
	}

	// Generate outro
	const outroPrompt = generateOutroPrompt(
		{ location: seed.location, localTime: seed.localTime },
		{ weather: seed.weather, events: seed.events },
		seed.coaches,
		episodeContext
	);

	const outro = await callGPT(outroPrompt, 100, 0.7, model);

	return {
		intro,
		conversation,
		outro,
	};
}

// Add validation function
function validateSceneContent(sceneContent: { intro: string; outro: string; coaches: string[]; }): { passed: boolean; issues: string[] } {
	const issues: string[] = [];

	// Check intro line count
	const introLines = sceneContent.intro.split('\n').length;
	if (introLines !== 2) {
		issues.push(`Intro has ${introLines} lines (expected 2).`);
	}

	// Check outro sentence count
	const outroSentences = (sceneContent.outro.match(/\./g) || []).length;
	if (outroSentences !== 1) {
		issues.push(`Outro has ${outroSentences} sentences (expected 1).`);
	}

	// Check for quotes in intro or outro
	if (sceneContent.intro.includes('"') || sceneContent.outro.includes('"')) {
		issues.push(`Intro or outro contains dialogue (quotes detected).`);
	}

	// Check for emotional words
	const emotionalWords = ["tension", "anticipation", "thoughts", "gaze", "emotion", "feelings", "reflection", "ponder"];
	emotionalWords.forEach(word => {
		if (sceneContent.intro.toLowerCase().includes(word) || sceneContent.outro.toLowerCase().includes(word)) {
			issues.push(`Emotional word detected ('${word}') in intro or outro.`);
		}
	});

	return {
		passed: issues.length === 0,
		issues,
	};
}

// Update generateSceneContent to use validation
export async function generateSceneContent(
	seed: SceneSeed,
	episodeContext: EpisodeContext
): Promise<SceneContent> {
	// Generate prompts
	const introPrompt = generateIntroPrompt(
		{ location: seed.location, localTime: seed.localTime },
		{ weather: seed.weather, events: seed.events },
		seed.coaches,
		episodeContext
	);

	const convoPrompt =
		seed.type === "watercooler"
			? generateConvoPrompt(
					{ location: seed.location, localTime: seed.localTime },
					{ weather: seed.weather, events: seed.events },
					seed.coaches,
					episodeContext
			  )
			: undefined;

	const outroPrompt = generateOutroPrompt(
		{ location: seed.location, localTime: seed.localTime },
		{ weather: seed.weather, events: seed.events },
		seed.coaches,
		episodeContext
	);

	// Call GPT for content generation
	let intro, conversation, outro;
	try {
		const gptResponse = await generateSceneWithGPT(seed, episodeContext);
		intro = gptResponse.intro;
		conversation = gptResponse.conversation;
		outro = gptResponse.outro;
	} catch (error) {
		console.error(`Error generating content for scene ${seed.index}:`, error);
		// Use fallbacks on error
		intro = FALLBACK_TEMPLATES.intro;
		outro = FALLBACK_TEMPLATES.outro;
		if (seed.type === "watercooler") {
			conversation = FALLBACK_TEMPLATES.conversation;
		}
	}

	// Log GPT input/output
	const sceneContent: SceneContent = {
		index: seed.index,
		type: seed.type,
		location: seed.location,
		intro,
		conversation,
		outro,
		coaches: seed.coaches,
		gptPrompt: {
			introPrompt,
			convoPrompt,
			outroPrompt,
		},
		gptResponse: {
			intro,
			convo: conversation?.map((c) => c.line),
			outro,
		},
	};

	// Validate scene content
	const validationResult = validateSceneContent(sceneContent);
	if (!validationResult.passed) {
		console.error(`Scene ${sceneContent.index} failed validation:`, validationResult.issues);
	}

	// Log to file
	await logSceneContent(sceneContent, episodeContext.date);

	return sceneContent;
}

async function logSceneContent(
	content: SceneContent,
	episodeDate: string
): Promise<void> {
	const logDir = join(process.cwd(), "logs", episodeDate);
	const logFile = join(logDir, `scene-${content.index}.json`);

	try {
		// Ensure directory exists
		await fs.promises.mkdir(logDir, { recursive: true });

		// Write log file
		await fs.promises.writeFile(logFile, JSON.stringify(content, null, 2));
	} catch (error) {
		console.error(`Error logging scene ${content.index}:`, error);
	}
}

export async function generateFullEpisode(
	episodeContext: EpisodeContext
): Promise<EpisodeScenes> {
	console.log("=== GENERATING FULL EPISODE FRAMEWORK ONLY ===");
	console.log("Episode Context:", {
		date: episodeContext.date,
		theme: episodeContext.theme,
		startTime: episodeContext.startTime,
	});

	// Generate the scene framework (seeds and structure) without content
	const framework = await generateSceneFramework(episodeContext);
	console.log(
		"Scene Framework generated with",
		framework.seeds.length,
		"scenes (no content generation)"
	);

	// Skip content generation for optimization
	// The generatedContent object remains empty, but the framework structure is preserved
	// This maintains currentSceneIndex functionality while saving 48-72 GPT calls
	console.log("Scene content generation skipped for optimization");
	console.log("Note: Admin commands viewing scene text will show empty content");

	console.log("=== OPTIMIZED EPISODE FRAMEWORK COMPLETE ===");
	return framework;
}

interface StateChange {
	emotionalTone?: string;
	relationalTilt?: Record<string, number>;
	flags?: Record<string, boolean>;
}

interface ScenePlayback {
	index: number;
	startTime: Date;
	endTime?: Date;
	stateChanges: Record<string, StateChange>;
	messageIds: string[];
	status: "pending" | "playing" | "completed" | "failed";
	error?: string;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMessage(
	content: string,
	type: "intro" | "outro" | "dialogue",
	coach?: string
): string {
	switch (type) {
		case "intro":
		case "outro":
			return `*${content}*`;
		case "dialogue":
			return `**${coach}**: ${content}`;
		default:
			return content;
	}
}

async function postMessageWithRetry(
	channel: TextChannel,
	content: string,
	maxRetries: number = 3
): Promise<string | null> {
	let retries = 0;
	let lastError: Error | null = null;

	while (retries <= maxRetries) {
		try {
			const message = await channel.send(content);
			return message.id;
		} catch (error) {
			lastError = error as Error;
			console.error(`Failed to post message (attempt ${retries + 1}):`, error);
			if (retries < maxRetries) {
				await sleep(5000 * (retries + 1)); // Exponential backoff
			}
			retries++;
		}
	}

	// Log the final error if all retries failed
	if (lastError) {
		console.error(`All retries failed for message: ${content}`, lastError);
	}

	return null;
}

function calculateStateChanges(
	scene: SceneContent,
	previousState: typeof coachState
): Record<string, StateChange> {
	const changes: Record<string, StateChange> = {};

	// Analyze conversation for state changes
	if (scene.conversation) {
		scene.conversation.forEach(({ coach, line }) => {
			if (!changes[coach]) {
				changes[coach] = {};
			}

			// Example heuristic: if line contains negative words, adjust emotional tone
			if (
				line.toLowerCase().includes("no") ||
				line.toLowerCase().includes("not")
			) {
				changes[coach].emotionalTone = "doubtful";
			}

			// Example heuristic: if coach mentions another coach negatively, adjust relationship
			scene.coaches.forEach((otherCoach) => {
				if (
					otherCoach !== coach &&
					line.toLowerCase().includes(otherCoach.toLowerCase())
				) {
					if (!changes[coach].relationalTilt) {
						changes[coach].relationalTilt = {};
					}
					changes[coach].relationalTilt[otherCoach] = -0.1;
				}
			});
		});
	}

	return changes;
}

function applyStateChanges(
	changes: Record<string, StateChange>,
	currentState: typeof coachState
): void {
	Object.entries(changes).forEach(([coach, change]) => {
		// Apply emotional tone changes with soft cap
		if (change.emotionalTone) {
			currentState[coach].emotionalTone = change.emotionalTone;
		}

		// Apply relationship changes with soft cap
		if (change.relationalTilt) {
			Object.entries(change.relationalTilt).forEach(([otherCoach, delta]) => {
				const currentTilt = currentState[coach].relationalTilt[otherCoach] || 0;
				const newTilt = Math.max(-1, Math.min(1, currentTilt + delta));
				currentState[coach].relationalTilt[otherCoach] = newTilt;
			});
		}

		// Apply flag changes
		if (change.flags) {
			Object.entries(change.flags).forEach(([flag, value]) => {
				currentState[coach].flags[flag] = value;
			});
		}
	});
}

async function playScene(
	scene: SceneContent,
	channel: TextChannel,
	episodeContext: EpisodeContext
): Promise<ScenePlayback> {
	const playback: ScenePlayback = {
		index: scene.index,
		startTime: new Date(),
		stateChanges: {},
		messageIds: [],
		status: "pending",
	};

	try {
		playback.status = "playing";

		// Post intro with enhanced error handling
		const introMessageId = await postMessageWithRetry(
			channel,
			formatMessage(scene.intro, "intro")
		);
		if (introMessageId) {
			playback.messageIds.push(introMessageId);
		} else {
			throw new Error("Failed to post intro message after all retries");
		}

		await sleep(3000);

		// Post conversation if watercooler
		if (scene.type === "watercooler" && scene.conversation) {
			for (const { coach, line } of scene.conversation) {
				const messageId = await postMessageWithRetry(
					channel,
					formatMessage(line, "dialogue", coach)
				);
				if (messageId) {
					playback.messageIds.push(messageId);
				} else {
					throw new Error(
						`Failed to post dialogue for ${coach} after all retries`
					);
				}

				await sleep(2000);
			}

			await sleep(3000);
		}

		// Post outro with enhanced error handling
		const outroMessageId = await postMessageWithRetry(
			channel,
			formatMessage(scene.outro, "outro")
		);
		if (outroMessageId) {
			playback.messageIds.push(outroMessageId);
		} else {
			throw new Error("Failed to post outro message after all retries");
		}

		// Calculate and apply state changes with validation
		const stateChanges = calculateStateChanges(scene, coachState);
		if (validateStateChanges(stateChanges)) {
			playback.stateChanges = stateChanges;
			applyStateChanges(stateChanges, coachState);
		} else {
			throw new Error("Invalid state changes detected");
		}

		playback.status = "completed";
		playback.endTime = new Date();
	} catch (error) {
		playback.status = "failed";
		playback.error = (error as Error).message;
		console.error(`Error playing scene ${scene.index}:`, error);
	}

	// Log playback with enhanced information
	await logScenePlayback(playback, episodeContext.date);

	return playback;
}

async function logScenePlayback(
	playback: ScenePlayback,
	episodeDate: string
): Promise<void> {
	const logDir = join(process.cwd(), "logs", episodeDate, "playback");
	const logFile = join(logDir, `scene-${playback.index}.json`);

	try {
		await fs.promises.mkdir(logDir, { recursive: true });
		await fs.promises.writeFile(logFile, JSON.stringify(playback, null, 2));
	} catch (error) {
		console.error(`Error logging playback for scene ${playback.index}:`, error);
	}
}

export async function playEpisode(
	episode: EpisodeScenes,
	channel: TextChannel,
	episodeContext: EpisodeContext
): Promise<void> {
	const startTime = new Date();
	const scenePlaybacks: ScenePlayback[] = [];

	for (let i = 0; i < 24; i++) {
		const scene = episode.generatedContent[i];
		if (!scene) {
			console.warn(`Scene ${i} not found in episode content`);
			continue;
		}

		// Calculate when this scene should start
		const sceneStartTime = new Date(
			startTime.getTime() + i * episodeContext.unitDurationMinutes * 60000
		);

		// Wait until it's time to play this scene
		const now = new Date();
		if (sceneStartTime > now) {
			const waitTime = sceneStartTime.getTime() - now.getTime();
			console.log(`Waiting ${waitTime}ms before playing scene ${i}`);
			await sleep(waitTime);
		}

		// Play the scene and track its playback
		const playback = await playScene(scene, channel, episodeContext);
		scenePlaybacks.push(playback);

		// Post system announcement every 6 scenes (after scenes 5, 11, 17, 23)
		if (i === 5 || i === 11 || i === 17 || i === 23) {
			console.log(`\n\n******************************************************************`);
			console.log(`***** SCENE ${i} FINISHED - CHECKING IF SYSTEM ANNOUNCEMENT NEEDED *****`);
			console.log(`***** SYSTEM ANNOUNCEMENT TRIGGER POINT REACHED *****`);
			console.log(`******************************************************************\n\n`);
			try {
				console.log(`Posting system announcement after scene ${i}...`);
				await postSystemAnnouncement(channel.client, i);
				console.log(`System announcement after scene ${i} attempt completed`);
			} catch (error) {
				console.error(`ERROR: System announcement after scene ${i} failed:`, error);
			}
		}

		// If scene failed, log it but continue with next scene
		if (playback.status === "failed") {
			console.error(`Scene ${i} failed to play: ${playback.error}`);
		}
	}

	// Log overall episode playback summary
	await logEpisodePlaybackSummary(scenePlaybacks, episodeContext.date);
}

// Add episode playback summary logging
async function logEpisodePlaybackSummary(
	playbacks: ScenePlayback[],
	episodeDate: string
): Promise<void> {
	const logDir = join(process.cwd(), "logs", episodeDate, "playback");
	const summaryFile = join(logDir, "episode-summary.json");

	const summary = {
		totalScenes: playbacks.length,
		completedScenes: playbacks.filter((p) => p.status === "completed").length,
		failedScenes: playbacks.filter((p) => p.status === "failed").length,
		startTime: playbacks[0]?.startTime,
		endTime: playbacks[playbacks.length - 1]?.endTime,
		sceneDetails: playbacks.map((p) => ({
			index: p.index,
			status: p.status,
			error: p.error,
			messageCount: p.messageIds.length,
		})),
	};

	try {
		await fs.promises.mkdir(logDir, { recursive: true });
		await fs.promises.writeFile(summaryFile, JSON.stringify(summary, null, 2));
	} catch (error) {
		console.error("Error logging episode playback summary:", error);
	}
}

// Add state change validation
function validateStateChanges(changes: Record<string, StateChange>): boolean {
	for (const [coachId, change] of Object.entries(changes)) {
		// Validate emotional tone
		if (change.emotionalTone && !isValidEmotionalTone(change.emotionalTone)) {
			return false;
		}

		// Validate relational tilt
		if (change.relationalTilt) {
			for (const [targetCoach, value] of Object.entries(
				change.relationalTilt
			)) {
				if (typeof value !== "number" || value < -1 || value > 1) {
					return false;
				}
			}
		}
	}
	return true;
}

function isValidEmotionalTone(tone: string): boolean {
	const validTones = ["neutral", "happy", "sad", "angry", "excited", "calm"];
	return validTones.includes(tone);
}

// Helper function to get current scene information
export function getCurrentScene(
	episode: EpisodeScenes,
	sceneIndex: number
): SceneContent | null {
	if (!episode || sceneIndex < 0 || sceneIndex >= 24) {
		return null;
	}

	const scene = episode.generatedContent[sceneIndex];
	if (!scene) {
		return null;
	}

	return scene;
}

// Helper function to format story info
export function formatStoryInfo(
	episodeContext: EpisodeContext,
	episode: EpisodeScenes,
	sceneIndex: number,
	overrideIrritation?: any
): string {
	// Read currentIrritation from story-arcs.json or use provided override
	let currentIrritation: any = overrideIrritation || null;
	
	// Only read from file if no override provided
	if (!currentIrritation) {
		const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');
		try {
			const storyArcs = JSON.parse(fs.readFileSync(storyArcsPath, 'utf-8'));
			currentIrritation = storyArcs.currentIrritation;
		} catch (e) {
			return "No irritation data available.";
		}
	}

	// Defensive type checks and name mapping
	const coachId = currentIrritation?.coach;
	const targetId = currentIrritation?.target;
	const incident = currentIrritation?.incident;

	const coach = ceos.find(c => c.id === coachId);
	const target = ceos.find(c => c.id === targetId);

	// Use first names only
	const coachName = coach?.name?.split(' ')[0] || (coachId ? coachId.charAt(0).toUpperCase() + coachId.slice(1) : "Unknown");
	const targetName = target?.name?.split(' ')[0] || (targetId ? targetId.charAt(0).toUpperCase() + targetId.slice(1) : "Unknown");

	if (!coachName || !incident || !targetName) {
		return "No irritation data available.";
	}

	// Gender-specific pronouns based on coach ID
	const genderPronouns: Record<string, string> = {
		'alex': 'She',
		'rohan': 'He',
		'eljas': 'He',
		'venus': 'She',
		'kailey': 'She',
		'donte': 'He'
	};
	
	// Get the proper pronoun, defaulting to "They" if coach not found
	const pronoun = genderPronouns[coachId] || 'They';

	// Calculate intensity for this scene, using watercooler logic
	let intensity = '?';
	const intensityObj = currentIrritation?.intensity;
	if (intensityObj && typeof sceneIndex === 'number' && sceneIndex >= 0 && sceneIndex < 24) {
		let timeOfDay: 'morning' | 'midday' | 'afternoon';
		if (sceneIndex < 8) timeOfDay = 'morning';
		else if (sceneIndex < 16) timeOfDay = 'midday';
		else timeOfDay = 'afternoon';
		const arr = intensityObj[timeOfDay];
		const idx = sceneIndex % 8;
		if (Array.isArray(arr) && arr.length > idx && typeof arr[idx] === 'number') {
			intensity = arr[idx].toString();
		}
	}

	// Format scene number with leading zero when needed
	const sceneNum = (sceneIndex + 1).toString().padStart(2, '0');

	// Use the correct gender pronoun in the casual format
	return `${coachName} had a rough one: ${incident}\n\n${pronoun}'s still a little salty with ${targetName} after bringing it up in chat and not loving how the convo went.\n\nscene: ${sceneNum} intensity: ${intensity}`;
}

// Helper function to validate story info data
export function validateStoryInfo(
	episodeContext: EpisodeContext,
	episode: EpisodeScenes,
	sceneIndex: number
): boolean {
	if (!episodeContext || !episode) {
		return false;
	}

	if (sceneIndex < 0 || sceneIndex >= 24) {
		return false;
	}

	const scene = episode.generatedContent[sceneIndex];
	if (!scene) {
		return false;
	}

	const seed = episode.seeds[sceneIndex];
	if (!seed) {
		return false;
	}

	// Validate required fields
	if (!scene.type || !scene.coaches || !seed.location || !seed.localTime) {
		return false;
	}

	return true;
}

// Add validation function
function validateCoachStates() {
	const validCoachIds = ceos.map((c) => c.id);
	const coachStateIds = Object.keys(coachState);

	const missingCoaches = validCoachIds.filter(
		(id) => !coachStateIds.includes(id)
	);
	const extraCoaches = coachStateIds.filter(
		(id) => !validCoachIds.includes(id)
	);

	if (missingCoaches.length > 0) {
		console.error("Missing coach states for:", missingCoaches);
	}

	if (extraCoaches.length > 0) {
		console.error("Extra coach states found:", extraCoaches);
	}

	if (missingCoaches.length > 0 || extraCoaches.length > 0) {
		throw new Error("Coach state validation failed. See logs for details.");
	}
}

// Call validation at startup
validateCoachStates();

// Add a function to get coach state safely
function getCoachState(coachId: string): CoachState {
	const state = coachState[coachId];
	if (!state) {
		console.error(
			`Available coach states: ${Object.keys(coachState).join(", ")}`
		);
		console.error(`Looking for coach: ${coachId}`);
		throw new Error(`Missing coach state for ${coachId}`);
	}
	return state;
}

// Monitor coachState modifications
const originalCoachState = { ...coachState };
Object.defineProperty(global, "coachState", {
	get: () => originalCoachState,
	set: (newValue) => {
		console.error("Attempt to modify coachState detected!");
		console.error("Original state:", originalCoachState);
		console.error("Attempted new state:", newValue);
		throw new Error("coachState cannot be modified");
	},
});
