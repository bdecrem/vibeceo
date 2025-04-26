// sceneFramework.ts

import { EpisodeContext } from './episodeContext.js';
import { getLocationAndTime } from './locationTime.js';
import { coachState } from '../../data/coach-dynamics.js';
import { coachBackstory } from '../../data/coach-backstory.js';
import { ceos } from '../../data/discord-ceos.js';
import { CoachState, SceneCoachState } from './types/coaches.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import fs from 'fs';
import { openai } from './ai.js';
import { TextChannel } from 'discord.js';
import pLimit from 'p-limit';

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
  convoPrompt?: string;  // only for watercooler
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
  }
}

function readSchedule(): string[] {
  const schedulePath = join(process.cwd(), 'data', 'schedule.txt');
  const scheduleContent = readFileSync(schedulePath, 'utf-8');
  return scheduleContent.trim().split('\n');
}

function determineLocationAndTime(
  sceneIndex: number,
  episodeContext: EpisodeContext
): { location: string; localTime: string } {
  const sceneHour = parseInt(episodeContext.locationTimeline[sceneIndex], 10);
  const { location, formattedTime, ampm } = getLocationAndTime(sceneHour, 0);
  return {
    location,
    localTime: `${formattedTime}${ampm}`
  };
}

function getEnvironmentalContext(
  location: string,
  episodeContext: EpisodeContext
): { weather: string; events: string[] } {
  const cityName = location.includes('Los Angeles') ? 'Los Angeles' : 
                  location.includes('Singapore') ? 'Singapore' : 'London';
  
  return {
    weather: episodeContext.weatherByLocation[cityName],
    events: episodeContext.holidaysByLocation[cityName] || []
  };
}

function selectCoachesForScene(
  sceneIndex: number,
  type: string,
  previousScene?: SceneSeed,
  episodeContext?: EpisodeContext
): { coaches: string[]; coachStates: { [coachId: string]: SceneCoachState } } {
  const allCoaches = Object.keys(coachState);
  let selectedCoaches: string[];
  
  if (type === 'watercooler') {
    selectedCoaches = weightedCoachSelection(allCoaches, previousScene, 3, episodeContext);
  } else {
    selectedCoaches = weightedCoachSelection(allCoaches, previousScene, 2, episodeContext);
  }

  const coachStates: { [coachId: string]: SceneCoachState } = {};
  for (const coach of selectedCoaches) {
    coachStates[coach] = {
      emotionalTone: coachState[coach].emotionalTone,
      activeFlags: Object.entries(coachState[coach].flags)
        .filter(([_, value]) => value)
        .map(([key, _]) => key),
      relationships: coachState[coach].relationalTilt
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
  // Start with all coaches
  let available = [...allCoaches];
  
  // Remove coaches from previous scene to avoid immediate repetition
  if (previousScene) {
    available = available.filter(coach => !previousScene.coaches.includes(coach));
  }
  
  // Calculate weights based on various factors
  const weights = new Map<string, number>();
  available.forEach(coach => {
    let weight = 1.0;
    
    // Consider episode theme
    if (episodeContext?.theme && coachBackstory[coach]?.themes) {
      const themeMatch = coachBackstory[coach].themes.includes(episodeContext.theme);
      weight *= themeMatch ? 1.5 : 0.8;
    }
    
    // Consider time of day preferences
    const timePreference = coachBackstory[coach]?.preferredTimes;
    if (timePreference) {
      const currentHour = new Date().getHours();
      const isPreferredTime = timePreference.some(([start, end]: [number, number]) => 
        currentHour >= start && currentHour <= end
      );
      weight *= isPreferredTime ? 1.3 : 0.9;
    }
    
    // Consider location preferences
    const locationPreference = coachBackstory[coach]?.preferredLocations;
    if (locationPreference && episodeContext?.currentLocation) {
      const prefersLocation = locationPreference.includes(episodeContext.currentLocation);
      weight *= prefersLocation ? 1.4 : 0.9;
    }
    
    weights.set(coach, weight);
  });
  
  // Normalize weights
  const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
  const normalizedWeights = new Map(
    Array.from(weights.entries()).map(([coach, weight]) => 
      [coach, weight / totalWeight]
    )
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
        available = available.filter(c => c !== coach);
        break;
      }
    }
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
      activeFlags: new Set()
    }
  };

  for (let i = 0; i < 24; i++) {
    // Get scene type from schedule
    const sceneType = schedule[i] as SceneSeed['type'];
    
    // Determine location and time
    const locationAndTime = determineLocationAndTime(i, episodeContext);
    
    // Get environmental context
    const environment = getEnvironmentalContext(locationAndTime.location, episodeContext);
    
    // Select coaches for this scene
    const { coaches, coachStates } = selectCoachesForScene(i, sceneType, episode.seeds[i-1], episodeContext);

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
      introPrompt: generateIntroPrompt(locationAndTime, environment, coaches, episodeContext),
      convoPrompt: sceneType === 'watercooler' ? 
        generateConvoPrompt(locationAndTime, environment, coaches, episodeContext) : 
        undefined,
      outroPrompt: generateOutroPrompt(locationAndTime, environment, coaches, episodeContext)
    };

    // Handle location transitions
    if (i > 0 && seed.location !== episode.seeds[i-1].location) {
      seed.isLocationTransition = true;
      seed.previousLocation = episode.seeds[i-1].location;
      seed.travelContext = {
        fromCity: episode.seeds[i-1].location,
        toCity: seed.location,
        travelTime: episodeContext.unitDurationMinutes
      };
    }

    // Track active flags
    Object.values(seed.coachStates).forEach(state => {
      state.activeFlags.forEach(flag => episode.metadata.activeFlags.add(flag));
    });

    episode.seeds.push(seed);
  }

  return episode;
}

