import { getLocationAndTime } from './locationTime.js';
import { getWeatherForCity } from './weather.js';
import { getHolidaysForDateAndCity } from './holidays.js';
import { knownCulturalEvents } from './culturalEvents.js'; // optional overlay

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
}

export async function generateEpisodeContext(unitDurationMinutes: number): Promise<EpisodeContext> {
  const now = new Date();
  const startUTCHour = now.getUTCHours();
  const startUTCMinutes = now.getUTCMinutes();

  const totalUnits = 24;
  const durationMinutes = totalUnits * unitDurationMinutes;
  const sceneTimestampsUTC: number[] = [];

  for (let i = 0; i < totalUnits; i++) {
    const minutesFromStart = i * unitDurationMinutes;
    const sceneDate = new Date(now.getTime() + minutesFromStart * 60000);
    sceneTimestampsUTC.push(sceneDate.getUTCHours());
  }

  const locationTimeline = sceneTimestampsUTC.map(hour => getLocationAndTime(hour, 0).location);

  const uniqueLocations = [...new Set(locationTimeline)];
  const weatherByLocation: Record<string, string> = {};
  const holidaysByLocation: Record<string, string[]> = {};

  for (const location of uniqueLocations) {
    const cityName = location.includes('Los Angeles') ? 'Los Angeles' : location.includes('Singapore') ? 'Singapore' : 'London';

    const weather = await getWeatherForCity(cityName);
    const holidays = await getHolidaysForDateAndCity(cityName, now);
    const extras = knownCulturalEvents?.[now.toISOString().split('T')[0]]?.[cityName] ?? [];

    weatherByLocation[cityName] = weather;
    holidaysByLocation[cityName] = [...holidays, ...extras];
  }

  const fullDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    date: now.toISOString().split('T')[0],
    dayOfWeek: fullDate.split(',')[0],
    startTime: fullDate,
    unitDurationMinutes,
    durationMinutes,
    locationTimeline,
    weatherByLocation,
    holidaysByLocation,
    theme: '',
    currentLocation: '',
  };
} 