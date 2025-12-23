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
 * Generate explanation for fetched content
 */
async function generateExplanation(
  content: FetchedContent,
  level: ExplanationLevel,
  followUpQuestion?: string
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

  let userPrompt: string;

  if (followUpQuestion) {
    // Follow-up question about the same content
    userPrompt = `The user previously asked about this ${contentDescription}:

---
${truncatedContent}
---

Their follow-up question is: "${followUpQuestion}"

Answer their specific question based on the content above. Be concise but thorough.`;
  } else {
    // Initial explanation
    userPrompt = `Please explain this ${contentDescription}:

---
${truncatedContent}
---

Provide:
1. A clear explanation of what this is about (2-3 paragraphs max)
2. Key takeaways (as a simple list)

Keep your total response under 400 words so it fits in an SMS.`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: levelPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const explanation = textContent?.type === 'text' ? textContent.text : '';

  // Extract key points (look for numbered or bulleted lists)
  const keyPoints: string[] = [];
  const lines = explanation.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      keyPoints.push(trimmed.replace(/^[-•*\d.)\s]+/, '').trim());
    }
  }

  return { explanation, keyPoints };
}

/**
 * Main entry point: Explain content from a URL
 */
export async function explainContent(input: ExplainerInput): Promise<ExplainerResult> {
  // 1. Fetch the content
  const content = await fetchContent(input.url);

  // 2. Determine explanation level
  const level = input.userLevel || await getUserLevel(input.subscriberId);

  // 3. Generate explanation
  const { explanation, keyPoints } = await generateExplanation(
    content,
    level,
    input.followUpQuestion
  );

  return {
    contentType: content.contentType,
    externalId: content.externalId,
    title: content.title,
    author: content.author,
    explanation,
    keyPoints,
    rawContent: content.rawContent,
  };
}
