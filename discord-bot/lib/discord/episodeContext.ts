import { getLocationAndTime } from './locationTime.js';
import { getWeatherForCity } from './weather.js';
import { getHolidaysForDateAndCity } from './holidays.js';
import { knownCulturalEvents } from './culturalEvents.js'; // optional overlay
import { generateCharacterResponse } from './ai.js';
import fs from 'fs';
import path from 'path';

export interface EpisodeArc {
  theme: string;
  arcSummary: string;
  toneKeywords: string[];
  motifs: string[];
}

export interface EpisodeContext {
  date: string;
  dayOfWeek: string;
  startTime: string;
  unitDurationMinutes: number;
  durationMinutes: number;
  locationTimeline: string[];
  weatherByLocation: Record<string, string>;
  holidaysByLocation: Record<string, string[]>;
  theme: string;
  currentLocation: string;
  arc: EpisodeArc;
}

async function generateArc(context: {
  date: string;
  weather: Record<string, string>;
  holidays: Record<string, string[]>;
}): Promise<EpisodeArc> {
  console.log('=== GENERATING ARC ===');
  console.log('Input context:', context);
  
  // Load story arcs
  const storyArcs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json'), 'utf-8'));
  const selectedArc = storyArcs.storyArcs.donte.distracted;
  
  return {
    theme: selectedArc.context,
    arcSummary: `A day of ${selectedArc.promptAttribute} and its effects.`,
    toneKeywords: [selectedArc.promptAttribute, "unfocused", "distracted"],
    motifs: ["unfinished tasks", "lost train of thought", "wandering mind"]
  };
}

export async function generateEpisodeContext(
  startTime: string = new Date().toISOString(),
  unitDurationMinutes: number = 15
): Promise<EpisodeContext> {
  console.log('=== GENERATING EPISODE CONTEXT ===');
  console.log('Start time:', startTime);
  console.log('Unit duration:', unitDurationMinutes);
  
  const date = new Date(startTime).toISOString().split('T')[0];
  
  // Get weather for each city
  console.log('Fetching weather...');
  const weatherByLocation = {
    'London': await getWeatherForCity('London'),
    'Los Angeles': await getWeatherForCity('Los Angeles'),
    'Singapore': await getWeatherForCity('Singapore')
  };
  console.log('Weather fetched:', weatherByLocation);

  // Get holidays for each city
  console.log('Fetching holidays...');
  const holidaysByLocation = {
    'London': await getHolidaysForDateAndCity('London', new Date(startTime)),
    'Los Angeles': await getHolidaysForDateAndCity('Los Angeles', new Date(startTime)),
    'Singapore': await getHolidaysForDateAndCity('Singapore', new Date(startTime))
  };
  console.log('Holidays fetched:', holidaysByLocation);

  // Generate the thematic arc
  const arc = await generateArc({
    date,
    weather: weatherByLocation,
    holidays: holidaysByLocation
  });

  // Log the generated context
  console.log('=== EPISODE CONTEXT ===');
  console.log('Date:', date);
  console.log('Theme:', arc.theme);
  console.log('Arc Summary:', arc.arcSummary);
  console.log('Tone Keywords:', arc.toneKeywords.join(', '));
  console.log('Motifs:', arc.motifs.join(', '));
  console.log('Weather:', weatherByLocation);
  console.log('Holidays:', holidaysByLocation);

  const fullDate = new Date(startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    date,
    dayOfWeek: fullDate.split(',')[0],
    startTime,
    unitDurationMinutes,
    durationMinutes: 24 * unitDurationMinutes,
    locationTimeline: generateLocationTimeline(24),
    weatherByLocation,
    holidaysByLocation,
    theme: arc.theme,
    currentLocation: '',
    arc
  };
}

function generateLocationTimeline(hours: number): string[] {
  const timeline: string[] = [];
  for (let i = 0; i < hours; i++) {
    if (i >= 16 || i < 1) {
      timeline.push('Los Angeles');
    } else if (i >= 1 && i < 8) {
      timeline.push('Singapore');
    } else {
      timeline.push('London');
    }
  }
  return timeline;
} 