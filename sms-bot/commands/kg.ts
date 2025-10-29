/**
 * SMS Command Handler for KG (Knowledge Graph Query)
 *
 * Allows conversational queries about Neo4j arXiv research graph data
 * Uses Claude Agent SDK for autonomous exploration with 1-hour conversation memory
 */

import { runKGQuery, getCleanDataBoundary } from '../agents/kg-query/index.js';
import { getLatestStoredArxivGraphReport } from '../agents/arxiv-research-graph/index.js';
import type { CommandContext, CommandHandler } from './types.js';

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

  // Direct KG command
  if (msg.startsWith(KG_PREFIX + ' ') || msg === KG_PREFIX) {
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

  // Extract query (remove KG prefix if present)
  let query = msg;
  if (msg.toUpperCase().startsWith(KG_PREFIX + ' ')) {
    query = msg.substring(KG_PREFIX.length + 1).trim();
  } else if (msg.toUpperCase() === KG_PREFIX) {
    // Just "KG" without a query
    await sendSmsResponse(
      from,
      'Ask me anything about the arXiv research graph!\n\nExamples:\n• Who are the top authors?\n• What papers about RAG?\n• Show trending topics\n\nType STOP to end conversation.',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  if (!query) {
    await sendSmsResponse(
      from,
      'Please ask a question. Example: KG who are interesting authors today?',
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
