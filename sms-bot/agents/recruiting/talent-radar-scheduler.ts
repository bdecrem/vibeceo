/**
 * Talent Radar Scheduler
 *
 * Handles daily candidate collection and 30-day source refresh.
 * Registered via registerDailyJob() in lib/scheduler/index.ts
 */

import type { Twilio } from 'twilio';
import { supabase } from '../../lib/supabase.js';
import { getSubscriber } from '../../lib/subscribers.js';
import { sendSmsResponse } from '../../lib/sms/handlers.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { findDailyCandidates, analyzeProjectScores } from './index.js';
import { shouldRefreshSources, discoverSources, mergeSources } from './source-discovery-agent.js';

/**
 * Register Talent Radar daily job (runs at 9 AM PT)
 */
export function registerTalentRadarDailyJob(twilioClient: Twilio): void {
  console.log('[Talent Radar] Registering daily job for 9 AM PT');

  registerDailyJob({
    name: 'recruiting-talent-radar',
    hour: 9, // 9 AM PT
    minute: 0,
    run: async () => {
      console.log('[Talent Radar] Running daily job...');

      try {
        // Get all active recruiting subscriptions
        const { data: subscriptions, error } = await supabase
          .from('agent_subscriptions')
          .select('*')
          .eq('agent_type', 'recruiting')
          .eq('is_active', true);

        if (error) {
          console.error('[Talent Radar] Failed to fetch subscriptions:', error);
          return;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log('[Talent Radar] No active subscriptions');
          return;
        }

        console.log(`[Talent Radar] Processing ${subscriptions.length} active subscriptions`);

        // Process each subscription
        for (const subscription of subscriptions) {
          try {
            await processSubscriptionDaily(subscription, twilioClient);
          } catch (error) {
            console.error(`[Talent Radar] Failed to process subscription ${subscription.id}:`, error);
          }

          // Small delay between subscriptions to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('[Talent Radar] Daily job complete');

      } catch (error) {
        console.error('[Talent Radar] Daily job failed:', error);
      }
    },
  });
}

/**
 * Process a single subscription for daily candidate collection
 */
async function processSubscriptionDaily(subscription: any, twilioClient: Twilio): Promise<void> {
  console.log(`[Talent Radar] Processing subscription ${subscription.id}: "${subscription.query}"`);

  try {
    const subscriber = await getSubscriber(subscription.subscriber_id);
    if (!subscriber) {
      console.error(`[Talent Radar] Subscriber ${subscription.subscriber_id} not found`);
      return;
    }

    // Check if we need to refresh sources (every 30 days)
    if (shouldRefreshSources(subscription.preferences)) {
      console.log(`[Talent Radar] 30-day refresh for project ${subscription.id}`);
      await refreshSources(subscription);
    }

    // Analyze past scores to learn preferences
    const learnedProfile = await analyzeProjectScores(
      subscription.subscriber_id,
      subscription.id
    );

    // Find new daily candidates
    const newCandidates = await findDailyCandidates(
      subscription.subscriber_id,
      subscription.id,
      subscription.query,
      learnedProfile
    );

    if (newCandidates.length === 0) {
      console.log(`[Talent Radar] No new candidates for project ${subscription.id}`);
      return;
    }

    // Store candidates
    const reportDate = new Date().toISOString().split('T')[0];
    const dbCandidates = newCandidates.map((c, i) => ({
      subscriber_id: subscription.subscriber_id,
      project_id: subscription.id,
      name: c.name,
      title: c.title || null,
      company: c.company || null,
      company_size: c.company_size || 'unknown',
      location: c.location || null,
      linkedin_url: c.linkedin_url || null,
      twitter_handle: c.twitter_handle || null,
      match_reason: c.match_reason,
      recent_activity: c.recent_activity || null,
      source: c.source,
      raw_profile: c.raw_profile || {},
      report_type: 'daily',
      report_date: reportDate,
      position_in_report: i + 1,
    }));

    const { error: insertError } = await supabase
      .from('recruiting_candidates')
      .insert(dbCandidates);

    if (insertError) {
      console.error('[Talent Radar] Failed to store daily candidates:', insertError);
      return;
    }

    // Update last_run_at
    await supabase
      .from('agent_subscriptions')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', subscription.id);

    // Send SMS notification
    const message = `🎯 Talent Radar Daily Update\n\nFound ${newCandidates.length} new candidates for: "${subscription.query}"\n\n${newCandidates
      .map((c, i) => `${i + 1}. ${c.name}${c.title ? ` - ${c.title}` : ''}\n   ${c.match_reason.substring(0, 80)}...`)
      .join('\n\n')}\n\n---\nScore: SCORE 1:5 2:3 ...`;

    await sendSmsResponse(subscriber.phone_number, message, twilioClient);

    console.log(`[Talent Radar] Sent ${newCandidates.length} candidates to ${subscriber.phone_number}`);

  } catch (error) {
    console.error(`[Talent Radar] Failed to process subscription ${subscription.id}:`, error);
  }
}

/**
 * Refresh sources for a subscription (every 30 days)
 */
async function refreshSources(subscription: any): Promise<void> {
  console.log(`[Talent Radar] Refreshing sources for project ${subscription.id}`);

  try {
    const currentSources = subscription.preferences?.sources;

    // Discover new sources
    const newSources = await discoverSources(subscription.query);

    // Merge with existing sources
    const mergedSources = currentSources
      ? mergeSources(currentSources, newSources)
      : newSources;

    // Update in database
    await supabase
      .from('agent_subscriptions')
      .update({
        preferences: {
          ...subscription.preferences,
          sources: mergedSources,
        },
      })
      .eq('id', subscription.id);

    console.log(`[Talent Radar] Sources refreshed for project ${subscription.id}`);

  } catch (error) {
    console.error(`[Talent Radar] Failed to refresh sources for project ${subscription.id}:`, error);
  }
}
