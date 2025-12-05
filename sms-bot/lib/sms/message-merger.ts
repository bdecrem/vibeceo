/**
 * Message Merger
 * 
 * Handles merging outbound messages into active conversations
 * Maintains natural conversation flow
 */

import { updateThreadContext } from '../context-loader.js';
import type { OutboundMessageMetadata, RoutingDecisionResult } from './orchestrated-send.js';
import type { ActiveThread } from '../context-loader.js';

/**
 * Store a merged message in thread context
 */
export async function storeMergedMessage(
  subscriberId: string,
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  routingDecision: RoutingDecisionResult,
  activeThread: ActiveThread
): Promise<void> {
  // Get existing merged messages or initialize
  const existingMerged = activeThread.fullContext?.mergedMessages || [];
  
  const mergedMessage = {
    message,
    messageType: metadata?.messageType,
    source: metadata?.source,
    timestamp: new Date().toISOString(),
    routingDecision,
  };

  const updatedMerged = [...existingMerged, mergedMessage];

  // Store in thread context
  await updateThreadContext(subscriberId, {
    mergedMessages: updatedMerged,
    lastMergedAt: new Date().toISOString(),
  });

  console.log(`[Message Merger] Stored merged message in thread context (${updatedMerged.length} total)`);
}

/**
 * Get natural transition prefix based on message type and conversation context
 * Returns empty string for most cases to allow natural flow without explicit prefixes
 */
function getMergePrefix(
  message: string,
  messageType: string | undefined,
  activeThread: ActiveThread
): string {
  // Only add subtle prefixes for very specific cases where context is helpful
  // Most messages should flow naturally without explicit "Also:" style prefixes
  
  // For recruiting messages in recruiting threads, use subtle transition
  if (messageType === 'recruiting' && 
      (activeThread.handler === 'recruit-exploration' || activeThread.handler === 'recruit-source-approval')) {
    return ''; // No prefix - let it flow naturally
  }

  // For all other cases, no prefix - messages should flow naturally
  return '';
}

/**
 * Format merged message with natural conversation flow
 */
export function formatMergedMessage(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  activeThread: ActiveThread
): string {
  const prefix = getMergePrefix(message, metadata?.messageType, activeThread);
  
  // Remove any existing prefixes from the message to avoid duplication
  const cleanMessage = message.trim();
  
  // Combine prefix with message
  return prefix + cleanMessage;
}

/**
 * Check if there are pending merged messages in thread context
 */
export function getPendingMergedMessages(activeThread: ActiveThread): any[] {
  return activeThread.fullContext?.mergedMessages || [];
}

/**
 * Clear merged messages from thread context (after sending)
 */
export async function clearMergedMessages(subscriberId: string): Promise<void> {
  await updateThreadContext(subscriberId, {
    mergedMessages: [],
    lastMergedAt: null,
  });
}

