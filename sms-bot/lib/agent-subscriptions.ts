import { supabase } from './supabase.js';
import { getSubscriber } from './subscribers.js';
import type { SMSSubscriber } from './supabase.js';

interface AgentSubscriptionRow {
  id: string;
  subscriber_id: string;
  agent_slug: string;
  active: boolean;
  subscribed_at: string;
  last_sent_at: string | null;
}

export interface AgentSubscriber extends SMSSubscriber {
  last_sent_at: string | null;
  preferences?: Record<string, any>; // Agent-specific preferences (from agent_subscriptions.preferences)
}

type SubscribeResult = 'subscribed' | 'reactivated' | 'already' | 'missing_subscriber' | 'error';
type UnsubscribeResult = 'unsubscribed' | 'not_subscribed' | 'missing_subscriber' | 'error';

async function fetchSubscription(
  subscriberId: string,
  agentSlug: string
): Promise<{ row: AgentSubscriptionRow | null; error?: unknown }> {
  const { data, error } = await supabase
    .from('agent_subscriptions')
    .select('id, subscriber_id, agent_slug, active, subscribed_at, last_sent_at')
    .eq('subscriber_id', subscriberId)
    .eq('agent_slug', agentSlug)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return { row: null };
    }
    console.error('Error fetching agent subscription:', error);
    return { row: null, error };
  }

  return { row: data as AgentSubscriptionRow | null };
}

export async function isSubscribedToAgent(
  phoneNumber: string,
  agentSlug: string
): Promise<boolean> {
  const subscriber = await getSubscriber(phoneNumber);
  if (!subscriber?.id) {
    return false;
  }

  const { row } = await fetchSubscription(subscriber.id, agentSlug);
  return Boolean(row?.active);
}

export async function subscribeToAgent(
  phoneNumber: string,
  agentSlug: string
): Promise<SubscribeResult> {
  const subscriber = await getSubscriber(phoneNumber);
  if (!subscriber?.id) {
    return 'missing_subscriber';
  }

  const { row, error } = await fetchSubscription(subscriber.id, agentSlug);
  if (error) {
    return 'error';
  }

  if (!row) {
    const { error: insertError } = await supabase
      .from('agent_subscriptions')
      .insert({
        subscriber_id: subscriber.id,
        agent_slug: agentSlug,
        active: true,
      });

    if (insertError) {
      console.error('Error inserting agent subscription:', insertError);
      return 'error';
    }

    return 'subscribed';
  }

  if (row.active) {
    return 'already';
  }

  const { error: updateError } = await supabase
    .from('agent_subscriptions')
    .update({
      active: true,
      subscribed_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (updateError) {
    console.error('Error reactivating agent subscription:', updateError);
    return 'error';
  }

  return 'reactivated';
}

export async function unsubscribeFromAgent(
  phoneNumber: string,
  agentSlug: string
): Promise<UnsubscribeResult> {
  const subscriber = await getSubscriber(phoneNumber);
  if (!subscriber?.id) {
    return 'missing_subscriber';
  }

  const { row, error } = await fetchSubscription(subscriber.id, agentSlug);
  if (error) {
    return 'error';
  }

  if (!row || !row.active) {
    return 'not_subscribed';
  }

  const { error: updateError } = await supabase
    .from('agent_subscriptions')
    .update({ active: false })
    .eq('id', row.id);

  if (updateError) {
    console.error('Error deactivating agent subscription:', updateError);
    return 'error';
  }

  return 'unsubscribed';
}

export async function markAgentReportSent(
  phoneNumber: string,
  agentSlug: string,
  date: Date = new Date()
): Promise<void> {
  const subscriber = await getSubscriber(phoneNumber);
  if (!subscriber?.id) {
    return;
  }

  const { error } = await supabase
    .from('agent_subscriptions')
    .update({ last_sent_at: date.toISOString() })
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', agentSlug);

  if (error) {
    console.error('Error updating agent last_sent_at:', error);
  }
}

export async function getAgentSubscribers(
  agentSlug: string
): Promise<AgentSubscriber[]> {
  const { data, error} = await supabase
    .from('agent_subscriptions')
    .select('subscriber_id, last_sent_at, preferences')
    .eq('agent_slug', agentSlug)
    .eq('active', true);

  if (error) {
    console.error('Error fetching agent subscription rows:', error);
    return [];
  }

  const rows = (data || []) as Array<{ subscriber_id: string; last_sent_at: string | null; preferences?: Record<string, any> }>;
  const ids = rows.map((row) => row.subscriber_id);

  if (ids.length === 0) {
    return [];
  }

  const { data: subscribers, error: subscribersError } = await supabase
    .from('sms_subscribers')
    .select('*')
    .in('id', ids)
    .eq('consent_given', true)
    .eq('unsubscribed', false);

  if (subscribersError) {
    console.error('Error fetching subscribers for agent:', subscribersError);
    return [];
  }

  const subscriberMap = new Map<string, SMSSubscriber>();
  for (const subscriber of subscribers as SMSSubscriber[] | null | undefined) {
    if (subscriber?.id) {
      subscriberMap.set(subscriber.id, subscriber);
    }
  }

  const merged: AgentSubscriber[] = [];
  for (const row of rows) {
    const subscriber = subscriberMap.get(row.subscriber_id);
    if (!subscriber) {
      continue;
    }

    merged.push({
      ...subscriber,
      last_sent_at: row.last_sent_at ?? null,
      preferences: row.preferences,
    });
  }

  return merged;
}
