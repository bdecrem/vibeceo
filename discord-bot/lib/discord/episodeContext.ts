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
  
  try {
    // Ensure the story-themes directory exists
    const storyArcsDir = path.join(process.cwd(), 'data', 'story-themes');
    if (!fs.existsSync(storyArcsDir)) {
      fs.mkdirSync(storyArcsDir, { recursive: true });
    }
    
    // Path to the story arcs file
    const storyArcsPath = path.join(storyArcsDir, 'story-arcs.json');
    
    // Check if the file exists
    if (!fs.existsSync(storyArcsPath)) {
      // Create a default story arc file if it doesn't exist
      const defaultStoryArcs = {
        currentIrritation: {
          coach: "kailey",
          target: "donte",
          incident: "typo in presentation",
          intensity: {
            morning: [1, 2, 3, 4, 5, 6, 7, 8],
            midday: [2, 3, 4, 5, 6, 7, 8, 9],
            afternoon: [3, 4, 5, 6, 7, 8, 9, 10]
          }
        },
        storyArcs: {
          donte: {
            getting_irritated_by_kailey: {
              context: "Workplace distractions",
              promptAttribute: "distraction"
            }
          }
        }
      };
      
      fs.writeFileSync(storyArcsPath, JSON.stringify(defaultStoryArcs, null, 2));
      console.log('Created default story arcs file:', storyArcsPath);
    }
    
    // Load story arcs
    const storyArcs = JSON.parse(fs.readFileSync(storyArcsPath, 'utf-8'));
    
    // Use currentIrritation data if available, otherwise use a fallback
    let arcTheme = "Workplace dynamics";
    let arcAttribute = "interaction";
    
    if (storyArcs.currentIrritation) {
      const { coach, target, incident } = storyArcs.currentIrritation;
      arcTheme = `${coach} reacting to ${target}'s ${incident}`;
      arcAttribute = incident;
    } else if (storyArcs.storyArcs?.donte?.getting_irritated_by_kailey) {
      // Fallback to the original static path if it exists
      arcTheme = storyArcs.storyArcs.donte.getting_irritated_by_kailey.context;
      arcAttribute = storyArcs.storyArcs.donte.getting_irritated_by_kailey.promptAttribute;
    }
    
    return {
      theme: arcTheme,
      arcSummary: `A day of ${arcAttribute} and its effects.`,
      toneKeywords: [arcAttribute, "unfocused", "distracted"],
      motifs: ["unfinished tasks", "lost train of thought", "wandering mind"]
    };
  } catch (error) {
    console.error('Error generating arc:', error);
    // Return a default arc in case of error
    return {
      theme: "Office life",
      arcSummary: "A typical day at the office with its ups and downs.",
      toneKeywords: ["professional", "casual", "office"],
      motifs: ["meetings", "conversations", "work tasks"]
    };
  }
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