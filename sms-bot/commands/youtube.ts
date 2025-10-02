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
}

const FOLLOW_UP_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESULTS = 3;

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
  let finalQuery: string;

  try {
    if (!userResponse || ['skip', 'no', 'none'].includes(userResponse.toLowerCase())) {
      finalQuery = cleanQuery(state.originalQuery);
    } else {
      finalQuery = await generateSearchQuery(state.originalQuery, userResponse);
    }
  } catch (error) {
    console.error('YouTube query refinement failed:', error);
    finalQuery = cleanQuery(state.originalQuery);
  }

  try {
    let effectiveHours = state.hours;
    let videos = await searchRecentVideos(finalQuery, effectiveHours);

    if (videos.length === 0 && effectiveHours <= 24) {
      effectiveHours = 168;
      videos = await searchRecentVideos(finalQuery, effectiveHours);
    }

    const response = formatVideosForSMS(
      videos.slice(0, MAX_RESULTS),
      finalQuery,
      effectiveHours
    );
    await context.sendChunkedSmsResponse(
      context.from,
      response,
      context.twilioClient,
      1200
    );
  } catch (error) {
    console.error('YouTube search failed:', error);
    await context.sendSmsResponse(
      context.from,
      '❌ YouTube search failed. Please try again later.',
      context.twilioClient
    );
  } finally {
    stateMap.delete(context.from);
    await context.updateLastMessageDate(context.normalizedFrom);
  }

  return true;
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