function generateIntroPrompt(
  locationAndTime: { location: string; localTime: string },
  environment: { weather: string; events: string[] },
  coaches: string[],
  episodeContext: EpisodeContext
): string {
  const eventContext = environment.events.length > 0 ? 
    `\nRecent events: ${environment.events.join(', ')}` : '';
    
  const coachInfo = coaches.map(coach => {
    const coachData = ceos.find(c => c.id === coach);
    if (!coachData) {
      console.error(`Invalid coach ID: ${coach}`);
      return '';
    }
    return `${coachData.name} (${coachData.character})`;
  }).filter(Boolean).join(', ');
    
  return `Generate a scene introduction that:
  - Sets the location: ${locationAndTime.location}
  - Establishes the time: ${locationAndTime.localTime}
  - Describes the weather: ${environment.weather}${eventContext}
  - Introduces ONLY these specific coaches: ${coachInfo}
  - Reflects the episode theme: ${episodeContext.theme}
  
  CRITICAL RULES - NO EXCEPTIONS:
  1. ONLY use these exact names: ${coachInfo}
  2. NEVER use any other names
  3. NEVER create new characters
  4. NEVER use nicknames or first names
  5. NEVER reference characters not in the list above
  6. NEVER use "undefined" or "mysterious figure"
  
  Format: A single paragraph that sets the scene.`;
}

function generateConvoPrompt(
  locationAndTime: { location: string; localTime: string },
  environment: { weather: string; events: string[] },
  coaches: string[],
  episodeContext: EpisodeContext
): string {
  // First list coach contexts with their full info
  const coachContexts = coaches.map(coach => {
    const coachData = ceos.find(c => c.id === coach);
    return `- ${coachData?.name} (${coachData?.character}): ${coachState[coach].emotionalTone}
    Style: ${coachData?.style}
    Background: ${coachData?.prompt.split('\n')[0]}`;
  }).join('\n\n');

  // List of all valid coach names for reference
  const validCoachNames = [
    'Donte Disrupt',
    'Venus Metrics',
    'Kailey Calm',
    'Alex Monroe',
    'Rohan Mehta',
    'Eljas Virtanen'
  ].join('\n\t• ');

  return `Generate a conversation between ONLY these specific coaches:
  ${coachContexts}

  Format each line as: [Coach Name]: [Dialogue]

  Only use the exact names listed below for [Coach Name]. No variations, no invented names, no nicknames, no substitutions.

  The approved coaches are:
  • ${validCoachNames}

  Requirements:
  - Generate exactly ${coaches.length} lines of dialogue
  - One line per coach in order
  - Each line should be a complete thought
  - Reference the location, time, and weather
  - Progress the episode theme: ${episodeContext.theme}

  Example:
  Donte Disrupt: This isn't a pivot — it's a correction.
  Venus Metrics: Corrections are noise in a system with no signal.
  Kailey Calm: We don't need more noise. We need quiet clarity.`;
}

