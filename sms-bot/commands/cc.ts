/**
 * SMS Command Handler for CC (Claude Code)
 *
 * Deep codebase investigation and PR creation via Claude Agent SDK.
 * Security: Only +16508989508 can use this command.
 *
 * Commands:
 *   CC <question>    - Investigate codebase (30-180s)
 *   CC VOICE         - Get voice discussion URL
 *   CC PR <desc>     - Plan a PR (requires YES to execute)
 *   CC STOP          - End session
 */

import { runCodeInvestigation, executePR } from '../agents/code-agent/index.js';
import { storeCodeSession, storeCodeInvestigation } from '../agents/code-agent/storage.js';
import { sendNotificationEmail } from '../lib/email/sendgrid.js';
import { truncateToSmsLimit, countUCS2CodeUnits, MAX_SMS_CODE_UNITS } from '../lib/utils/sms-length.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, extractAfterPrefix } from './command-utils.js';
import crypto from 'crypto';

const CC_PREFIX = 'CC';
const STATE_TIMEOUT_MS = 3600000; // 1 hour
const CODEBASE_PATH = '/Users/bart/Documents/code/vibeceo';
const OWNER_PHONE = '+16508989508';
const OWNER_EMAIL = 'bart@kochi.to';
const VERIFICATION_EXPIRY_MS = 300000; // 5 minutes

// ============================================================================
// State Management
// ============================================================================

export interface CCAgentState {
  sessionId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  lastInvestigationId?: string;
  lastInvestigationSummary?: string;
  pendingPRPlan?: string;  // Awaiting YES to execute
  lastQueryTimestamp: number;
  // Verification state
  verified?: boolean;
  pendingVerification?: {
    pin: string;  // 4-digit PIN
    expiresAt: number;
    originalMessage: string;
  };
}

function getStateMap(context: CommandContext): Map<string, CCAgentState> | undefined {
  return context.commandHelpers?.['ccAgentStates'] as Map<string, CCAgentState> | undefined;
}

