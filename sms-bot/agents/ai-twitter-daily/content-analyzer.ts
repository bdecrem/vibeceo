/**
 * AI Twitter Daily - Content Analyzer
 *
 * Uses Claude to analyze tweets, group them by topic, and extract key insights.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { FetchedTweet } from './twitter-fetcher.js';

export interface TopicGroup {
  topic: string;
  description: string;
  tweets: FetchedTweet[];
  keyInsights: string[];
  significance: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  topicGroups: TopicGroup[];
  summary: string;
  trendingTopics: string[];
  date: string;
}

/**
 * Analyze tweets and group by topic
 */
export async function analyzeTweets(tweets: FetchedTweet[]): Promise<AnalysisResult> {
  const anthropic = new Anthropic();

  // Format tweets for analysis
  const tweetTexts = tweets.map((t, i) => {
    const date = t.createdAt ? new Date(t.createdAt).toLocaleString() : 'unknown';
    return `[${i}] @${t.sourceHandle} (${t.sourceName}) - ${date}\n${t.text}\n`;
  }).join('\n---\n');

  const systemPrompt = `You are an AI research analyst specializing in machine learning and AI news.
Your job is to analyze tweets from AI thought leaders and identify the key topics and discussions.

Focus on:
- New research papers or findings
- Model releases and announcements
- Industry trends and debates
- Technical insights and tutorials
- Notable opinions from researchers

Ignore:
- Personal updates unrelated to AI
- Retweets without commentary
- Promotional content without substance`;

  const userPrompt = `Analyze these ${tweets.length} tweets from AI researchers and thought leaders.

Group them by topic and extract key insights.

Tweets:
${tweetTexts}

Respond with a JSON object (no markdown, just raw JSON):
{
  "topicGroups": [
    {
      "topic": "short topic name",
      "description": "2-3 sentence description of what's being discussed",
      "tweetIndices": [0, 2, 5],
      "keyInsights": ["insight 1", "insight 2"],
      "significance": "high" | "medium" | "low"
    }
  ],
  "summary": "2-3 paragraph summary of today's AI Twitter discourse",
  "trendingTopics": ["topic1", "topic2", "topic3"]
}

Rules:
- Group related tweets together (even from different authors)
- Prioritize high-impact topics (research, releases, major debates)
- Each topic should have 1-5 key insights
- tweetIndices refers to the [i] numbers in the input
- Aim for 3-7 topic groups
- Be substantive, not superficial`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const responseText = textBlock?.type === 'text' ? textBlock.text : '';

  // Parse JSON response
  let parsed: {
    topicGroups: Array<{
      topic: string;
      description: string;
      tweetIndices: number[];
      keyInsights: string[];
      significance: 'high' | 'medium' | 'low';
    }>;
    summary: string;
    trendingTopics: string[];
  };

  try {
    // Handle potential markdown wrapping
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.error('[AI Twitter Daily] Failed to parse analysis:', error);
    console.error('[AI Twitter Daily] Raw response:', responseText.substring(0, 500));
    throw new Error('Failed to parse tweet analysis');
  }

  // Map tweet indices back to actual tweets
  const topicGroups: TopicGroup[] = parsed.topicGroups.map((group) => ({
    topic: group.topic,
    description: group.description,
    tweets: group.tweetIndices.map((i) => tweets[i]).filter(Boolean),
    keyInsights: group.keyInsights,
    significance: group.significance,
  }));

  // Sort by significance
  const significanceOrder = { high: 0, medium: 1, low: 2 };
  topicGroups.sort((a, b) => significanceOrder[a.significance] - significanceOrder[b.significance]);

  const today = new Date().toISOString().split('T')[0];

  return {
    topicGroups,
    summary: parsed.summary,
    trendingTopics: parsed.trendingTopics,
    date: today,
  };
}

/**
 * Generate markdown report from analysis
 */
export function generateMarkdownReport(analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`# AI Twitter Daily - ${analysis.date}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(analysis.summary);
  lines.push('');

  lines.push('## Trending Topics');
  lines.push('');
  for (const topic of analysis.trendingTopics) {
    lines.push(`- ${topic}`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');

  for (const group of analysis.topicGroups) {
    const badge = group.significance === 'high' ? '🔥' : group.significance === 'medium' ? '📌' : '📝';
    lines.push(`## ${badge} ${group.topic}`);
    lines.push('');
    lines.push(group.description);
    lines.push('');

    if (group.keyInsights.length > 0) {
      lines.push('**Key Insights:**');
      for (const insight of group.keyInsights) {
        lines.push(`- ${insight}`);
      }
      lines.push('');
    }

    if (group.tweets.length > 0) {
      lines.push('**Notable Tweets:**');
      lines.push('');
      for (const tweet of group.tweets.slice(0, 3)) {
        const tweetUrl = tweet.id && tweet.authorUsername
          ? `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`
          : '';
        lines.push(`> @${tweet.sourceHandle}: ${tweet.text.substring(0, 280)}${tweet.text.length > 280 ? '...' : ''}`);
        if (tweetUrl) {
          lines.push(`> [View tweet](${tweetUrl})`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate SMS-friendly summary
 */
export function generateSmsSummary(analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`AI Twitter Daily - ${analysis.date}`);
  lines.push('');

  // Top 3 trending topics
  lines.push('Trending:');
  for (const topic of analysis.trendingTopics.slice(0, 3)) {
    lines.push(`• ${topic}`);
  }
  lines.push('');

  // High significance topics only
  const highTopics = analysis.topicGroups.filter((g) => g.significance === 'high');
  if (highTopics.length > 0) {
    lines.push('Hot topics:');
    for (const group of highTopics.slice(0, 2)) {
      lines.push(`• ${group.topic}`);
      if (group.keyInsights[0]) {
        lines.push(`  ${group.keyInsights[0]}`);
      }
    }
  }

  return lines.join('\n');
}
