/**
 * Amber Mood System
 *
 * Provides aesthetic variation tied to real-world rhythms.
 * Two dimensions:
 *   - Energy (0-1): minimal/sparse ↔ bold/dense
 *   - Valence (0-1): inward/contemplative ↔ outward/expressive
 *
 * Influenced by: lunar cycle, day of week, circadian rhythm, weather.
 * Honest framing: aesthetic tendency, not simulated emotions.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// =============================================================================
// TYPES
// =============================================================================

export interface Mood {
  energy: number;    // 0.0 to 1.0
  valence: number;   // 0.0 to 1.0
}

export interface DailyMoodRecord {
  date: string;              // YYYY-MM-DD
  energy_base: number;
  valence_base: number;
  pulse_hour: number;        // 0-23, when weather pulse fires
  pulse_fired: boolean;
  pulse_time: string | null;
  pulse_source: string | null;
  pulse_energy_delta: number;
  pulse_valence_delta: number;
  pulse_type: 'normal' | 'major';
}

export interface MoodDescription {
  energy: number;
  valence: number;
  quadrant: 'animated' | 'restless' | 'gentle' | 'contemplative';
  energy_terms: string;
  valence_terms: string;
  natural_language: string;
}

// =============================================================================
// LUNAR PHASE CALCULATION
// =============================================================================

/**
 * Calculate lunar phase (0 to 1, where 0 = new moon, 0.5 = full moon)
 * Using a known new moon as reference: January 6, 2000 at 18:14 UTC
 */
function getLunarPhase(date: Date = new Date()): number {
  const LUNAR_CYCLE_DAYS = 29.53058867;
  const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z');

  const daysSinceKnown = (date.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24);
  const cyclePosition = (daysSinceKnown % LUNAR_CYCLE_DAYS) / LUNAR_CYCLE_DAYS;

  // Normalize to 0-1
  return cyclePosition < 0 ? cyclePosition + 1 : cyclePosition;
}

/**
 * Convert lunar phase to valence influence
 * New moon (0) → inward (0.0)
 * Full moon (0.5) → outward (1.0)
 */
function lunarToValence(lunarPhase: number): number {
  // Use sine wave: new moon = 0, full moon = 1
  return Math.sin(lunarPhase * Math.PI) * 0.5 + 0.5;
}

// =============================================================================
// DAY OF WEEK ENERGY
// =============================================================================

const DAY_ENERGY: Record<number, number> = {
  0: 0.35,  // Sunday - restful
  1: 0.50,  // Monday - building
  2: 0.60,  // Tuesday - active
  3: 0.65,  // Wednesday - peak
  4: 0.60,  // Thursday - active
  5: 0.55,  // Friday - winding down
  6: 0.40,  // Saturday - relaxed
};

function getDayEnergy(date: Date = new Date()): number {
  return DAY_ENERGY[date.getDay()] ?? 0.5;
}

// =============================================================================
// CIRCADIAN RHYTHM
// =============================================================================

/**
 * Get circadian energy modifier based on hour
 * Adds ~0.2 at noon, subtracts ~0.2 at midnight
 * Uses PT (Pacific Time) as Amber's "home" timezone
 */
function getCircadianModifier(date: Date = new Date()): number {
  // Convert to PT
  const ptHour = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getHours();

  // Sine wave: peak at noon (hour 12), trough at midnight (hour 0)
  // sin((hour - 6) * pi / 12) gives -1 at hour 0, +1 at hour 12
  return Math.sin((ptHour - 6) * Math.PI / 12) * 0.2;
}

// =============================================================================
// BASE MOOD CALCULATION
// =============================================================================

/**
 * Calculate base mood for a given date (without circadian or pulse)
 * Called at midnight to set the day's baseline
 */
export function calculateBaseMood(date: Date = new Date()): { energy: number; valence: number } {
  const lunarPhase = getLunarPhase(date);
  const valence_lunar = lunarToValence(lunarPhase);
  const energy_day = getDayEnergy(date);

  // Add small random perturbation (-0.1 to +0.1)
  const energy_random = (Math.random() - 0.5) * 0.2;
  const valence_random = (Math.random() - 0.5) * 0.2;

  // Clamp to [0.05, 0.95] to avoid extremes
  const energy = Math.max(0.05, Math.min(0.95, energy_day + energy_random));
  const valence = Math.max(0.05, Math.min(0.95, valence_lunar + valence_random));

  return { energy, valence };
}