function generateOutroPrompt(
  locationAndTime: { location: string; localTime: string },
  environment: { weather: string; events: string[] },
  coaches: string[],
  episodeContext: EpisodeContext
): string {
  const coachInfo = coaches.map(coach => {
    const coachData = ceos.find(c => c.id === coach);
    return `${coachData?.name} (${coachData?.character})`;
  }).join(', ');

  return `Generate a scene conclusion that:
  - Summarizes the key points from the conversation
  - References the episode theme: ${episodeContext.theme}
  - Sets up anticipation for the next scene
  - Leaves some tensions unresolved
  - Only references the coaches who were present: ${coachInfo}
  
  CRITICAL RULES:
  - ONLY use the coaches listed above
  - DO NOT introduce or reference any other characters
  - DO NOT create new characters
  - DO NOT mention any characters not in the list above
  
  Format: A single paragraph that concludes the scene.`;
}

interface ConversationLine {
  coach: string;
  line: string;
}

interface SceneContent {
  index: number;
  type: SceneSeed['type'];
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
  intro: "They are gathered by the glass wall, watching the city do nothing in particular.",
  outro: "The coaches have returned to their corners, one thought heavier than before.",
  conversation: [
    { coach: "kailey", line: "It's quiet today. Which is almost worse than tension." },
    { coach: "rohan", line: "Quiet is what happens when people are pretending." },
    { coach: "alex", line: "Or processing. Not everything has to be said out loud." }
  ]
};

interface GPTResponse {
  intro: string;
  conversation?: ConversationLine[];
  outro: string;
}

async function callGPT(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  model: 'gpt-4-turbo' | 'gpt-3.5-turbo' = 'gpt-4-turbo'
): Promise<string> {
  try {
    console.log('Making GPT API call with prompt:', prompt);
    
    // Get the exact coach names from the prompt
    const coachNames = prompt.match(/Introduces ONLY these specific coaches: (.*?)(?:\n|$)/)?.[1] || '';
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a scene writer. You must follow these rules EXACTLY:

1. CHARACTER RULES:
   - ONLY use these exact names: ${coachNames}
   - NEVER use any other names
   - NEVER create new characters
   - NEVER use nicknames or first names
   - NEVER reference characters not in the list above
   - NEVER use "undefined" or "mysterious figure"

2. DIALOGUE RULES:
   - Each line must begin with one of the exact names listed above
   - No exceptions to the name rules
   - No variations of names allowed

3. SCENE RULES:
   - Only describe actions of the listed characters
   - Never mention or imply other characters
   - Never create new characters or relationships

VIOLATION OF THESE RULES IS NOT ALLOWED.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.5, // Lower temperature for more consistent output
      stream: false
    });

    const content = response.choices[0]?.message?.content;
    console.log('GPT API response:', content);
    
    if (!content) {
      throw new Error('No content in GPT response');
    }
    
    return content;
  } catch (error) {
    console.error('GPT API call failed:', error);
    throw error;
  }
}

async function parseConversationResponse(
  response: string,
  coaches: string[]
): Promise<ConversationLine[]> {
  // Split response into lines and clean up
  const lines = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Validate that no non-coach characters are mentioned
  const validCoachNames = coaches.map(coach => {
    const coachData = ceos.find(c => c.id === coach);
    return coachData?.name.toLowerCase();
  });

  const invalidCharacters = lines.some(line => {
    const words = line.toLowerCase().split(' ');
    return words.some(word => {
      // Check if word is a potential character name (capitalized)
      if (word[0] === word[0]?.toUpperCase()) {
        return !validCoachNames.includes(word);
      }
      return false;
    });
  });

  if (invalidCharacters) {
    console.error('Invalid characters detected in response:', response);
    // Use fallback conversation
    return FALLBACK_TEMPLATES.conversation;
  }

  // Map each coach to their line in order
  return coaches.map((coach, index) => ({
    coach,
    line: lines[index] || FALLBACK_TEMPLATES.conversation[index].line
  }));
}

