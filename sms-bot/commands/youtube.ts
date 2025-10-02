import {
  cleanQuery,
  formatVideosForSMS,
  generateSearchQuery,
  getFollowupQuestion,
  parseTimeFromInput,
  searchRecentVideos,
} from '../agents/youtube-agent.js';
import type { CommandContext, CommandHandler } from './types.js';

interface YouTubeSearchState {
  originalQuery: string;
  hours: number;
  timestamp: number;
  cachedResults: YouTubeVideo[];
  offset: number;
}

const FOLLOW_UP_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESULTS = 3;

const STOP_KEYWORDS = new Set(['stop', 'end', 'cancel', 'done', 'quit', 'exit']);
const GREETING_KEYWORDS = ['hi', 'hello', 'hey'];
const TIME_HINTS = ['last 3 hours', 'last three hours', 'past 3 hours'];

type YouTubeVideo = Awaited<ReturnType<typeof searchRecentVideos>>[number];

function getStateMap(
  context: CommandContext
): Map<string, YouTubeSearchState> | null {
  const helpers = context.commandHelpers;
  if (!helpers) {
    return null;
  }

  const map = helpers['youtubeSearchStates'];
  if (map && map instanceof Map) {
    return map as Map<string, YouTubeSearchState>;
  }

  return null;
}

function hasActiveState(
  stateMap: Map<string, YouTubeSearchState> | null,
  phone: string
): YouTubeSearchState | null {
  if (!stateMap) {
    return null;
  }

  const state = stateMap.get(phone);
  if (!state) {
    return null;
  }

  const isExpired = Date.now() - state.timestamp > FOLLOW_UP_TIMEOUT_MS;
  if (isExpired) {
    stateMap.delete(phone);
    return null;
  }

  return state;
}

