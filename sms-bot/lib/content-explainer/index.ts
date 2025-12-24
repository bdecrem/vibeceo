/**
 * Content Explainer Module
 *
 * Provides a unified interface for fetching and explaining content from
 * Twitter, YouTube, and other sources. Used by amberx command and
 * potentially AI Twitter Daily.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentType,
  ExplanationLevel,
  ExplainerInput,
  ExplainerResult,
  FetchedContent,
  UserPreferences,
} from './types.js';
import { fetchYouTubeContent, isYouTubeUrl } from './youtube-fetcher.js';
import { fetchTwitterContent, isTwitterUrl } from './twitter-fetcher.js';
import { supabase } from '../supabase.js';

// Re-export types and utilities
export type { ContentType, ExplanationLevel, ExplainerInput, ExplainerResult, FetchedContent, UserPreferences };
export { isYouTubeUrl, isTwitterUrl, fetchYouTubeContent, fetchTwitterContent };

// System prompts for different explanation levels
const LEVEL_PROMPTS: Record<ExplanationLevel, string> = {
  beginner: `You are explaining this to someone who is curious but new to the topic.
Use simple analogies and everyday language. Avoid jargon - if you must use a technical term,
explain it immediately. Focus on the "why this matters" angle. Keep it conversational and friendly.`,

  intermediate: `You are explaining this to someone familiar with the basics of tech and AI.
Include relevant technical details but keep it accessible. Balance depth with clarity.
You can use common terms like "model", "API", "training" without explanation, but explain
specialized concepts. Be informative but not overwhelming.`,

  expert: `You are explaining this to a practitioner or researcher in the field.
Include technical details, nuances, and implications. Don't oversimplify - they want the
real picture. You can reference papers, techniques, and industry context they'd understand.
Be concise and substantive.`,
};

/**
 * Detect content type from URL
 */
export function detectContentType(url: string): ContentType | null {
  if (isYouTubeUrl(url)) return 'youtube';
  if (isTwitterUrl(url)) return 'twitter';
  return null;
}

/**
 * Fetch content from URL based on type
 */