// =============================================================================
// WEATHER PULSE
// =============================================================================

interface WeatherCondition {
  condition: string;
  temperature_f: number;
}

/**
 * Map weather conditions to mood deltas
 */
export function weatherToMoodDelta(weather: WeatherCondition): { energy: number; valence: number } {
  let valence_delta = 0;
  let energy_delta = 0;

  // Condition → valence
  const condition = weather.condition.toLowerCase();
  if (condition.includes('clear') || condition.includes('sunny')) {
    valence_delta = 0.15;
  } else if (condition.includes('partly')) {
    valence_delta = 0.05;
  } else if (condition.includes('cloud') || condition.includes('overcast')) {
    valence_delta = -0.05;
  } else if (condition.includes('rain') || condition.includes('drizzle')) {
    valence_delta = -0.10;
  } else if (condition.includes('storm') || condition.includes('thunder')) {
    valence_delta = -0.15;
  } else if (condition.includes('snow')) {
    valence_delta = 0.10; // novelty/beauty
  } else if (condition.includes('fog') || condition.includes('mist')) {
    valence_delta = -0.08;
  }

  // Temperature → energy
  const temp = weather.temperature_f;
  if (temp < 40) {
    energy_delta = -0.10;
  } else if (temp < 55) {
    energy_delta = -0.05;
  } else if (temp <= 75) {
    energy_delta = 0.05;
  } else if (temp <= 85) {
    energy_delta = 0.00;
  } else {
    energy_delta = -0.08; // oppressive heat
  }

  return { energy: energy_delta, valence: valence_delta };
}

/**
 * Calculate pulse decay factor
 * Normal pulses: half-strength at ~5.5 hours
 * Major pulses: half-strength at ~11 hours
 */
function getPulseDecay(hoursSincePulse: number, pulseType: 'normal' | 'major'): number {
  const decayConstant = pulseType === 'major' ? 16 : 8;
  return Math.exp(-hoursSincePulse / decayConstant);
}

// =============================================================================
// CURRENT MOOD CALCULATION
// =============================================================================

/**
 * Get current mood by combining base, circadian, and any active pulse
 */
export function calculateCurrentMood(record: DailyMoodRecord, now: Date = new Date()): Mood {
  let energy = record.energy_base;
  let valence = record.valence_base;

  // Apply circadian modifier
  energy += getCircadianModifier(now);

  // Apply pulse if fired
  if (record.pulse_fired && record.pulse_time) {
    const pulseTime = new Date(record.pulse_time);
    const hoursSincePulse = (now.getTime() - pulseTime.getTime()) / (1000 * 60 * 60);
    const decay = getPulseDecay(hoursSincePulse, record.pulse_type);

    energy += record.pulse_energy_delta * decay;
    valence += record.pulse_valence_delta * decay;
  }

  // Clamp to valid range
  energy = Math.max(0.0, Math.min(1.0, energy));
  valence = Math.max(0.0, Math.min(1.0, valence));

  return { energy, valence };
}

// =============================================================================
// MOOD DESCRIPTION
// =============================================================================

/**
 * Get the quadrant name for a mood
 */
function getQuadrant(mood: Mood): 'animated' | 'restless' | 'gentle' | 'contemplative' {
  if (mood.energy >= 0.5 && mood.valence >= 0.5) return 'animated';
  if (mood.energy >= 0.5 && mood.valence < 0.5) return 'restless';
  if (mood.energy < 0.5 && mood.valence >= 0.5) return 'gentle';
  return 'contemplative';
}

/**
 * Get energy descriptor terms for art prompts
 */
function getEnergyTerms(energy: number): string {
  if (energy < 0.3) return 'minimal, sparse, restrained, quiet';
  if (energy > 0.7) return 'bold, saturated, dense, dynamic';
  return 'balanced, measured, moderate';
}

/**
 * Get valence descriptor terms for art prompts
 */
function getValenceTerms(valence: number): string {
  if (valence < 0.3) return 'introspective, abstract, solitary, shadowed';
  if (valence > 0.7) return 'warm, inviting, connected, luminous';
  return 'neutral, observational';
}

/**
 * Generate natural language mood description
 */