async function startSearch(
  context: CommandContext,
  stateMap: Map<string, YouTubeSearchState>,
  query: string
): Promise<boolean> {
  const trimmed = query.trim();
  if (!trimmed) {
    await context.sendSmsResponse(
      context.from,
      'Usage: YT [topic]\nExample: YT bitcoin trading',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  const hours = parseTimeFromInput(trimmed);
  const cleanedTopic = cleanQuery(trimmed);

  try {
    const followup = await getFollowupQuestion(cleanedTopic);

    stateMap.set(context.from, {
      originalQuery: cleanedTopic,
      hours,
      timestamp: Date.now(),
      cachedResults: [],
      offset: 0,
    });

    const prompt = followup ||
      'What kind of videos are you looking for? (news, tutorials, reviews, interviews…)';

    await context.sendSmsResponse(
      context.from,
      `🤔 ${prompt}\nReply with your preference or say SKIP to continue without refining.`,
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  } catch (error) {
    console.error('YouTube follow-up generation failed:', error);
    await context.sendSmsResponse(
      context.from,
      '❌ Could not start the YouTube search. Please try again shortly.',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }
}

async function continueSearch(
  context: CommandContext,
  stateMap: Map<string, YouTubeSearchState>,
  state: YouTubeSearchState,
  userResponse: string
): Promise<boolean> {
  const trimmed = userResponse.trim();
  const lower = trimmed.toLowerCase();
  const upper = trimmed.toUpperCase();

  if (!trimmed) {
    await context.sendSmsResponse(
      context.from,
      'Reply MORE, LAST 3 HRS, REVIEWS, NEW [topic], or STOP to exit.',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  if (STOP_KEYWORDS.has(lower)) {
    stateMap.delete(context.from);
    await context.sendSmsResponse(
      context.from,
      'Got it, ending the YouTube search.',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  if (GREETING_KEYWORDS.includes(lower)) {
    stateMap.delete(context.from);
    return false;
  }

  if (upper === 'AI DAILY' || upper.startsWith('AI DAILY ')) {
    stateMap.delete(context.from);
    return false;
  }

  if (upper === 'MORE' || upper === 'NEXT') {
    return sendFromCacheOrFetch(context, stateMap, state);
  }

  if (upper === 'SKIP' || upper === 'NO' || upper === 'NONE') {
    state.timestamp = Date.now();
    state.offset = 0;
    return fetchAndSend(context, stateMap, state, state.originalQuery, true);
  }

  if (upper.startsWith('NEW ')) {
    const newTopic = trimmed.replace(/^new\s+/i, '').trim();
    stateMap.delete(context.from);
    return startSearch(context, stateMap, newTopic);
  }

  const quickHours = interpretTimeAdjustment(trimmed);
  if (quickHours !== null) {
    state.hours = quickHours;
    state.timestamp = Date.now();
    state.offset = 0;
    return fetchAndSend(context, stateMap, state, state.originalQuery, true);
  }

  if (!looksLikeRefinement(trimmed)) {
    stateMap.delete(context.from);
    return false;
  }

  let finalQuery: string;
  try {
    finalQuery = await generateSearchQuery(state.originalQuery, trimmed);
  } catch (error) {
    console.error('YouTube query refinement failed:', error);
    finalQuery = `${state.originalQuery} ${trimmed}`.trim();
  }

  state.originalQuery = finalQuery;
  state.timestamp = Date.now();
  state.offset = 0;
  return fetchAndSend(context, stateMap, state, finalQuery, false);
}

async function fetchVideos(
  query: string,
  hours: number,
  allowFallback: boolean
): Promise<{ videos: YouTubeVideo[]; hoursUsed: number }> {
  let videos = await searchRecentVideos(query, hours);
  let hoursUsed = hours;

  // If no results and fallback is allowed, try expanding to 7 days
  if (videos.length === 0 && allowFallback && hours <= 24) {
    console.log(`📺 No results in ${hours}h, expanding to 7 days`);
    videos = await searchRecentVideos(query, 168);
    hoursUsed = 168;
  }

  return { videos, hoursUsed };
}

async function sendFromCacheOrFetch(
  context: CommandContext,
  stateMap: Map<string, YouTubeSearchState>,
  state: YouTubeSearchState
): Promise<boolean> {
  const { cachedResults, offset } = state;

  if (cachedResults.length === 0) {
    await context.sendSmsResponse(
      context.from,
      `No videos found for "${state.originalQuery}" in the last ${state.hours} hours. Try a different topic or time range.`,
      context.twilioClient
    );
    stateMap.delete(context.from);
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // Show next batch of MAX_RESULTS videos
  const batch = cachedResults.slice(offset, offset + MAX_RESULTS);
  const remaining = cachedResults.length - (offset + batch.length);

  if (batch.length === 0) {
    await context.sendSmsResponse(
      context.from,
      'No more results. Reply NEW [topic] to start a new search.',
      context.twilioClient
    );
    stateMap.delete(context.from);
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // Build message
  let message = `📺 Fresh videos (last ${state.hours}h):\n\n`;

  batch.forEach((video, idx) => {
    message += `${offset + idx + 1}. [${video.timeAgo}] ${video.title}\n`;
    message += `   📺 ${video.channel}\n`;
    message += `   🔗 youtube.com/watch?v=${video.videoId}\n\n`;
  });

  if (remaining > 0) {
    message += `Reply MORE for ${remaining} more result${remaining === 1 ? '' : 's'}.`;
  } else {
    message += `That's all! Reply NEW [topic] to search something else.`;
  }

  await context.sendSmsResponse(
    context.from,
    message.trim(),
    context.twilioClient
  );

  // Update offset for next "MORE" request
  state.offset = offset + batch.length;
  state.timestamp = Date.now();
  stateMap.set(context.from, state);

  await context.updateLastMessageDate(context.normalizedFrom);
  return true;
}

async function fetchAndSend(
  context: CommandContext,
  stateMap: Map<string, YouTubeSearchState>,
  state: YouTubeSearchState,
  query: string,
  allowFallback: boolean
): Promise<boolean> {
  try {
    const { videos, hoursUsed } = await fetchVideos(query, state.hours, allowFallback);
    state.cachedResults = videos;
    state.hours = hoursUsed;
    state.offset = 0;
    state.timestamp = Date.now();
    stateMap.set(context.from, state);

    return sendFromCacheOrFetch(context, stateMap, state);
  } catch (error) {
    console.error('YouTube search failed:', error);
    await context.sendSmsResponse(
      context.from,
      '❌ YouTube search failed. Please try again later.',
      context.twilioClient
    );
    stateMap.delete(context.from);
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }
}

export const youtubeCommandHandler: CommandHandler = {
  name: 'youtube',
  matches(context) {
    const map = getStateMap(context);
    if (map && map.has(context.from)) {
      return true;
    }

    return (
      context.messageUpper.startsWith('YT ') ||
      context.messageUpper === 'YT' ||
      context.messageUpper.startsWith('YOUTUBE ')
    );
  },
  async handle(context) {
    const stateMap = getStateMap(context);

    if (!stateMap) {
      await context.sendSmsResponse(
        context.from,
        'YouTube search is not available right now. Please try again later.',
        context.twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    const existingState = hasActiveState(stateMap, context.from);

    if (existingState) {
      return continueSearch(
        context,
        stateMap,
        existingState,
        context.message.trim()
      );
    }

    // New search
    if (context.messageUpper.startsWith('YT') || context.messageUpper.startsWith('YOUTUBE')) {
      const query = context.message.replace(/^YT(?:UBE)?\s*/i, '').trim();
      return startSearch(context, stateMap, query);
    }

    return false;
  },
};
function interpretTimeAdjustment(userInput: string): number | null {
  const lower = userInput.toLowerCase();

  if (TIME_HINTS.some((pattern) => lower.includes(pattern))) {
    return 3;
  }

  if (lower.includes('last hour') || lower.includes('past hour')) {
    return 1;
  }

  if (lower.includes('last day') || lower.includes('past day') || lower.includes('24 hour')) {
    return 24;
  }

  if (lower.includes('last week') || lower.includes('past week')) {
    return 168;
  }

  if (lower.includes('48 hour')) {
    return 48;
  }

  return null;
}

function isGreeting(text: string): boolean {
  const lower = text.toLowerCase();
  return GREETING_KEYWORDS.includes(lower);
}

function looksUnrelated(text: string): boolean {
  const lower = text.toLowerCase();
  if (isGreeting(lower)) {
    return true;
  }

  if (lower.startsWith('ai ')) {
    return true;
  }

  const unrelatedKeywords = [
    'weather',
    'temperature',
    'surf',
    'snow',
    'crypto',
    'stock',
    'coach',
    'slug',
    'help',
    'wtaf',
    'index',
  ];

  return unrelatedKeywords.some((keyword) => lower.includes(keyword));
}

function looksLikeRefinement(text: string): boolean {
  if (!text) {
    return false;
  }

  if (looksUnrelated(text)) {
    return false;
  }

  return true;
}