function getState(phoneNumber: string, context: CommandContext): CCAgentState | undefined {
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

function initializeState(phoneNumber: string, context: CommandContext, verified?: boolean): CCAgentState {
  console.log(`[CC] Initializing new session for ${phoneNumber}`);

  const state: CCAgentState = {
    sessionId: crypto.randomUUID(),
    conversationHistory: [],
    lastQueryTimestamp: Date.now(),
    verified: verified ?? (phoneNumber === OWNER_PHONE),
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
// Verification Helpers
// ============================================================================

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function handleVerificationRequest(
  context: CommandContext,
  originalMessage: string
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, normalizedFrom } = context;

  // Initialize state with pending verification
  let state = getState(normalizedFrom, context);
  if (!state) {
    state = initializeState(normalizedFrom, context);
  }

  const pin = generatePin();
  state.pendingVerification = {
    pin,
    expiresAt: Date.now() + VERIFICATION_EXPIRY_MS,
    originalMessage,
  };
  state.lastQueryTimestamp = Date.now();

  console.log(`[CC] Verification requested from ${normalizedFrom}, PIN: ${pin}`);

  // Send PIN via email (SMS gets blocked by spam filters)
  // Bury the PIN in the middle of a casual email
  await sendNotificationEmail(
    OWNER_EMAIL,
    'CC access request',
    `Hey, someone's trying to use the CC agent.\n\nFrom: ${normalizedFrom}\nMessage: "${originalMessage.substring(0, 100)}"\n\nTheir PIN is ${pin} if you want to let them in.\n\nExpires in 5 min.`
  );

  // Tell requester to enter the PIN
  await sendSmsResponse(
    from,
    'CC requires verification. Enter the 4-digit PIN from the owner.',
    twilioClient
  );

  await context.updateLastMessageDate(normalizedFrom);
  return true;
}

async function handlePinEntry(
  context: CommandContext,
  state: CCAgentState,
  enteredPin: string
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, normalizedFrom } = context;

  if (!state.pendingVerification) {
    await sendSmsResponse(from, 'No pending verification. Send CC <question> to start.', twilioClient);
    return true;
  }

  // Check expiry
  if (Date.now() > state.pendingVerification.expiresAt) {
    state.pendingVerification = undefined;
    await sendSmsResponse(from, 'PIN expired. Send CC <question> again.', twilioClient);
    return true;
  }

  // Check PIN
  if (enteredPin !== state.pendingVerification.pin) {
    await sendSmsResponse(from, 'Wrong PIN. Try again.', twilioClient);
    return true;
  }

  // Success - mark verified and process original message
  const originalMessage = state.pendingVerification.originalMessage;
  state.pendingVerification = undefined;
  state.verified = true;
  state.lastQueryTimestamp = Date.now();

  console.log(`[CC] Verified ${normalizedFrom}`);
  await sendSmsResponse(from, 'Verified!', twilioClient);

  // Process original command
  const query = extractAfterPrefix(originalMessage, originalMessage.toUpperCase(), CC_PREFIX);
  if (query) {
    return await handleInvestigation(context, state, query);
  }

  return true;
}

// ============================================================================
// Command Matching
// ============================================================================

function isOtherCommand(msg: string): boolean {
  const prefixes = [
    'KG', 'ARXIV', 'CRYPTO', 'YOUTUBE', 'AI DAILY', 'HELP', 'WTAF', 'MENU',
    'AIR', 'TOY', 'WEBTOY', 'ZAD',
  ];
  return prefixes.some((p) => msg.startsWith(p + ' ') || msg === p);
}

function matches(context: CommandContext): boolean {
  const msg = context.messageUpper.trim();

  // Direct CC command - anyone can try (verification happens in handler)
  if (matchesPrefix(msg, CC_PREFIX)) {
    return true;
  }

  const state = getState(context.normalizedFrom, context);

  // Debug logging
  if (state) {
    console.log(`[CC] matches() state found for ${context.normalizedFrom}: verified=${state.verified}, historyLen=${state.conversationHistory.length}`);
  } else {
    console.log(`[CC] matches() NO state for ${context.normalizedFrom}`);
  }

  // Check for pending PIN entry (4 digits)
  if (state?.pendingVerification && /^\d{4}$/.test(msg)) {
    return true;
  }

  // Check for pending PR approval (YES/NO response)
  if (state?.pendingPRPlan) {
    if (msg === 'YES' || msg === 'NO' || msg === 'Y' || msg === 'N') {
      return true;
    }
  }

  // Check for active verified conversation (implicit continuation)
  if (!state || !state.verified) return false;

  // Don't capture if it's another command prefix
  if (isOtherCommand(msg)) return false;

  console.log(`[CC] matches() returning true for continuation: "${msg.substring(0, 30)}"`);
  return true; // Continue CC conversation
}

// ============================================================================
// Command Handler
// ============================================================================

async function handle(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, sendChunkedSmsResponse, normalizedFrom } = context;
  const msg = context.message.trim();
  const msgUpper = context.messageUpper.trim();

  // Get or create state
  let state = getState(normalizedFrom, context);

  // Owner is always verified
  const isOwner = normalizedFrom === OWNER_PHONE;

  // Handle PIN entry (4 digits)
  if (state?.pendingVerification && /^\d{4}$/.test(msgUpper)) {
    return await handlePinEntry(context, state, msgUpper);
  }

  // Check if user needs verification (non-owner without verified session)
  if (!isOwner && (!state || !state.verified)) {
    return await handleVerificationRequest(context, msg);
  }

  // Handle YES/NO for pending PR
  if (state?.pendingPRPlan && (msgUpper === 'YES' || msgUpper === 'Y')) {
    return await handlePRExecution(context, state);
  }

  if (state?.pendingPRPlan && (msgUpper === 'NO' || msgUpper === 'N')) {
    state.pendingPRPlan = undefined;
    await sendSmsResponse(from, 'PR cancelled. Type CC <question> to continue.', twilioClient);
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Handle CC STOP
  if (msgUpper === 'CC STOP' || msgUpper === 'STOP') {
    clearState(normalizedFrom, context);
    await sendSmsResponse(
      from,
      'CC session ended. Type CC <question> to start new investigation.',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Handle CC VOICE
  if (msgUpper === 'CC VOICE' || msgUpper.startsWith('CC VOICE ')) {
    return await handleVoiceCommand(context, state);
  }

  // Handle CC PR
  if (msgUpper.startsWith('CC PR ')) {
    return await handlePRCommand(context, state);
  }

  // Initialize state if needed
  if (!state) {
    state = initializeState(normalizedFrom, context);
  }

  // Extract query (remove CC prefix if present)
  const query = extractAfterPrefix(msg, msgUpper, CC_PREFIX);

  if (!query) {
    // Just "CC" without a query
    await sendSmsResponse(
      from,
      'CC Agent - Deep codebase investigation\n\n' +
      'CC <question> - Investigate code\n' +
      'CC PR <desc> - Create a PR\n' +
      'CC VOICE - Voice discussion\n' +
      'CC STOP - End session',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Run investigation
  return await handleInvestigation(context, state, query);
}

// ============================================================================
// Subcommand Handlers
// ============================================================================

async function handleInvestigation(
  context: CommandContext,
  state: CCAgentState,
  query: string
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, sendChunkedSmsResponse, normalizedFrom } = context;

  console.log(`[CC] Investigation from ${normalizedFrom}: "${query.substring(0, 100)}"`);

  // Send "investigating" message
  await sendSmsResponse(from, 'Investigating codebase... (30-180 seconds)', twilioClient);

  const startTime = Date.now();

  try {
    const result = await runCodeInvestigation(
      query,
      CODEBASE_PATH,
      state.conversationHistory.map(h => ({ role: h.role, content: h.content })),
      'investigate'
    );

    const durationMs = Date.now() - startTime;

    // Store session and investigation
    await storeCodeSession(state.sessionId, normalizedFrom);
    const investigationId = await storeCodeInvestigation(
      state.sessionId,
      query,
      result.response,
      result.summary,
      result.filesExamined,
      result.toolCallsCount,
      durationMs
    );

    state.lastInvestigationId = investigationId || undefined;
    state.lastInvestigationSummary = result.summary;

    // Update conversation history
    state.conversationHistory.push(
      { role: 'user', content: query, timestamp: Date.now() },
      { role: 'assistant', content: result.response, timestamp: Date.now() }
    );

    // Trim history
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    state.lastQueryTimestamp = Date.now();

    // Build SMS response - MUST stay under 670 UCS-2 code units
    const stats = `${result.filesExamined.length} files, ${Math.round(durationMs / 1000)}s`;
    const needsLink = result.response.length > 500;
    const linkLine = needsLink && investigationId
      ? `\n📄 kochi.to/cc/${investigationId}`
      : '';
    const footer = `${linkLine}\n\n${stats}`;

    // Reserve space for emoji + footer, truncate summary to fit
    const footerUnits = countUCS2CodeUnits(`🔍 ${footer}`);
    const maxSummaryUnits = MAX_SMS_CODE_UNITS - footerUnits - 10; // 10 buffer

    // Get summary - prefer agent's summary, fallback to first sentence
    let summary = result.summary || '';
    if (!summary || summary.length > 400) {
      // Extract first sentence or truncate
      const firstSentence = result.response.match(/^[^.!?]+[.!?]/)?.[0];
      summary = firstSentence || result.response.substring(0, 200);
    }

    // Truncate summary if still too long
    const truncatedSummary = truncateToSmsLimit(`🔍 ${summary}`, footerUnits + 10);
    const smsResponse = `${truncatedSummary}${footer}`;

    // Final safety check
    const finalMessage = truncateToSmsLimit(smsResponse);
    await sendSmsResponse(from, finalMessage, twilioClient);

    console.log(`[CC] Investigation complete: ${result.toolCallsCount} tools, ${result.filesExamined.length} files`);

  } catch (error) {
    console.error('[CC] Investigation error:', error);
    await sendSmsResponse(
      from,
      `Investigation failed: ${String(error).substring(0, 100)}`,
      twilioClient
    );
  } finally {
    await context.updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handleVoiceCommand(
  context: CommandContext,
  state: CCAgentState | undefined
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, normalizedFrom } = context;

  if (!state || !state.lastInvestigationId) {
    await sendSmsResponse(
      from,
      'No active investigation. Run CC <question> first to investigate, then use CC VOICE.',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  // Generate voice URL with session token
  const voiceUrl = `https://kochi.to/code-voice?s=${state.sessionId}`;

  await sendSmsResponse(
    from,
    `Voice discussion ready:\n${voiceUrl}\n\nContext: ${state.lastInvestigationSummary || 'Investigation loaded'}`,
    twilioClient
  );

  await context.updateLastMessageDate(normalizedFrom);
  return true;
}

async function handlePRCommand(
  context: CommandContext,
  state: CCAgentState | undefined
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, sendChunkedSmsResponse, normalizedFrom, message } = context;

  // Initialize state if needed
  if (!state) {
    state = initializeState(normalizedFrom, context);
  }

  // Extract PR description
  const prDesc = message.replace(/^CC\s*PR\s*/i, '').trim();

  if (!prDesc) {
    await sendSmsResponse(
      from,
      'Usage: CC PR <description>\n\nExample:\nCC PR add logout button to header',
      twilioClient
    );
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  console.log(`[CC] PR request from ${normalizedFrom}: "${prDesc}"`);

  // Send planning message
  await sendSmsResponse(from, 'Planning PR... (30-180 seconds)', twilioClient);

  const startTime = Date.now();

  try {
    const result = await runCodeInvestigation(
      prDesc,
      CODEBASE_PATH,
      state.conversationHistory.map(h => ({ role: h.role, content: h.content })),
      'pr'
    );

    const durationMs = Date.now() - startTime;

    // Store the plan for approval
    state.pendingPRPlan = result.response;
    state.lastQueryTimestamp = Date.now();

    // Send plan with approval prompt
    const maxLen = 450;
    let planSummary = result.response;
    if (planSummary.length > maxLen) {
      planSummary = planSummary.substring(0, maxLen - 3) + '...';
    }

    await sendChunkedSmsResponse(
      from,
      planSummary + '\n\n---\nReply YES to create PR, NO to cancel',
      twilioClient,
      600
    );

    console.log(`[CC] PR plan ready, awaiting approval (${Math.round(durationMs / 1000)}s)`);

  } catch (error) {
    console.error('[CC] PR planning error:', error);
    await sendSmsResponse(
      from,
      `PR planning failed: ${String(error).substring(0, 100)}`,
      twilioClient
    );
  } finally {
    await context.updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handlePRExecution(
  context: CommandContext,
  state: CCAgentState
): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, normalizedFrom } = context;

  if (!state.pendingPRPlan) {
    await sendSmsResponse(from, 'No pending PR plan. Use CC PR <desc> first.', twilioClient);
    await context.updateLastMessageDate(normalizedFrom);
    return true;
  }

  console.log(`[CC] Executing approved PR plan for ${normalizedFrom}`);

  await sendSmsResponse(from, 'Creating PR... (1-3 minutes)', twilioClient);

  try {
    const result = await executePR(state.pendingPRPlan, CODEBASE_PATH);

    // Clear pending plan
    state.pendingPRPlan = undefined;
    state.lastQueryTimestamp = Date.now();

    if (result.prUrl) {
      await sendSmsResponse(
        from,
        `PR created!\n${result.prUrl}`,
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        `PR execution complete:\n${result.response.substring(0, 400)}`,
        twilioClient
      );
    }

    console.log(`[CC] PR created: ${result.prUrl || 'no URL'}`);

  } catch (error) {
    console.error('[CC] PR execution error:', error);
    state.pendingPRPlan = undefined;
    await sendSmsResponse(
      from,
      `PR creation failed: ${String(error).substring(0, 100)}`,
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

export const ccCommandHandler: CommandHandler = {
  name: 'cc',
  matches,
  handle,
};

export default ccCommandHandler;
