/**
 * YouTube Command Handler - Agent SDK Version
 * Simple, conversational YouTube search using autonomous agent
 */

import {
  searchYouTubeWithAgent,
  formatVideosForSMS,
  formatMoreVideos,
  type YouTubeVideo,
} from '../agents/youtube-search/index.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, extractAfterPrefix } from './command-utils.js';

interface YouTubeAgentState {
  videos: YouTubeVideo[];
  originalQuery: string;
  offset: number;
  timestamp: number;
}

const STATE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const STOP_KEYWORDS = new Set(['stop', 'end', 'cancel', 'done', 'quit', 'exit']);

function getStateMap(
  context: CommandContext
): Map<string, YouTubeAgentState> | null {
  const helpers = context.commandHelpers;
  if (!helpers) {
    return null;
  }

  const map = helpers['youtubeAgentStates'];
  if (map && map instanceof Map) {
    return map as Map<string, YouTubeAgentState>;
  }

  return null;
}

function hasActiveState(
  stateMap: Map<string, YouTubeAgentState> | null,
  phone: string
): YouTubeAgentState | null {
  if (!stateMap) {
    return null;
  }

  const state = stateMap.get(phone);
  if (!state) {
    return null;
  }

  // Check if expired
  const isExpired = Date.now() - state.timestamp > STATE_TIMEOUT_MS;
  if (isExpired) {
    stateMap.delete(phone);
    return null;
  }

  return state;
}

async function startNewSearch(
  context: CommandContext,
  stateMap: Map<string, YouTubeAgentState>,
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

  try {
    console.log(`📺 YouTube agent searching for: "${trimmed}"`);

    // Send immediate response so user knows we're working
    await context.sendSmsResponse(
      context.from,
      '🔍 Searching YouTube, one moment...',
      context.twilioClient
    );

    // Call autonomous agent (may take 10-30 seconds)
    const result = await searchYouTubeWithAgent(trimmed);

    if (result.error) {
      console.error('YouTube agent error:', result.error);
      await context.sendSmsResponse(
        context.from,
        '❌ YouTube search failed. Please try again.',
        context.twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    if (result.videos.length === 0) {
      await context.sendSmsResponse(
        context.from,
        `No fresh videos found for "${trimmed}". Try different keywords?`,
        context.twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    // Store state for follow-ups
    stateMap.set(context.from, {
      videos: result.videos,
      originalQuery: trimmed,
      offset: 0,
      timestamp: Date.now(),
    });

    // Send first batch with follow-up question
    const message = formatVideosForSMS(result.videos, result.followup, 0);
    await context.sendSmsResponse(context.from, message, context.twilioClient);
    await context.updateLastMessageDate(context.normalizedFrom);

    return true;
  } catch (error) {
    console.error('YouTube agent failed:', error);
    await context.sendSmsResponse(
      context.from,
      '❌ YouTube search failed. Please try again later.',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }
}

async function handleFollowUp(
  context: CommandContext,
  stateMap: Map<string, YouTubeAgentState>,
  state: YouTubeAgentState,
  userResponse: string
): Promise<boolean> {
  const trimmed = userResponse.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // STOP command
  if (STOP_KEYWORDS.has(lower)) {
    stateMap.delete(context.from);
    await context.sendSmsResponse(
      context.from,
      'Got it, ending YouTube search.',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // MORE command - show next batch
  if (upper === 'MORE' || upper === 'NEXT') {
    const newOffset = state.offset + 3;

    if (newOffset >= state.videos.length) {
      await context.sendSmsResponse(
        context.from,
        "That's all! Reply YT [topic] for a new search.",
        context.twilioClient
      );
      stateMap.delete(context.from);
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    const message = formatMoreVideos(state.videos, newOffset);

    // Update offset
    state.offset = newOffset;
    state.timestamp = Date.now();
    stateMap.set(context.from, state);

    await context.sendSmsResponse(context.from, message, context.twilioClient);
    await context.updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // NEW [topic] command
  if (upper.startsWith('NEW ')) {
    const newTopic = trimmed.replace(/^new\s+/i, '').trim();
    stateMap.delete(context.from);
    return startNewSearch(context, stateMap, newTopic);
  }

  // Exit to other handlers for greetings or other commands
  const exitKeywords = ['hi', 'hello', 'hey', 'ai daily', 'crypto', 'help'];
  if (exitKeywords.some((kw) => lower.startsWith(kw))) {
    stateMap.delete(context.from);
    return false; // Let other handlers process
  }

  // Otherwise, treat as refinement - search again with refined query
  const refinedQuery = `${state.originalQuery} ${trimmed}`;
  stateMap.delete(context.from);
  return startNewSearch(context, stateMap, refinedQuery);
}

export const youtubeAgentHandler: CommandHandler = {
  name: 'youtube-agent',
  matches(context) {
    const map = getStateMap(context);

    // Match if user has active state
    if (map && map.has(context.from)) {
      return true;
    }

    // Match if starts with YT or YOUTUBE (handles "YT," "YOUTUBE!" etc.)
    return matchesPrefix(context.messageUpper, 'YT') || matchesPrefix(context.messageUpper, 'YOUTUBE');
  },
  async handle(context) {
    const stateMap = getStateMap(context);

    if (!stateMap) {
      await context.sendSmsResponse(
        context.from,
        'YouTube search is not available right now.',
        context.twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    const existingState = hasActiveState(stateMap, context.from);

    // If in active conversation, handle follow-up
    if (existingState) {
      return handleFollowUp(
        context,
        stateMap,
        existingState,
        context.message.trim()
      );
    }

    // New search - extract query after YT or YOUTUBE prefix
    if (matchesPrefix(context.messageUpper, 'YT')) {
      const query = extractAfterPrefix(context.message, context.messageUpper, 'YT');
      return startNewSearch(context, stateMap, query);
    } else if (matchesPrefix(context.messageUpper, 'YOUTUBE')) {
      const query = extractAfterPrefix(context.message, context.messageUpper, 'YOUTUBE');
      return startNewSearch(context, stateMap, query);
    }

    return false;
  },
};