export async function fetchContent(url: string): Promise<FetchedContent> {
  const contentType = detectContentType(url);

  if (!contentType) {
    throw new Error(
      `Unsupported URL type. I can explain content from:\n` +
      `• YouTube videos (youtube.com, youtu.be)\n` +
      `• Twitter/X posts (twitter.com, x.com)`
    );
  }

  switch (contentType) {
    case 'youtube':
      return fetchYouTubeContent(url);
    case 'twitter':
      return fetchTwitterContent(url);
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

/**
 * Load user preferences from database
 */
export async function getUserPreferences(subscriberId: string): Promise<UserPreferences> {
  try {
    const { data } = await supabase
      .from('sms_subscribers')
      .select('preferences')
      .eq('id', subscriberId)
      .single();

    return (data?.preferences as UserPreferences) || {};
  } catch {
    return {};
  }
}

/**
 * Get effective explanation level for a user
 * Falls back to 'intermediate' if not set
 */
export async function getUserLevel(
  subscriberId: string,
  _topic?: string
): Promise<ExplanationLevel> {
  const prefs = await getUserPreferences(subscriberId);

  // For now, use the general level
  // Future: Use topic-specific expertise from prefs.expertise
  return prefs.explanation_level || 'intermediate';
}

/**
 * Generate a short 1-sentence summary for SMS
 */
async function generateShortSummary(
  content: FetchedContent
): Promise<string> {
  const anthropic = new Anthropic();

  const contentDescription = content.contentType === 'youtube'
    ? `YouTube video`
    : content.contentType === 'twitter'
    ? `tweet by @${content.author}`
    : `content`;

  // Truncate content for summary generation
  const truncatedContent = content.rawContent.length > 5000
    ? content.rawContent.slice(0, 5000) + '...'
    : content.rawContent;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: 'You are a concise summarizer. Output ONLY a single sentence, no quotes, no preamble.',
    messages: [{
      role: 'user',
      content: `Summarize this ${contentDescription} in ONE sentence (max 80 characters):\n\n${truncatedContent}`,
    }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  return (textContent?.type === 'text' ? textContent.text : '').trim();
}

/**
 * Generate a full detailed explanation for the report
 */
async function generateFullExplanation(
  content: FetchedContent,
  level: ExplanationLevel
): Promise<{ explanation: string; keyPoints: string[] }> {
  const anthropic = new Anthropic();
  const levelPrompt = LEVEL_PROMPTS[level];

  // Truncate very long content to avoid token limits
  const maxContentLength = 15000;
  const truncatedContent = content.rawContent.length > maxContentLength
    ? content.rawContent.slice(0, maxContentLength) + '\n\n[Content truncated for length...]'
    : content.rawContent;

  const contentDescription = content.contentType === 'youtube'
    ? `YouTube video transcript`
    : content.contentType === 'twitter'
    ? `Tweet by @${content.author}`
    : `Content`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: levelPrompt,
    messages: [{
      role: 'user',
      content: `Please provide a comprehensive explanation of this ${contentDescription}:

---
${truncatedContent}
---

Structure your response as:

## Summary
A clear 2-3 paragraph overview of the main ideas.

## Key Takeaways
- Bullet point list of the most important points

## Deeper Dive
More detailed analysis including:
- Important nuances or context
- Why this matters
- Related concepts to explore

Keep the explanation substantive but accessible. Total length should be 500-800 words.`,
    }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const explanation = textContent?.type === 'text' ? textContent.text : '';

  // Extract key points from the Key Takeaways section
  const keyPoints: string[] = [];
  const lines = explanation.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*]\s/.test(trimmed)) {
      keyPoints.push(trimmed.replace(/^[-•*\s]+/, '').trim());
    }
  }

  return { explanation, keyPoints };
}

/**
 * Generate follow-up answer for interactive mode
 */
async function generateFollowUpAnswer(
  content: FetchedContent,
  level: ExplanationLevel,
  question: string
): Promise<string> {
  const anthropic = new Anthropic();
  const levelPrompt = LEVEL_PROMPTS[level];

  const truncatedContent = content.rawContent.length > 15000
    ? content.rawContent.slice(0, 15000) + '...'
    : content.rawContent;

  const contentDescription = content.contentType === 'youtube'
    ? `YouTube video transcript`
    : content.contentType === 'twitter'
    ? `Tweet by @${content.author}`
    : `Content`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: levelPrompt,
    messages: [{
      role: 'user',
      content: `The user is asking about this ${contentDescription}:

---
${truncatedContent}
---

Their question: "${question}"

Answer their specific question based on the content above. Be thorough but concise. If they're asking to go deeper on a topic, provide more technical detail.`,
    }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  return (textContent?.type === 'text' ? textContent.text : '').trim();
}

/**
 * Main entry point: Explain content from a URL
 */
export async function explainContent(input: ExplainerInput): Promise<ExplainerResult> {
  // 1. Fetch the content
  const content = await fetchContent(input.url);

  // 2. Determine explanation level
  const level = input.userLevel || await getUserLevel(input.subscriberId);

  // 3. Handle follow-up questions differently
  if (input.followUpQuestion) {
    const answer = await generateFollowUpAnswer(content, level, input.followUpQuestion);
    return {
      contentType: content.contentType,
      externalId: content.externalId,
      title: content.title,
      author: content.author,
      shortSummary: answer.slice(0, 100) + (answer.length > 100 ? '...' : ''),
      fullExplanation: answer,
      explanation: answer,
      keyPoints: [],
      rawContent: content.rawContent,
    };
  }

  // 4. Generate both short summary and full explanation in parallel
  const [shortSummary, { explanation: fullExplanation, keyPoints }] = await Promise.all([
    generateShortSummary(content),
    generateFullExplanation(content, level),
  ]);

  return {
    contentType: content.contentType,
    externalId: content.externalId,
    title: content.title,
    author: content.author,
    shortSummary,
    fullExplanation,
    explanation: fullExplanation, // backwards compat
    keyPoints,
    rawContent: content.rawContent,
  };
}
