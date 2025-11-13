/**
 * YouTube Collector
 *
 * Fetches candidates from YouTube channels discovered by the source discovery agent.
 * Uses YouTube Data API v3 to get channel info, popular videos, and creators.
 */

import type { DiscoveredSource } from '../source-discovery-agent.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export interface YouTubeCandidate {
  name: string; // Channel name
  channelId: string;
  channelUrl: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  recentVideos?: string[];
  rawData: any;
}

/**
 * Collect candidates from discovered YouTube sources
 */
export async function collectFromYouTube(
  sources: DiscoveredSource[],
  maxCandidates: number = 20
): Promise<YouTubeCandidate[]> {
  if (sources.length === 0) {
    console.log('[YouTube Collector] No sources provided');
    return [];
  }

  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube Collector] YOUTUBE_API_KEY not set, skipping YouTube collection');
    return [];
  }

  console.log(`[YouTube Collector] Collecting from ${sources.length} sources, max ${maxCandidates} candidates`);

  const candidates: YouTubeCandidate[] = [];
  const seenChannelIds = new Set<string>();

  // Process sources in order of score (highest first)
  const sortedSources = [...sources].sort((a, b) => b.score - a.score);

  for (const source of sortedSources) {
    if (candidates.length >= maxCandidates) {
      break;
    }

    try {
      let channelId = source.channelId;

      // If no channelId but has URL, try to extract it
      if (!channelId && source.url) {
        channelId = extractChannelId(source.url);
      }

      if (!channelId) {
        console.warn(`[YouTube Collector] Source ${source.name} has no channel ID or URL`);
        continue;
      }

      const channel = await fetchYouTubeChannel(channelId);

      if (channel && !seenChannelIds.has(channel.channelId)) {
        seenChannelIds.add(channel.channelId);
        candidates.push(channel);
      }

      console.log(`[YouTube Collector] Processed ${source.name} (total: ${candidates.length})`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[YouTube Collector] Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`[YouTube Collector] Collected ${candidates.length} total candidates`);
  return candidates;
}

/**
 * Extract channel ID from YouTube URL
 */
function extractChannelId(url: string): string | null {
  // Format: https://www.youtube.com/channel/UCxxxxx
  const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
  if (channelMatch) return channelMatch[1];

  // Format: https://www.youtube.com/@username (need to resolve via API)
  const handleMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
  if (handleMatch) {
    // For now, return null - would need API call to resolve handle to channel ID
    // Could be added later if needed
    return null;
  }

  return null;
}

/**
 * Fetch YouTube channel information
 */
async function fetchYouTubeChannel(channelId: string): Promise<YouTubeCandidate | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      console.error(`[YouTube Collector] Failed to fetch channel ${channelId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];

    // Fetch recent videos
    const recentVideos = await fetchRecentVideos(channelId);

    return {
      name: channel.snippet.title,
      channelId: channel.id,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      description: channel.snippet.description,
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      recentVideos,
      rawData: channel,
    };

  } catch (error) {
    console.error(`[YouTube Collector] Failed to fetch channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Fetch recent video titles from a channel
 */
async function fetchRecentVideos(channelId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => item.snippet.title);

  } catch (error) {
    console.error(`[YouTube Collector] Failed to fetch videos for ${channelId}:`, error);
    return [];
  }
}