async function generateSceneWithGPT(
  seed: SceneSeed,
  episodeContext: EpisodeContext
): Promise<GPTResponse> {
  // Determine model based on scene type
  const model = seed.type === 'watercooler' ? 'gpt-4-turbo' : 'gpt-3.5-turbo';

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
  if (seed.type === 'watercooler') {
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
    outro
  };
}

async function generateSceneContent(
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

  const convoPrompt = seed.type === 'watercooler' ? 
    generateConvoPrompt(
      { location: seed.location, localTime: seed.localTime },
      { weather: seed.weather, events: seed.events },
      seed.coaches,
      episodeContext
    ) : undefined;

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
    if (seed.type === 'watercooler') {
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
      outroPrompt
    },
    gptResponse: {
      intro,
      convo: conversation?.map(c => c.line),
      outro
    }
  };

  // Log to file
  await logSceneContent(sceneContent, episodeContext.date);

  return sceneContent;
}

async function logSceneContent(
  content: SceneContent,
  episodeDate: string
): Promise<void> {
  const logDir = join(process.cwd(), 'logs', episodeDate);
  const logFile = join(logDir, `scene-${content.index}.json`);
  
  try {
    // Ensure directory exists
    await fs.promises.mkdir(logDir, { recursive: true });
    
    // Write log file
    await fs.promises.writeFile(
      logFile,
      JSON.stringify(content, null, 2)
    );
  } catch (error) {
    console.error(`Error logging scene ${content.index}:`, error);
  }
}

