/**
 * YouTube Search Agent for B52s SMS Bot
 *
 * Provides smart YouTube video discovery via SMS.
 * Usage: Text "YT [topic]" to search recent YouTube videos
 *
 * Flow:
 * 1. User texts "YT bitcoin"
 * 2. Agent asks follow-up question to refine search
 * 3. User responds with preference
 * 4. Agent returns fresh YouTube videos
 */

import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

const youtube = google.youtube('v3');

interface YouTubeVideo {
  title: string;
  channel: string;
  videoId: string;
  publishedAt: string;
  timeAgo: string;
}

/**
 * Generate a smart follow-up question using Claude
 */
export async function getFollowupQuestion(topic: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `User wants to search YouTube for: "${topic}"

Generate ONE follow-up question to help them refine what TYPE of videos they want.
The question should offer 3-4 options for them to choose from.

Examples:
- User: "commodity trading" -> "Looking for technical analysis, market news, educational content, or live trading?"
- User: "Python" -> "Tutorials for beginners, advanced topics, specific libraries, or project ideas?"
- User: "bitcoin" -> "Price analysis, news updates, technical explanations, or mining content?"

Just return the question offering options. Nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text.trim() : '';
}

/**
 * Generate optimized YouTube search query using Claude
 */
export async function generateSearchQuery(
  originalTopic: string,
  userRefinement: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `User wants to search YouTube for: "${originalTopic}"
They refined their request with: "${userRefinement}"

Generate the BEST YouTube search query to find what they want. The query should be:
- Short and focused (2-5 keywords)
- Optimized for YouTube's search algorithm
- Capture the topic AND content type they want

Examples:
- Topic: "Claude news from last day" + Refinement: "expert commentary" -> "Claude AI expert analysis"
- Topic: "bitcoin" + Refinement: "price analysis" -> "bitcoin price analysis"
- Topic: "Python" + Refinement: "tutorials for beginners" -> "Python beginner tutorial"

Return ONLY the search query. No explanations.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text.trim() : '';
}

/**
 * Search for recent YouTube videos
 */
export async function searchRecentVideos(
  query: string,
  hoursAgo: number = 24
): Promise<YouTubeVideo[]> {
  const timeAfter = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const response = await youtube.search.list({
    key: process.env.YOUTUBE_API_KEY,
    q: query,
    part: ['snippet'],
    type: ['video'],
    publishedAfter: timeAfter,
    maxResults: 10,
    order: 'date',
  });

  if (!response.data.items || response.data.items.length === 0) {
    return [];
  }

  return response.data.items.map((item) => {
    const snippet = item.snippet!;
    const publishedAt = new Date(snippet.publishedAt!);
    const now = new Date();
    const diffMs = now.getTime() - publishedAt.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const timeAgo = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;

    return {
      title: snippet.title!,
      channel: snippet.channelTitle!,
      videoId: item.id!.videoId!,
      publishedAt: snippet.publishedAt!,
      timeAgo,
    };
  });
}

/**
 * Parse time range from user input
 */
export function parseTimeFromInput(userInput: string): number {
  const lower = userInput.toLowerCase();

  if (lower.includes('last hour') || lower.includes('past hour')) return 1;
  if (lower.includes('2 hour')) return 2;
  if (lower.includes('3 hour')) return 3;
  if (lower.includes('6 hour')) return 6;
  if (lower.includes('12 hour')) return 12;
  if (lower.includes('today')) return 24;
  if (lower.includes('2 days')) return 48;
  if (lower.includes('this week')) return 168;

  return 24; // default
}

/**
 * Format videos for SMS response
 */
export function formatVideosForSMS(videos: YouTubeVideo[], query: string, hours: number): string {
  if (videos.length === 0) {
    return `No videos found for "${query}" in the last ${hours} hours. Try expanding the time range or different keywords.`;
  }

  let message = `📺 Fresh videos (last ${hours}h):\n\n`;

  // Show first 5 videos to keep SMS short
  const displayVideos = videos.slice(0, 5);

  displayVideos.forEach((video) => {
    message += `[${video.timeAgo}] ${video.title}\n`;
    message += `📺 ${video.channel}\n`;
    message += `🔗 youtube.com/watch?v=${video.videoId}\n\n`;
  });

  if (videos.length > 5) {
    message += `...and ${videos.length - 5} more results\n`;
  }

  return message.trim();
}

/**
 * Clean query by removing time phrases and filler words
 */
export function cleanQuery(query: string): string {
  let cleaned = query;

  // Remove time phrases (must be before general cleanup)
  cleaned = cleaned.replace(/from the last \d+\s*(hour|hr|hrs|day|days?)/gi, '');
  cleaned = cleaned.replace(/in the last \d+\s*(hour|hr|hrs|day|days?)/gi, '');
  cleaned = cleaned.replace(/last \d+\s*(hour|hr|hrs|day|days?)/gi, '');
  cleaned = cleaned.replace(/past \d+\s*(hour|hr|hrs|day|days?)/gi, '');
  cleaned = cleaned.replace(/\d+\s*(hour|hr|hrs|day|days?) ago/gi, '');
  cleaned = cleaned.replace(/\b(today|yesterday|this week)\b/gi, '');

  // Remove filler words and common phrases
  const fillerWords = [
    'the best',
    'the',
    'a',
    'an',
    'one',
    'some',
    'any',
    'about',
    'video',
    'videos',
    'awesome',
    'great',
    'good',
    'best',
    'find me',
    'show me',
    'get me',
    'search for',
    'or so',
    'from',
  ];

  fillerWords.forEach((word) => {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  });

  // Remove standalone numbers (from numbered responses like "4")
  cleaned = cleaned.replace(/\b\d+\b/g, ' ');

  // Clean up extra spaces and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If query mentions "Claude" alone, make it "Claude AI" for better results
  if (/\bClaude\b/i.test(cleaned) && !/\bAI\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bClaude\b/gi, 'Claude AI');
  }

  return cleaned;
}