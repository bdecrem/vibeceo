/**
 * SMS Command Handler for KG (Knowledge Graph Query)
 *
 * Allows conversational queries about Neo4j arXiv research graph data
 * Uses Claude Agent SDK for autonomous exploration with 1-hour conversation memory
 */

import { runKGQuery, getCleanDataBoundary } from '../agents/kg-query/index.js';
import { getLatestStoredArxivGraphReport } from '../agents/arxiv-research-graph/index.js';
import { isSubscribedToAgent } from '../lib/agent-subscriptions.js';
import { getSubscriber } from '../lib/subscribers.js';
import { AIR_AGENT_SLUG, getLatestPersonalizedReport, type AIRPreferences } from '../agents/air-personalized/index.js';
import { supabase } from '../lib/supabase.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, extractAfterPrefix } from './command-utils.js';

const KG_PREFIX = 'KG';
const STATE_TIMEOUT_MS = 3600000; // 1 hour

// ============================================================================
// State Management
// ============================================================================

export interface KGAgentState {
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  todaysReportContext: string;
  cleanDataBoundary: {
    startDate: string;
    endDate: string;
    cleanPercentage: number;
  };
  lastQueryTimestamp: number;
}

function getStateMap(context: CommandContext): Map<string, KGAgentState> | undefined {
  return context.commandHelpers?.['kgAgentStates'] as Map<string, KGAgentState> | undefined;
}

function getState(phoneNumber: string, context: CommandContext): KGAgentState | undefined {
  const stateMap = getStateMap(context);
  if (!stateMap) return undefined;

  const state = stateMap.get(phoneNumber);
  if (!state) return undefined;

  // Check if expired
  const now = Date.now();
  if (now - state.lastQueryTimestamp > STATE_TIMEOUT_MS) {
    stateMap.delete(phoneNumber);
    return undefined;
  }

  return state;
}

async function initializeState(
  phoneNumber: string,
  context: CommandContext
): Promise<KGAgentState> {
  console.log(`[KG] Initializing new conversation state for ${phoneNumber}`);

  // Fetch today's report context
  let reportContext = 'No recent report available.';
  try {
    const report = await getLatestStoredArxivGraphReport();
    if (report) {
      reportContext = `Latest report: ${report.date}, ${report.summary}`;
    }
  } catch (error) {
    console.error('[KG] Failed to fetch latest report:', error);
  }

  // Check if user has AIR subscription and load personalized context
  try {
    const isAIRSubscriber = await isSubscribedToAgent(phoneNumber, AIR_AGENT_SLUG);

    if (isAIRSubscriber) {
      console.log(`[KG] Loading AIR context for ${phoneNumber}`);

      const subscriber = await getSubscriber(phoneNumber);
      if (subscriber) {
        // Load AIR preferences
        const { data: subscription } = await supabase
          .from('agent_subscriptions')
          .select('preferences')
          .eq('subscriber_id', subscriber.id)
          .eq('agent_slug', AIR_AGENT_SLUG)
          .eq('active', true)
          .single();

        if (subscription?.preferences) {
          const prefs = subscription.preferences as AIRPreferences;

          // Load latest personalized report
          const personalizedReport = await getLatestPersonalizedReport(subscriber.id);

          // Build enriched context
          let airContext = `\n\n---\nUSER'S AIR PERSONALIZATION:\n`;
          airContext += `Research Interest: "${prefs.natural_language_query}"\n`;

          if (personalizedReport) {
            airContext += `\nToday's Personalized Report (${personalizedReport.report_date}):\n`;
            airContext += `Papers: ${personalizedReport.paper_count}\n`;
            airContext += `Query: "${personalizedReport.query_used}"\n`;

            // Include first 500 chars of report as preview
            const preview = personalizedReport.markdown_content?.substring(0, 500) || '';
            if (preview) {
              airContext += `\nReport Preview:\n${preview}...\n`;
            }

            airContext += `\nNote: When user refers to "paper 1", "paper 2", etc., they mean papers from THIS personalized report.\n`;
          }

          airContext += `---\n`;

          // Prepend AIR context to report context
          reportContext = airContext + reportContext;

          console.log(`[KG] AIR context loaded: query="${prefs.natural_language_query}", report=${personalizedReport?.report_date || 'none'}`);
        }
      }
    }
  } catch (error) {
    console.error('[KG] Failed to load AIR context:', error);
    // Continue without AIR context
  }

  // Get clean data boundary
  let cleanDataBoundary = {
    startDate: 'Unknown',
    endDate: 'Unknown',
    cleanPercentage: 0,
  };
  try {
    cleanDataBoundary = await getCleanDataBoundary();
  } catch (error) {
    console.error('[KG] Failed to get clean data boundary:', error);
  }

  const state: KGAgentState = {
    conversationHistory: [],
    todaysReportContext: reportContext,
    cleanDataBoundary,
    lastQueryTimestamp: Date.now(),
  };

  const stateMap = getStateMap(context);
  if (stateMap) {
    stateMap.set(phoneNumber, state);
  }

  return state;
}

