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

export interface ActiveThread {
  threadId: string;
  handler: string;
  startedAt: string;
  lastActivity: string;
  fullContext: Record<string, any>;
}

export interface UserContext {
  phoneNumber: string;
  subscriberId: string;
  personalization: UserPersonalization;
  subscriptions: UserSubscription[];
  recentMessages: RecentMessage[];
  hasRecentActivity: boolean;
  activeThread?: ActiveThread;
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

  // Extract messages from context records
  const recentMessages: RecentMessage[] = [];

  // Fetch recent report content from subscriptions
  for (const sub of subscriptions) {
    // Check if report was sent within last 12 hours
    if (sub.last_sent_at) {
      const lastSentTime = new Date(sub.last_sent_at).getTime();
      const now = Date.now();
      if (now - lastSentTime < CONTEXT_WINDOW_MS) {
        try {
          let reportContent: string | null = null;

          // Fetch report based on agent type
          if (sub.agent_slug === 'air') {
            // Fetch from ai_research_reports_personalized table
            const { data: airReport } = await supabase
              .from('ai_research_reports_personalized')
              .select('markdown_content, report_date')
              .eq('subscriber_id', subscriber.id)
              .order('report_date', { ascending: false })
              .limit(1)
              .single();

            if (airReport?.markdown_content) {
              reportContent = airReport.markdown_content;
            }
          } else {
            // Fetch from Supabase Storage for other agents
            const { getLatestReportMetadata } = await import('../agents/report-storage.js');
            const metadata = await getLatestReportMetadata(sub.agent_slug);

            if (metadata?.reportPath) {
              const { data: file } = await supabase.storage
                .from('agent-reports')
                .download(metadata.reportPath);

              if (file) {
                reportContent = await file.text();
              }
            }
          }

          // Add to recent messages if we got content
          if (reportContent) {
            recentMessages.push({
              role: 'system',
              content: reportContent,
              timestamp: sub.last_sent_at,
              type: `${sub.agent_slug}_report_sent`,
            });
          }
        } catch (error) {
          console.error(`Failed to fetch report for ${sub.agent_slug}:`, error);
          // Continue without this report
        }
      }
    }
  }

  const { data: contextData } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('subscriber_id', subscriber.id)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  // Also load user/assistant messages from conversation_context
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

  // Load active thread (last 5 minutes)
  const { data: activeThreadData } = await supabase
    .from('conversation_context')
    .select('thread_id, active_handler, thread_started_at, created_at, metadata')
    .eq('subscriber_id', subscriber.id)
    .eq('context_type', 'active_thread')
    .gte('expires_at', new Date().toISOString())
    .gte('created_at', new Date(Date.now() - 300000).toISOString()) // 5 minutes
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let activeThread: ActiveThread | undefined;
  if (activeThreadData) {
    activeThread = {
      threadId: activeThreadData.thread_id,
      handler: activeThreadData.active_handler,
      startedAt: activeThreadData.thread_started_at,
      lastActivity: activeThreadData.created_at,
      fullContext: activeThreadData.metadata || {},
    };
  }

  return {
    phoneNumber,
    subscriberId: subscriber.id,
    personalization,
    subscriptions,
    recentMessages,
    hasRecentActivity,
    activeThread,
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

/**
 * Store active thread state for multi-turn conversations
 */
export async function storeThreadState(
  subscriberId: string,
  params: {
    handler: string;
    topic: string;
    context?: Record<string, any>;
  }
): Promise<string> {
  const { data, error } = await supabase.rpc('store_thread_state', {
    p_subscriber_id: subscriberId,
    p_handler: params.handler,
    p_topic: params.topic,
    p_context: params.context || {},
  });

  if (error) {
    console.error('[Thread] Failed to store thread state:', error);
    throw error;
  }

  return data as string;
}

/**
 * Update thread context (extends expiration)
 */
export async function updateThreadContext(
  subscriberId: string,
  context: Record<string, any>
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_thread_context', {
    p_subscriber_id: subscriberId,
    p_context: context,
  });

  if (error) {
    console.error('[Thread] Failed to update thread context:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Clear active thread state
 */
export async function clearThreadState(subscriberId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('clear_thread_state', {
    p_subscriber_id: subscriberId,
  });

  if (error) {
    console.error('[Thread] Failed to clear thread state:', error);
    return false;
  }

  return data as boolean;
}
