import { EpisodeContext } from "./episodeContext";
import { ceos } from "../../data/ceos";

export function generateIntroPrompt(
	locationAndTime: { location: string; localTime: string },
	environment: { weather: string; events: string[] },
	coaches: string[],
	episodeContext: EpisodeContext,
	isWeekend: boolean,
	sceneType: string
): string {
	const coachDescriptions = coaches
		.map((coach) => {
			const coachData = ceos.find((c) => c.id === coach);
			return coachData ? `- ${coachData.name} (${coachData.character})` : "";
		})
		.filter(Boolean)
		.join("\n");

	const weekdayLocation = locationAndTime.location;
	const weekendSettings = [
		"a quiet cafe",
		"a shaded courtyard",
		"an empty bookstore lounge",
		"the waterfront",
		"an open plaza",
		"a sunlit park bench",
	];
	const weekendLocation =
		weekendSettings[Math.floor(Math.random() * weekendSettings.length)];

	const effectiveLocation = isWeekend ? weekendLocation : weekdayLocation;

	const line1 = `It’s ${locationAndTime.localTime} on a ${environment.weather} ${episodeContext.dayOfWeek} in ${effectiveLocation}.`;

	let line2 = "";

	if (sceneType === "watercooler") {
		line2 = `They are gathered loosely, half-finished coffees and unfinished sentences between them.`;
	} else if (sceneType === "newschat") {
		line2 = `They are clustered around a flickering tablet, trading glances at the morning’s headlines.`;
	} else if (sceneType === "tmzchat") {
		line2 = `They are leaning near the espresso machine, raising eyebrows at a forgotten tabloid headline.`;
	} else if (sceneType === "pitchchat") {
		line2 = `They are seated at a long table, flipping through pitch decks with the patience of people who have already decided.`;
	}

	return `${line1}\n${line2}`;
}