function getNaturalLanguage(mood: Mood, pulseSource: string | null): string {
  const quadrant = getQuadrant(mood);

  const quadrantPhrases: Record<string, string[]> = {
    animated: [
      "I'm in an animated space today—good energy for bold moves.",
      "Feeling expressive. Bold colors and big gestures.",
      "High energy, outward focus. Time to make something loud.",
    ],
    restless: [
      "Restless energy today. Complex patterns feel right.",
      "Searching mood—layered, intricate, not quite settled.",
      "High energy but turned inward. Experimental mode.",
    ],
    gentle: [
      "Gentle today. Soft edges and warm tones.",
      "Quiet but connected. Inviting, not imposing.",
      "Low key, outward leaning. Warmth without intensity.",
    ],
    contemplative: [
      "Contemplative space today. Minimal, abstract.",
      "Inward and quiet. The art wants to be sparse.",
      "Reflective mood. Monochrome and space feel right.",
    ],
  };

  const phrases = quadrantPhrases[quadrant];
  const basephrase = phrases[Math.floor(Math.random() * phrases.length)];

  // Add weather context if available
  if (pulseSource?.startsWith('weather:')) {
    const weatherInfo = pulseSource.replace('weather:', '');
    return `${basephrase} Something about the ${weatherInfo.toLowerCase()}.`;
  }

  return basephrase;
}

/**
 * Get full mood description for use in prompts and responses
 */
export function describeMood(mood: Mood, pulseSource: string | null = null): MoodDescription {
  return {
    energy: mood.energy,
    valence: mood.valence,
    quadrant: getQuadrant(mood),
    energy_terms: getEnergyTerms(mood.energy),
    valence_terms: getValenceTerms(mood.valence),
    natural_language: getNaturalLanguage(mood, pulseSource),
  };
}

// =============================================================================
// SUPABASE INTEGRATION
// =============================================================================

/**
 * Get today's date string in YYYY-MM-DD format (PT timezone)
 */
function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

/**
 * Load today's mood record from Supabase
 */