export async function generateFullEpisode(
  episodeContext: EpisodeContext
): Promise<EpisodeScenes> {
  console.log('=== GENERATING FULL EPISODE ===');
  console.log('Episode Context:', {
    date: episodeContext.date,
    theme: episodeContext.theme,
    startTime: episodeContext.startTime
  });
  
  const framework = await generateSceneFramework(episodeContext);
  console.log('Scene Framework generated with', framework.seeds.length, 'scenes');
  
  // Initialize rate limiter - limit to 5 concurrent requests
  const limit = pLimit(5);
  
  // Generate content for each scene in parallel with rate limiting
  const contentPromises = framework.seeds.map(seed => 
    limit(async () => {
      console.log(`Generating content for scene ${seed.index}`);
      const content = await generateSceneContent(seed, episodeContext);
      console.log(`Scene ${seed.index} content generated`);
      return { index: seed.index, content };
    })
  );

  // Wait for all scenes to be generated
  const results = await Promise.all(contentPromises);
  
  // Assign generated content to framework
  results.forEach(({ index, content }) => {
    framework.generatedContent[index] = content;
  });

  console.log('=== FULL EPISODE GENERATION COMPLETE ===');
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
  status: 'pending' | 'playing' | 'completed' | 'failed';
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatMessage(content: string, type: 'intro' | 'outro' | 'dialogue', coach?: string): string {
  switch (type) {
    case 'intro':
    case 'outro':
      return `*${content}*`;
    case 'dialogue':
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
      if (line.toLowerCase().includes('no') || line.toLowerCase().includes('not')) {
        changes[coach].emotionalTone = 'doubtful';
      }
      
      // Example heuristic: if coach mentions another coach negatively, adjust relationship
      scene.coaches.forEach(otherCoach => {
        if (otherCoach !== coach && line.toLowerCase().includes(otherCoach.toLowerCase())) {
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
    status: 'pending'
  };
  
  try {
    playback.status = 'playing';
    
    // Post intro with enhanced error handling
    const introMessageId = await postMessageWithRetry(
      channel,
      formatMessage(scene.intro, 'intro')
    );
    if (introMessageId) {
      playback.messageIds.push(introMessageId);
    } else {
      throw new Error('Failed to post intro message after all retries');
    }
    
    await sleep(3000);
    
    // Post conversation if watercooler
    if (scene.type === 'watercooler' && scene.conversation) {
      for (const { coach, line } of scene.conversation) {
        const messageId = await postMessageWithRetry(
          channel,
          formatMessage(line, 'dialogue', coach)
        );
        if (messageId) {
          playback.messageIds.push(messageId);
        } else {
          throw new Error(`Failed to post dialogue for ${coach} after all retries`);
        }
        
        await sleep(2000);
      }
      
      await sleep(3000);
    }
    
    // Post outro with enhanced error handling
    const outroMessageId = await postMessageWithRetry(
      channel,
      formatMessage(scene.outro, 'outro')
    );
    if (outroMessageId) {
      playback.messageIds.push(outroMessageId);
    } else {
      throw new Error('Failed to post outro message after all retries');
    }
    
    // Calculate and apply state changes with validation
    const stateChanges = calculateStateChanges(scene, coachState);
    if (validateStateChanges(stateChanges)) {
      playback.stateChanges = stateChanges;
      applyStateChanges(stateChanges, coachState);
    } else {
      throw new Error('Invalid state changes detected');
    }
    
    playback.status = 'completed';
    playback.endTime = new Date();
    
  } catch (error) {
    playback.status = 'failed';
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
  const logDir = join(process.cwd(), 'logs', episodeDate, 'playback');
  const logFile = join(logDir, `scene-${playback.index}.json`);
  
  try {
    await fs.promises.mkdir(logDir, { recursive: true });
    await fs.promises.writeFile(
      logFile,
      JSON.stringify(playback, null, 2)
    );
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
    const sceneStartTime = new Date(startTime.getTime() + i * episodeContext.unitDurationMinutes * 60000);
    
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
    
    // If scene failed, log it but continue with next scene
    if (playback.status === 'failed') {
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
  const logDir = join(process.cwd(), 'logs', episodeDate, 'playback');
  const summaryFile = join(logDir, 'episode-summary.json');
  
  const summary = {
    totalScenes: playbacks.length,
    completedScenes: playbacks.filter(p => p.status === 'completed').length,
    failedScenes: playbacks.filter(p => p.status === 'failed').length,
    startTime: playbacks[0]?.startTime,
    endTime: playbacks[playbacks.length - 1]?.endTime,
    sceneDetails: playbacks.map(p => ({
      index: p.index,
      status: p.status,
      error: p.error,
      messageCount: p.messageIds.length
    }))
  };
  
  try {
    await fs.promises.mkdir(logDir, { recursive: true });
    await fs.promises.writeFile(
      summaryFile,
      JSON.stringify(summary, null, 2)
    );
  } catch (error) {
    console.error('Error logging episode playback summary:', error);
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
      for (const [targetCoach, value] of Object.entries(change.relationalTilt)) {
        if (typeof value !== 'number' || value < -1 || value > 1) {
          return false;
        }
      }
    }
  }
  return true;
}

function isValidEmotionalTone(tone: string): boolean {
  const validTones = ['neutral', 'happy', 'sad', 'angry', 'excited', 'calm'];
  return validTones.includes(tone);
}

// Helper function to get current scene information
export function getCurrentScene(episode: EpisodeScenes, sceneIndex: number): SceneContent | null {
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
export function formatStoryInfo(episodeContext: EpisodeContext, episode: EpisodeScenes, sceneIndex: number): string {
  if (!episodeContext || !episode) {
    return 'No active story arc at the moment.';
  }

  const scene = episode.generatedContent[sceneIndex];
  if (!scene) {
    return 'Scene information not available.';
  }

  const seed = episode.seeds[sceneIndex];
  if (!seed) {
    return 'Scene information not available.';
  }

  return `
**Current Story Arc**
Theme: ${episodeContext.theme}
Arc Summary: ${episodeContext.arc.arcSummary}

**Current Scene** (${sceneIndex + 1} of 24)
Type: ${scene.type}
Location: ${seed.location}
Time: ${seed.localTime}
Active Coaches: ${scene.coaches.join(', ')}

**Story Elements**
Tone: ${episodeContext.arc.toneKeywords.join(', ')}
Motifs: ${episodeContext.arc.motifs.join(', ')}
  `;
}

// Helper function to validate story info data
export function validateStoryInfo(episodeContext: EpisodeContext, episode: EpisodeScenes, sceneIndex: number): boolean {
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