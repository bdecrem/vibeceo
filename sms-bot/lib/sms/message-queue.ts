/**
 * Message Queue Management
 * 
 * Handles queuing, processing, and sending of outbound messages
 * that are delayed due to active conversations
 */

import { supabase } from '../supabase.js';
import type { OutboundMessageMetadata, RoutingDecisionResult } from './orchestrated-send.js';
import type { TwilioClient } from './webhooks.js';

export interface QueuedMessage {
  id: string;
  subscriber_id: string;
  phone_number: string;
  message: string;
  message_type?: string;
  priority: number;
  source?: string;
  metadata: Record<string, any>;
  status: 'queued' | 'processing' | 'sent' | 'expired' | 'failed' | 'merged';
  routing_decision?: RoutingDecisionResult;
  created_at: string;
  expires_at?: string;
  sent_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
}

/**
 * Add a message to the queue
 */
export async function queueMessage(
  subscriberId: string,
  phoneNumber: string,
  message: string,
  twilioClient: TwilioClient,
  metadata?: OutboundMessageMetadata,
  routingDecision?: RoutingDecisionResult
): Promise<string> {
  const expiresAt = metadata?.expiresAt?.toISOString() || null;
  const priority = metadata?.priority || 5;

  const { data, error } = await supabase
    .from('message_queue')
    .insert({
      subscriber_id: subscriberId,
      phone_number: phoneNumber,
      message,
      message_type: metadata?.messageType,
      priority,
      source: metadata?.source,
      metadata: metadata?.metadata || {},
      routing_decision: routingDecision || null,
      expires_at: expiresAt,
      twilio_client_config: {
        // Store minimal config needed for retry (if needed)
        from_number: process.env.TWILIO_PHONE_NUMBER,
        whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER,
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Message Queue] Failed to queue message:', error);
    throw error;
  }

  console.log(`[Message Queue] ✅ Queued message ${data.id} for ${phoneNumber} (priority: ${priority})`);
  return data.id;
}

/**
 * Get next queued message for processing
 */
export async function getNextQueuedMessage(subscriberId?: string): Promise<QueuedMessage | null> {
  const { data, error } = await supabase.rpc('get_next_queued_message', {
    p_subscriber_id: subscriberId || null,
  });

  if (error) {
    console.error('[Message Queue] Failed to get next queued message:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as QueuedMessage;
}

/**
 * Mark message as processing (prevents concurrent processing)
 */
export async function markMessageProcessing(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_message_processing', {
    p_id: messageId,
  });

  if (error) {
    console.error('[Message Queue] Failed to mark message as processing:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Mark message as sent
 */
export async function markMessageSent(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_message_sent', {
    p_id: messageId,
  });

  if (error) {
    console.error('[Message Queue] Failed to mark message as sent:', error);
    throw error;
  }
}

/**
 * Mark message as failed
 */
export async function markMessageFailed(messageId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('mark_message_failed', {
    p_id: messageId,
    p_reason: reason,
  });

  if (error) {
    console.error('[Message Queue] Failed to mark message as failed:', error);
    throw error;
  }
}

/**
 * Reset message for retry
 */
export async function resetMessageForRetry(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('reset_message_for_retry', {
    p_id: messageId,
  });

  if (error) {
    console.error('[Message Queue] Failed to reset message for retry:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Get queued message count for a subscriber
 */
export async function getQueuedMessageCount(subscriberId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_queued_message_count', {
    p_subscriber_id: subscriberId,
  });

  if (error) {
    console.error('[Message Queue] Failed to get queued message count:', error);
    return 0;
  }

  return (data as number) || 0;
}

/**
 * Process a single queued message
 */
export async function processQueuedMessage(
  queuedMessage: QueuedMessage,
  twilioClient: TwilioClient
): Promise<boolean> {
  try {
    console.log(`[Message Queue] Processing message ${queuedMessage.id} for ${queuedMessage.phone_number}`);

    // Check if message has expired
    if (queuedMessage.expires_at) {
      const expiresAt = new Date(queuedMessage.expires_at);
      if (expiresAt < new Date()) {
        console.log(`[Message Queue] Message ${queuedMessage.id} has expired`);
        await supabase
          .from('message_queue')
          .update({ status: 'expired', sent_at: new Date().toISOString() })
          .eq('id', queuedMessage.id);
        return false;
      }
    }

    // Send the message using internal send function
    const { sendSmsResponseInternal } = await import('./orchestrated-send.js');
    await sendSmsResponseInternal(queuedMessage.phone_number, queuedMessage.message, twilioClient);

    // Mark as sent
    await markMessageSent(queuedMessage.id);

    console.log(`[Message Queue] ✅ Successfully sent queued message ${queuedMessage.id}`);
    return true;
  } catch (error) {
    console.error(`[Message Queue] ❌ Failed to process message ${queuedMessage.id}:`, error);

    // Try to retry if retries remaining
    const canRetry = await resetMessageForRetry(queuedMessage.id);
    if (!canRetry) {
      // Max retries exceeded, mark as failed
      await markMessageFailed(
        queuedMessage.id,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } else {
      console.log(`[Message Queue] Message ${queuedMessage.id} reset for retry`);
    }

    return false;
  }
}

/**
 * Process queued messages for a specific subscriber (when their conversation ends)
 */
export async function processQueuedMessagesForSubscriber(
  subscriberId: string,
  twilioClient: TwilioClient,
  maxMessages: number = 10
): Promise<number> {
  let processed = 0;
  let attempts = 0;
  const maxAttempts = maxMessages * 2; // Prevent infinite loops

  while (processed < maxMessages && attempts < maxAttempts) {
    attempts++;

    // Get next queued message
    const queuedMessage = await getNextQueuedMessage(subscriberId);
    if (!queuedMessage) {
      break; // No more queued messages
    }

    // Try to mark as processing (prevents concurrent processing)
    const isProcessing = await markMessageProcessing(queuedMessage.id);
    if (!isProcessing) {
      // Message is already being processed or status changed
      continue;
    }

    // Process the message
    const success = await processQueuedMessage(queuedMessage, twilioClient);
    if (success) {
      processed++;
    }

    // Small delay between messages to avoid rate limiting
    if (processed < maxMessages) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (processed > 0) {
    console.log(`[Message Queue] Processed ${processed} queued message(s) for subscriber ${subscriberId}`);
  }

  return processed;
}

/**
 * Process all queued messages (called by scheduler)
 */
export async function processAllQueuedMessages(
  twilioClient: TwilioClient,
  maxMessages: number = 50
): Promise<number> {
  // First, expire old messages
  try {
    await supabase.rpc('expire_old_messages');
  } catch (error) {
    console.error('[Message Queue] Failed to expire old messages:', error);
  }

  let processed = 0;
  let attempts = 0;
  const maxAttempts = maxMessages * 2; // Prevent infinite loops

  while (processed < maxMessages && attempts < maxAttempts) {
    attempts++;

    // Get next queued message (any subscriber)
    const queuedMessage = await getNextQueuedMessage();
    if (!queuedMessage) {
      break; // No more queued messages
    }

    // Check if subscriber has active conversation
    const { loadUserContext } = await import('../context-loader.js');
    const userContext = await loadUserContext(queuedMessage.phone_number);

    if (userContext?.activeThread) {
      // Still has active conversation, skip for now
      console.log(
        `[Message Queue] Skipping message ${queuedMessage.id} - subscriber still has active conversation`
      );
      continue;
    }

    // Try to mark as processing
    const isProcessing = await markMessageProcessing(queuedMessage.id);
    if (!isProcessing) {
      continue;
    }

    // Process the message
    const success = await processQueuedMessage(queuedMessage, twilioClient);
    if (success) {
      processed++;
    }

    // Small delay between messages
    if (processed < maxMessages) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (processed > 0) {
    console.log(`[Message Queue] Processed ${processed} queued message(s) from queue`);
  }

  return processed;
}

/**
 * Get all queued messages for a subscriber (for debugging/admin)
 */
export async function getQueuedMessagesForSubscriber(
  subscriberId: string,
  limit: number = 50
): Promise<QueuedMessage[]> {
  const { data, error } = await supabase
    .from('message_queue')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Message Queue] Failed to get queued messages:', error);
    return [];
  }

  return (data || []) as QueuedMessage[];
}