function clearState(phoneNumber: string, context: CommandContext): void {
  const stateMap = getStateMap(context);
  if (stateMap) {
    stateMap.delete(phoneNumber);
  }
}

// ============================================================================
// Command Matching
// ============================================================================

function isOtherCommand(msg: string): boolean {
  const prefixes = [
    'ARXIV-GRAPH',
    'ARXIV',
    'CRYPTO',
    'YOUTUBE',
    'AI DAILY',
    'HELP',
    'WTAF',
    'MENU',
  ];
  return prefixes.some((p) => msg.startsWith(p));
}

function matches(context: CommandContext): boolean {
  const msg = context.messageUpper.trim();

  // Direct KG command (handles "KG", "KG ", "KG,", "kg!", etc.)
  if (matchesPrefix(msg, KG_PREFIX)) {
    return true;
  }

  // Check for active conversation (implicit continuation)
  const state = getState(context.normalizedFrom, context);
  if (!state) return false;

  // Don't capture if it's another command prefix
  if (isOtherCommand(msg)) return false;

  return true; // Continue KG conversation
}

// ============================================================================
// Command Handler
// ============================================================================

async function handle(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, sendChunkedSmsResponse, normalizedFrom } = context;
  const msg = context.message.trim();
  const msgUpper = context.messageUpper.trim();

  // Handle STOP command
  if (msgUpper === 'STOP' || msgUpper === 'KG STOP') {
    clearState(normalizedFrom, context);
    await sendSmsResponse(
      from,
      '✅ KG conversation ended. Type KG <question> to start a new conversation.',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Get or create state
  let state = getState(normalizedFrom, context);
  if (!state) {
    state = await initializeState(normalizedFrom, context);
  }

  // Extract query (remove KG prefix if present, handling punctuation)
  const query = extractAfterPrefix(msg, msgUpper, KG_PREFIX);

  if (!query) {
    // Just "KG" (or "KG," "KG!" etc.) without a query
    await sendSmsResponse(
      from,
      'Ask me anything about the arXiv research graph!\n\nExamples:\n• Who are the top authors?\n• What papers about RAG?\n• Show trending topics\n\nType STOP to end conversation.',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  console.log(`[KG] Processing query from ${normalizedFrom}: "${query}"`);

  try {
    // Call agent
    const response = await runKGQuery(
      query,
      state.conversationHistory,
      state.todaysReportContext,
      state.cleanDataBoundary
    );

    // Update conversation history (keep last 10 exchanges = 20 messages)
    state.conversationHistory.push(
      { role: 'user', content: query, timestamp: Date.now() },
      { role: 'assistant', content: response, timestamp: Date.now() }
    );

    // Trim history if too long
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    state.lastQueryTimestamp = Date.now();

    // Send response (chunked if needed)
    await sendChunkedSmsResponse(from, response, twilioClient, 600);

    console.log(`[KG] Response sent to ${normalizedFrom}`);
  } catch (error) {
    console.error('[KG] Agent error:', error);
    await sendSmsResponse(
      from,
      '❌ Sorry, I encountered an error processing your query. Please try again.',
      twilioClient
    );
  } finally {
    await context.updateLastMessageDate(normalizedFrom);
  }

  return true;
}

// ============================================================================
// Export
// ============================================================================

export const kgCommandHandler: CommandHandler = {
  name: 'kg',
  matches,
  handle,
};

export default kgCommandHandler;
