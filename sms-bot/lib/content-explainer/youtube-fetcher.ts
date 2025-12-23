/**
 * YouTube Transcript Fetcher
 * Fetches video transcripts using @danielxceron/youtube-transcript
 * (fork with InnerTube API fallback for better reliability)
 */

import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import type { FetchedContent } from './types.js';

// YouTube URL patterns
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Check if URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Fetch YouTube video transcript
 */
export async function fetchYouTubeContent(url: string): Promise<FetchedContent> {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    throw new Error(`Invalid YouTube URL: ${url}`);
  }

  try {
    // Fetch transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript available for this video');
    }

    // Combine transcript segments into full text and decode HTML entities
    const fullTranscript = transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, (match) => {
        const code = parseInt(match.slice(2, -1), 10);
        return String.fromCharCode(code);
      })
      .trim();

    // Calculate approximate duration from last segment
    const lastItem = transcriptItems[transcriptItems.length - 1];
    const durationSeconds = lastItem.offset + (lastItem.duration || 0);
    const durationMinutes = Math.round(durationSeconds / 60);

    return {
      contentType: 'youtube',
      externalId: videoId,
      title: `YouTube Video`, // Will be enriched by caller if needed
      author: 'Unknown',
      url: `https://youtube.com/watch?v=${videoId}`,
      rawContent: fullTranscript,
      metadata: {
        transcriptSegments: transcriptItems.length,
        durationMinutes,
        wordCount: fullTranscript.split(/\s+/).length,
      },
    };
  } catch (error) {
    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Could not get transcripts') ||
        errorMessage.includes('disabled') ||
        errorMessage.includes('No transcript')) {
      throw new Error(`No transcript available for this video. The creator may have disabled captions.`);
    }

    throw new Error(`Failed to fetch YouTube transcript: ${errorMessage}`);
  }
}
