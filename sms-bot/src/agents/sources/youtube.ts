/**
 * YouTube source fetcher
 * Fetches videos from YouTube Data API v3
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface YouTubeConfig {
  query?: string; // Search query
  channelId?: string; // Channel ID to fetch videos from
  maxItems?: number;
}

interface YouTubeVideo {
  id: {
    videoId?: string;
  } | string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export async function fetchYouTube(config: YouTubeConfig): Promise<NormalizedItem[]> {
  const {
    query,
    channelId,
    maxItems = 10,
  } = config;

  console.log(`📺 Fetching YouTube videos...`);

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ YOUTUBE_API_KEY not set, using mock data');
      return getMockYouTubeData(maxItems);
    }

    let searchUrl: string;

    if (channelId) {
      // Fetch videos from specific channel
      searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxItems}&order=date&type=video&key=${apiKey}`;
    } else if (query) {
      // Search for videos
      searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxItems}&order=relevance&type=video&key=${apiKey}`;
    } else {
      throw new Error('Either query or channelId is required');
    }

    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    const videos: YouTubeVideo[] = data.items || [];

    // Get video IDs for fetching statistics
    const videoIds = videos
      .map(video => typeof video.id === 'string' ? video.id : video.id.videoId)
      .filter(Boolean)
      .join(',');

    // Fetch statistics for the videos
    let videoStats: Map<string, any> = new Map();
    if (videoIds) {
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
      const statsResponse = await fetch(statsUrl);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        for (const item of statsData.items || []) {
          videoStats.set(item.id, item.statistics);
        }
      }
    }

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = videos.map(video => {
      const videoId = typeof video.id === 'string' ? video.id : video.id.videoId;
      const stats = videoStats.get(videoId || '');
      const viewCount = stats ? parseInt(stats.viewCount || '0', 10) : 0;
      const likeCount = stats ? parseInt(stats.likeCount || '0', 10) : 0;

      return {
        id: `youtube-${videoId}`,
        title: video.snippet.title,
        summary: `${video.snippet.description.substring(0, 200)}${video.snippet.description.length > 200 ? '...' : ''} | Views: ${viewCount.toLocaleString()} | Likes: ${likeCount.toLocaleString()}`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: video.snippet.publishedAt,
        author: video.snippet.channelTitle,
        score: viewCount,
        raw: video,
      };
    });

    console.log(`✅ Fetched ${normalized.length} YouTube videos`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching YouTube:', error.message);
    console.log('   Falling back to mock data...');
    return getMockYouTubeData(maxItems);
  }
}

function getMockYouTubeData(maxItems: number): NormalizedItem[] {
  const mockVideos = [
    {
      id: 'youtube-mock-1',
      title: 'Building AI Agents in 2025: Complete Tutorial',
      summary: 'Learn how to build production-ready AI agents using the latest frameworks and best practices. | Views: 125,000 | Likes: 8,500',
      url: 'https://www.youtube.com',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: 'AI Developer Channel',
      score: 125000,
    },
    {
      id: 'youtube-mock-2',
      title: 'Claude 3.5 Sonnet vs GPT-4: Head-to-Head Comparison',
      summary: 'Comprehensive comparison of the latest LLMs with real-world coding tests and benchmarks. | Views: 89,000 | Likes: 5,200',
      url: 'https://www.youtube.com',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author: 'Tech Review Weekly',
      score: 89000,
    },
    {
      id: 'youtube-mock-3',
      title: 'The Future of AI Assistants',
      summary: 'Industry experts discuss where AI assistants are headed in the next 5 years. | Views: 56,000 | Likes: 3,800',
      url: 'https://www.youtube.com',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      author: 'Future Tech Podcast',
      score: 56000,
    },
  ];

  return mockVideos.slice(0, maxItems);
}
