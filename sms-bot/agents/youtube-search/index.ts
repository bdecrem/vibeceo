/**
 * YouTube Search Agent - TypeScript Wrapper
 * Calls Python agent that uses claude-agent-sdk for autonomous YouTube search
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

export interface YouTubeVideo {
  title: string;
  channel: string;
  age: string;
  videoId: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  followup: string;
  queryUsed: string;
  error?: string;
}

const AGENT_SCRIPT = path.join(
  process.cwd(),
  'agents',
  'youtube-search',
  'agent.py'
);
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3.11';
const DEFAULT_TIMEOUT_MS = 90000; // 90 seconds (agents can be slow)

/**
 * Search YouTube using autonomous agent
 */
export async function searchYouTubeWithAgent(
  query: string,
  hours: number = 48
): Promise<YouTubeSearchResult> {
  return new Promise((resolve, reject) => {
    const args = [AGENT_SCRIPT, '--query', query, '--hours', hours.toString()];

    const subprocess = spawn(PYTHON_BIN, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    subprocess.stdout.setEncoding('utf-8');
    subprocess.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    subprocess.stderr.setEncoding('utf-8');
    subprocess.stderr.on('data', (chunk) => {
      stderr += chunk;
      // Log stderr in real-time for debugging
      console.error(`[YouTube Agent stderr]: ${chunk}`);
    });

    // Timeout handler
    const timeout = setTimeout(() => {
      subprocess.kill();
      const errorMsg = stderr
        ? `YouTube agent timed out after ${DEFAULT_TIMEOUT_MS}ms. Last error: ${stderr.substring(0, 200)}`
        : `YouTube agent timed out after ${DEFAULT_TIMEOUT_MS}ms`;
      reject(new Error(errorMsg));
    }, DEFAULT_TIMEOUT_MS);

    subprocess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[YouTube Agent] Process error:', error);
      reject(error);
    });

    subprocess.on('close', (exitCode) => {
      clearTimeout(timeout);

      // Log what we got for debugging
      if (stderr) {
        console.error(`[YouTube Agent] stderr: ${stderr}`);
      }

      if (exitCode !== 0 && exitCode !== 1) {
        reject(
          new Error(
            `YouTube agent exited with code ${exitCode}: ${stderr || stdout || 'no output'}`
          )
        );
        return;
      }

      try {
        // Parse JSON output from agent
        const result = JSON.parse(stdout.trim());

        resolve({
          videos: result.videos || [],
          followup: result.followup || '',
          queryUsed: result.query_used || query,
          error: result.error,
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to parse YouTube agent output: ${stdout.substring(0, 200)}`
          )
        );
      }
    });
  });
}

/**
 * Format videos for SMS (first 3 videos)
 */
export function formatVideosForSMS(
  videos: YouTubeVideo[],
  followup: string,
  offset: number = 0
): string {
  if (videos.length === 0) {
    return 'No fresh videos found. Try different keywords?';
  }

  const batch = videos.slice(offset, offset + 3);
  const remaining = videos.length - (offset + batch.length);

  let response = '📺 Fresh videos:\n\n';

  batch.forEach((video, idx) => {
    const num = offset + idx + 1;
    const titleTrunc = video.title.length > 45 ? video.title.substring(0, 42) + '...' : video.title;

    response += `${num}. [${video.age}] ${titleTrunc}\n`;
    response += `   📺 ${video.channel}\n\n`;
  });

  if (remaining > 0) {
    response += `Reply MORE for ${remaining} more video${remaining === 1 ? '' : 's'}\n\n`;
  }

  if (followup && offset === 0) {
    response += `🤔 ${followup}`;
  }

  return response.trim();
}

/**
 * Format "MORE" response with video links
 */
export function formatMoreVideos(videos: YouTubeVideo[], offset: number): string {
  const batch = videos.slice(offset, offset + 3);

  if (batch.length === 0) {
    return "That's all for now!";
  }

  let response = '';

  batch.forEach((video, idx) => {
    const num = offset + idx + 1;
    const titleTrunc = video.title.length > 40 ? video.title.substring(0, 37) + '...' : video.title;

    response += `${num}. [${video.age}] ${titleTrunc}\n`;
    response += `   📺 ${video.channel}\n`;
    response += `   🔗 youtu.be/${video.videoId}\n\n`;
  });

  const remaining = videos.length - (offset + batch.length);
  if (remaining > 0) {
    response += `Reply MORE for ${remaining} more`;
  }

  return response.trim();
}
