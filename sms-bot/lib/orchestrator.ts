/**
 * Orchestrator - Intelligent message routing with context awareness
 *
 * Routes messages to appropriate handlers based on:
 * - Keywords (direct routing)
 * - Conversation context
 * - User profile and subscriptions
 */

import Anthropic from '@anthropic-ai/sdk';
import type { UserContext } from './context-loader.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type RouteDestination =
  | 'keyword' // Already handled by keyword routing
  | 'kg-query' // Research questions → KG agent
  | 'air' // AIR subscription/confirmation → AIR handler
  | 'discovery' // Finding/searching for content → Agentic with web search
  | 'general'; // Everything else → General Kochi agent

export interface RoutingDecision {
  destination: RouteDestination;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  isFollowUp: boolean;
}

/**
 * Route a message using AI-powered context analysis
 */
export async function routeMessage(
  userMessage: string,
  context: UserContext
): Promise<RoutingDecision> {
  console.log(`[Orchestrator] Routing message for ${context.phoneNumber}`);

  // Build context summary for Claude
  const contextSummary = buildContextSummary(context);

  const systemPrompt = `You are an intelligent message router for Kochi.to, a personal research assistant.

Your job: Analyze the user's message and context, then decide where to route it.

${context.activeThread ? `⚠️ ACTIVE THREAD DETECTED:
- Current handler: ${context.activeThread.handler}
- If this message is a FOLLOW-UP to the ongoing conversation, set isFollowUp=true and route to the SAME handler
- If this is a NEW TOPIC, set isFollowUp=false and route to the appropriate new handler

` : ''}ROUTING OPTIONS:

1. "kg-query" - Route to research agent (has Neo4j database with arXiv papers)
   Use when: Questions about research papers, authors, AI research, academic topics
   Examples: "show me papers about X", "who are top authors in Y", "what's new in Z research"

2. "air" - Route to AIR subscription handler
   Use when: User is responding to AIR subscription flow (confirmation, choices)
   Examples: "YES", "1", "2", after AIR preview was sent

3. "discovery" - Route to agentic agent with web search
   Use when: User wants to FIND or SEARCH for current content (articles, podcasts, news, etc.)
   Examples: "find me articles about X", "search for podcasts on Y", "what are good reads about Z", "when was that article posted"
   Note: This can search the web for actual current content with real links

4. "general" - Route to general Kochi assistant (NO web search)
   Use when: Simple conversations, explanations, follow-ups that don't need live data
   Examples: "hi", "thanks", "tell me more", "explain X", sharing personal info
   Note: Cannot search web or provide current content - will hallucinate if asked to find things

CONTEXT:
${contextSummary}

USER MESSAGE: "${userMessage}"

Analyze and respond with JSON:
{
  "destination": "kg-query" | "air" | "discovery" | "general",
  "reasoning": "brief explanation",
  "confidence": "high" | "medium" | "low",
  "isFollowUp": true/false
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const decision = JSON.parse(jsonMatch[0]) as RoutingDecision;

    console.log(`[Orchestrator] Routed to: ${decision.destination} (${decision.confidence})`);
    console.log(`[Orchestrator] Reasoning: ${decision.reasoning}`);

    return decision;
  } catch (error) {
    console.error('[Orchestrator] Routing failed:', error);

    // Fallback: route to general
    return {
      destination: 'general',
      reasoning: 'Routing error, defaulting to general agent',
      confidence: 'low',
      isFollowUp: false,
    };
  }
}

/**
 * Build a concise context summary for the routing prompt
 */
function buildContextSummary(context: UserContext): string {
  const parts: string[] = [];

  // Active conversation thread
  if (context.activeThread) {
    parts.push(`\n🧵 ACTIVE CONVERSATION THREAD:`);
    parts.push(`Handler: ${context.activeThread.handler}`);
    parts.push(`Started: ${getTimeAgo(new Date(context.activeThread.startedAt))}`);
    if (context.activeThread.fullContext?.topic) {
      parts.push(`Topic: ${context.activeThread.fullContext.topic}`);
    }
    // Include summary of previous results if available
    if (context.activeThread.fullContext?.lastResults) {
      const resultPreview = JSON.stringify(context.activeThread.fullContext.lastResults).substring(0, 300);
      parts.push(`Previous results: ${resultPreview}...`);
    }
    parts.push(''); // Empty line for separation
  }

  // Personalization
  if (context.personalization.name) {
    parts.push(`User name: ${context.personalization.name}`);
  }
  if (context.personalization.interests && context.personalization.interests.length > 0) {
    parts.push(`Interests: ${context.personalization.interests.join(', ')}`);
  }

  // Subscriptions
  if (context.subscriptions.length > 0) {
    const subList = context.subscriptions
      .map((sub) => {
        if (sub.agent_slug === 'air' && sub.preferences?.natural_language_query) {
          return `AIR (researching: "${sub.preferences.natural_language_query}")`;
        }
        return sub.agent_slug;
      })
      .join(', ');
    parts.push(`Active subscriptions: ${subList}`);
  }

  // Recent messages (last 3)
  if (context.recentMessages.length > 0) {
    parts.push('\nRecent activity:');
    const recent = context.recentMessages.slice(-3);
    for (const msg of recent) {
      const timeAgo = getTimeAgo(new Date(msg.timestamp));
      const preview = msg.content.substring(0, 100);
      parts.push(`  - ${timeAgo}: [${msg.type}] ${preview}...`);
    }
  } else {
    parts.push('\nNo recent activity (>12 hours)');
  }

  return parts.join('\n');
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