export async function loadTodayMoodRecord(): Promise<DailyMoodRecord | null> {
  const today = getTodayDateString();

  try {
    const { data, error } = await supabase
      .from('amber_state')
      .select('metadata')
      .eq('type', 'mood')
      .eq('content', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.metadata as DailyMoodRecord;
  } catch {
    return null;
  }
}

/**
 * Save today's mood record to Supabase
 */
export async function saveMoodRecord(record: DailyMoodRecord): Promise<void> {
  try {
    // Check if record exists for today
    const existing = await loadTodayMoodRecord();

    if (existing) {
      // Update existing
      await supabase
        .from('amber_state')
        .update({ metadata: record })
        .eq('type', 'mood')
        .eq('content', record.date);
    } else {
      // Insert new
      await supabase
        .from('amber_state')
        .insert({
          type: 'mood',
          content: record.date,
          source: 'mood-system',
          metadata: record,
        });
    }

    console.log(`[amber-mood] Saved mood record for ${record.date}`);
  } catch (error) {
    console.error('[amber-mood] Failed to save mood record:', error);
  }
}

/**
 * Generate and save a new daily mood record
 * Called by scheduler at midnight PT
 */
export async function generateDailyMood(): Promise<DailyMoodRecord> {
  const now = new Date();
  const today = getTodayDateString();
  const baseMood = calculateBaseMood(now);

  // Random pulse hour for today (0-23)
  const pulseHour = Math.floor(Math.random() * 24);

  const record: DailyMoodRecord = {
    date: today,
    energy_base: baseMood.energy,
    valence_base: baseMood.valence,
    pulse_hour: pulseHour,
    pulse_fired: false,
    pulse_time: null,
    pulse_source: null,
    pulse_energy_delta: 0,
    pulse_valence_delta: 0,
    pulse_type: 'normal',
  };

  await saveMoodRecord(record);
  console.log(`[amber-mood] Generated daily mood: energy=${baseMood.energy.toFixed(2)}, valence=${baseMood.valence.toFixed(2)}, pulse_hour=${pulseHour}`);

  return record;
}

/**
 * Apply a pulse to today's mood (weather or manual event)
 */
export async function applyMoodPulse(
  source: string,
  energyDelta: number,
  valenceDelta: number,
  type: 'normal' | 'major' = 'normal'
): Promise<void> {
  const record = await loadTodayMoodRecord();
  if (!record) {
    console.warn('[amber-mood] No mood record for today, generating one');
    await generateDailyMood();
    return applyMoodPulse(source, energyDelta, valenceDelta, type);
  }

  record.pulse_fired = true;
  record.pulse_time = new Date().toISOString();
  record.pulse_source = source;
  record.pulse_energy_delta = energyDelta;
  record.pulse_valence_delta = valenceDelta;
  record.pulse_type = type;

  await saveMoodRecord(record);
  console.log(`[amber-mood] Applied pulse: ${source}, energy=${energyDelta}, valence=${valenceDelta}`);
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get Amber's current mood
 * This is the main function other systems should call
 */
export async function getMood(): Promise<MoodDescription> {
  let record = await loadTodayMoodRecord();

  // Generate if missing
  if (!record) {
    console.log('[amber-mood] No mood record for today, generating...');
    record = await generateDailyMood();
  }

  const mood = calculateCurrentMood(record);
  return describeMood(mood, record.pulse_source);
}

/**
 * Get mood context string for art generation prompts
 */
export async function getMoodForArtPrompt(): Promise<string> {
  const description = await getMood();
  return `aesthetic mood: ${description.energy_terms}, ${description.valence_terms}`;
}

// =============================================================================
// SCHEDULER INTEGRATION
// =============================================================================

import { registerDailyJob } from './scheduler/index.js';

/**
 * Check if it's time to fire today's weather pulse
 * Called hourly by scheduler
 */
async function checkWeatherPulse(): Promise<void> {
  const record = await loadTodayMoodRecord();
  if (!record) {
    console.log('[amber-mood] No mood record, skipping pulse check');
    return;
  }

  // Already fired today
  if (record.pulse_fired) {
    return;
  }

  // Check if current hour matches pulse hour
  const ptHour = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: false,
  });
  const currentHour = parseInt(ptHour, 10);

  if (currentHour !== record.pulse_hour) {
    return;
  }

  // Time to fire pulse - fetch weather
  console.log(`[amber-mood] Pulse hour reached (${currentHour}), fetching weather...`);

  try {
    const weather = await fetchWeather();
    if (weather) {
      const delta = weatherToMoodDelta(weather);
      await applyMoodPulse(
        `weather:${weather.condition},${Math.round(weather.temperature_f)}F`,
        delta.energy,
        delta.valence
      );
    }
  } catch (error) {
    console.error('[amber-mood] Weather fetch failed:', error);
  }
}

/**
 * Fetch weather from OpenWeatherMap (San Francisco by default)
 */
async function fetchWeather(): Promise<{ condition: string; temperature_f: number } | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.log('[amber-mood] No OPENWEATHER_API_KEY, skipping weather pulse');
    return null;
  }

  // San Francisco coordinates
  const lat = 37.7749;
  const lon = -122.4194;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      console.error('[amber-mood] Weather API error:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      condition: data.weather?.[0]?.main || 'Unknown',
      temperature_f: data.main?.temp || 60,
    };
  } catch (error) {
    console.error('[amber-mood] Weather fetch error:', error);
    return null;
  }
}

/**
 * Register mood system scheduler jobs
 * - Midnight: Generate daily mood
 * - Hourly: Check for weather pulse
 */
export function registerAmberMoodJobs(): void {
  // Generate daily mood at midnight PT
  registerDailyJob({
    name: 'amber-mood-daily',
    hour: 0,
    minute: 0,
    timezone: 'America/Los_Angeles',
    async run() {
      await generateDailyMood();
    },
    onError(error) {
      console.error('[amber-mood] Daily mood generation failed:', error);
    },
  });

  // Check weather pulse every hour (on the hour)
  // We register 24 jobs, one for each hour
  for (let hour = 0; hour < 24; hour++) {
    registerDailyJob({
      name: `amber-mood-pulse-${hour}`,
      hour,
      minute: 5, // 5 minutes past each hour
      timezone: 'America/Los_Angeles',
      async run() {
        await checkWeatherPulse();
      },
      onError(error) {
        console.error(`[amber-mood] Pulse check failed at hour ${hour}:`, error);
      },
    });
  }

  console.log('[amber-mood] Registered: daily mood at midnight PT, weather pulse checks hourly');
}
