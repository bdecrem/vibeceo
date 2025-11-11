/**
 * Context Loader - Assembles user context for conversational intelligence
 *
 * Loads:
 * 1. Permanent personalization (name, interests, etc.)
 * 2. Active subscriptions + preferences
 * 3. Recent messages (12hr window)
 */

import { supabase } from './supabase.js';
import { getSubscriber } from './subscribers.js';

const CONTEXT_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface UserPersonalization {
  name?: string;
  interests?: string[];
  timezone?: string;
  location?: string;
  notes?: string;
}

export interface RecentMessage {
  role: 'user' | 'system';
  content: string;
  timestamp: string;
  type: string; // 'air_report_sent', 'user_message', 'air_preview', etc.
}

export interface UserSubscription {
  agent_slug: string;
  preferences: Record<string, any>;
  active: boolean;
  last_sent_at: string | null;
}

export interface UserContext {
  phoneNumber: string;
  subscriberId: string;
  personalization: UserPersonalization;
  subscriptions: UserSubscription[];
  recentMessages: RecentMessage[];
  hasRecentActivity: boolean;
}

/**
 * Load complete user context for conversational intelligence
 */
export async function loadUserContext(phoneNumber: string): Promise<UserContext | null> {
  const subscriber = await getSubscriber(phoneNumber);
  if (!subscriber) {
    console.log(`[Context] No subscriber found for ${phoneNumber}`);
    return null;
  }

  // Load personalization
  const personalization = (subscriber.personalization || {}) as UserPersonalization;

  // Load subscriptions
  const { data: subscriptionData } = await supabase
    .from('agent_subscriptions')
    .select('agent_slug, preferences, active, last_sent_at')
    .eq('subscriber_id', subscriber.id)
    .eq('active', true);

  const subscriptions = (subscriptionData || []) as UserSubscription[];

  // Load recent messages (12hr window)
  const windowStart = new Date(Date.now() - CONTEXT_WINDOW_MS).toISOString();

  const { data: contextData } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('subscriber_id', subscriber.id)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  // Extract messages from context records
  const recentMessages: RecentMessage[] = [];

  if (contextData) {
    for (const record of contextData) {
      const history = record.conversation_history || [];
      for (const msg of history) {
        if (msg.timestamp && new Date(msg.timestamp) > new Date(windowStart)) {
          recentMessages.push(msg);
        }
      }

      // Also add the context type as a message if it represents a sent item
      if (record.context_type && record.metadata?.content) {
        recentMessages.push({
          role: 'system',
          content: record.metadata.content,
          timestamp: record.created_at,
          type: record.context_type,
        });
      }
    }
  }

  // Sort by timestamp
  recentMessages.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const hasRecentActivity = recentMessages.length > 0;

  return {
    phoneNumber,
    subscriberId: subscriber.id,
    personalization,
    subscriptions,
    recentMessages,
    hasRecentActivity,
  };
}

/**
 * Store a message in conversation context
 */
export async function storeMessage(
  subscriberId: string,
  message: {
    role: 'user' | 'system';
    content: string;
    type: string;
  }
): Promise<void> {
  const contextType = `message_history`;
  const expiresAt = new Date(Date.now() + CONTEXT_WINDOW_MS).toISOString();

  // Try to append to existing message history
  const { data: existing } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('context_type', contextType)
    .single();

  const messageRecord = {
    ...message,
    timestamp: new Date().toISOString(),
  };

  if (existing) {
    const history = existing.conversation_history || [];
    history.push(messageRecord);

    await supabase
      .from('conversation_context')
      .update({
        conversation_history: history,
        expires_at: expiresAt,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('conversation_context')
      .insert({
        subscriber_id: subscriberId,
        context_type: contextType,
        conversation_history: [messageRecord],
        expires_at: expiresAt,
      });
  }
}

/**
 * Store a report/system action in context
 */
export async function storeSystemAction(
  subscriberId: string,
  action: {
    type: string; // 'air_report_sent', 'crypto_daily_sent', etc.
    content: string; // Full report content
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + CONTEXT_WINDOW_MS).toISOString();

  await supabase
    .from('conversation_context')
    .insert({
      subscriber_id: subscriberId,
      context_type: action.type,
      metadata: {
        content: action.content,
        ...action.metadata,
      },
      expires_at: expiresAt,
    });
}

/**
 * Clear expired contexts (should be called periodically)
 */
export async function cleanupExpiredContexts(): Promise<void> {
  const { error } = await supabase.rpc('cleanup_expired_contexts');

  if (error) {
    console.error('[Context] Failed to cleanup expired contexts:', error);
  }
}
