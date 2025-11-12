/**
 * AIR (AI Research) Agent - Personalized Research Reports
 *
 * Architecture: AIR = Scheduled KG-Query + Memory
 * - Loads user's natural language query from Supabase
 * - Runs kg-query agent daily: "Show me papers from today about {user's query}"
 * - Formats results as report + audio
 * - Stores in ai_research_reports_personalized
 * - Sends SMS at user's preferred time
 */

import { supabase } from '../../lib/supabase.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { getAgentSubscribers, markAgentReportSent, type AgentSubscriber } from '../../lib/agent-subscriptions.js';
import { runKGQuery, getCleanDataBoundary, type ConversationMessage } from '../kg-query/index.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';

export const AIR_AGENT_SLUG = 'air';

const DEFAULT_JOB_HOUR = Number(process.env.AIR_REPORT_HOUR || 9); // 9 AM PT - after arxiv-graph completes (~8:15 AM)
const DEFAULT_JOB_MINUTE = Number(process.env.AIR_REPORT_MINUTE || 0);
const SMS_DELAY_MS = Number(process.env.AIR_SMS_DELAY_MS || 150);

export interface AIRPreferences {
  natural_language_query: string;
  notification_time: string; // HH:MM format (PT timezone)
  empty_day_strategy?: 'skip' | 'expand'; // What to do when no matches
  last_delivery_status?: string;
  consecutive_failures?: number;
}

export interface AIRReport {
  id: string;
  subscriber_id: string;
  report_date: string;
  markdown_content: string;
  audio_url: string | null;
  paper_count: number;
  query_used: string;
  created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip temporal keywords from user query
 * "physical ai papers from the last day" → "physical ai papers"
 */
export function stripTemporalKeywords(query: string): string {
  const temporalPatterns = [
    /\b(from |in |over |during )?the last (day|24 hours?|week|month|year)\b/gi,
    /\b(from |in )?the past (day|24 hours?|week|month|year)\b/gi,
    /\b(from )?today\b/gi,
    /\b(from )?yesterday\b/gi,
    /\b(from )?this (week|month|year)\b/gi,
    /\brecent(ly)?\b/gi,
    /\blatest\b/gi,
    /\bnew\b/gi,
  ];

  let cleaned = query;
  for (const pattern of temporalPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up extra spaces and trim
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Test query to check if it returns results
 * Returns { hasResults: boolean, paperCount: number, response: string }
 */
export async function testQuery(
  cleanedQuery: string
): Promise<{ hasResults: boolean; paperCount: number; response: string }> {
  console.log(`[AIR] Testing query: "${cleanedQuery}"`);

  try {
    const cleanDataBoundary = await getCleanDataBoundary();

    // Run query with "last 3 days" window
    const query = `Show me papers published in the last 3 days about: ${cleanedQuery}`;

    const response = await runKGQuery(
      query,
      [], // No conversation history
      '', // No report context
      cleanDataBoundary
    );

    // Count papers (rough estimate from markdown)
    const paperCount = (response.match(/###\s+\d+\./g) || []).length;

    console.log(`[AIR] Test query result: ${paperCount} papers`);

    return {
      hasResults: paperCount > 0,
      paperCount,
      response,
    };
  } catch (error) {
    console.error('[AIR] Test query failed:', error);
    throw error;
  }
}

/**
 * Check historical frequency of matches
 * Returns how often this query would have matched over last 14 days
 * Uses multiple test queries with different date ranges
 */
export async function checkHistoricalFrequency(
  cleanedQuery: string
): Promise<{ daysWithMatches: number; totalDays: number; avgDaysBetween: number }> {
  console.log(`[AIR] Checking historical frequency for: "${cleanedQuery}"`);

  try {
    const cleanDataBoundary = await getCleanDataBoundary();

    // Test multiple date windows to estimate frequency
    // We'll test: last 3 days, last 7 days, last 14 days
    const windows = [
      { days: 3, query: `Show me papers published in the last 3 days about: ${cleanedQuery}` },
      { days: 7, query: `Show me papers published in the last 7 days about: ${cleanedQuery}` },
      { days: 14, query: `Show me papers published in the last 14 days about: ${cleanedQuery}` },
    ];

    const results: { days: number; paperCount: number }[] = [];

    for (const window of windows) {
      try {
        const response = await runKGQuery(window.query, [], '', cleanDataBoundary);
        const paperCount = (response.match(/###\s+\d+\./g) || []).length;
        results.push({ days: window.days, paperCount });
        console.log(`[AIR] ${window.days} days: ${paperCount} papers`);

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[AIR] Failed to test ${window.days} day window:`, error);
        results.push({ days: window.days, paperCount: 0 });
      }
    }

    // Estimate frequency based on paper growth
    const [day3, day7, day14] = results;

    // If we have papers in 3 days but not many more in 7 days, it's sparse
    // If we have steady growth, it's frequent

    let estimatedDaysWithMatches = 0;

    if (day14.paperCount === 0) {
      estimatedDaysWithMatches = 0;
    } else if (day3.paperCount >= 3) {
      // Good daily coverage
      estimatedDaysWithMatches = 10; // ~5x per week
    } else if (day7.paperCount >= 3) {
      // Weekly coverage
      estimatedDaysWithMatches = 5; // ~2-3x per week
    } else if (day14.paperCount >= 3) {
      // Bi-weekly coverage
      estimatedDaysWithMatches = 3; // ~1-2x per week
    } else {
      // Very sparse
      estimatedDaysWithMatches = 1;
    }

    const totalDays = 14;
    const avgDaysBetween = estimatedDaysWithMatches > 0
      ? totalDays / estimatedDaysWithMatches
      : totalDays;

    console.log(`[AIR] Estimated frequency: ${estimatedDaysWithMatches}/${totalDays} days`);

    return {
      daysWithMatches: estimatedDaysWithMatches,
      totalDays,
      avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
    };
  } catch (error) {
    console.error('[AIR] Historical frequency check failed:', error);

    // Fallback to conservative estimate
    console.log('[AIR] Using fallback estimate');
    return {
      daysWithMatches: 3,
      totalDays: 14,
      avgDaysBetween: 4.7,
    };
  }
}

/**
 * Generate personalized report by running kg-query for user's standing query
 */
export async function generatePersonalizedReport(
  subscriber: AgentSubscriber,
  preferences: AIRPreferences
): Promise<{ markdown: string; audioUrl: string | null; wasExpanded?: boolean } | null> {
  console.log(`[AIR] Generating report for ${subscriber.phone_number}`);
  console.log(`[AIR] Query: "${preferences.natural_language_query}"`);

  try {
    const cleanDataBoundary = await getCleanDataBoundary();
    const cleanedQuery = stripTemporalKeywords(preferences.natural_language_query);

    // Try with last 3 days first
    let query = `Show me papers published in the last 3 days about: ${cleanedQuery}`;
    let kgResponse = await runKGQuery(query, [], '', cleanDataBoundary);
    // Count papers - match both numbered headers (### 1.) and emoji bullets (🤖 [Title])
    let paperCount = Math.max(
      (kgResponse.match(/###\s+\d+\./g) || []).length,
      (kgResponse.match(/[\u{1F300}-\u{1F9FF}]\s*\[/gu) || []).length
    );
    let wasExpanded = false;

    // Check if we got results
    if (paperCount === 0) {
      console.log(`[AIR] No matches found for "${cleanedQuery}" in last 3 days`);

      // Check strategy
      const strategy = preferences.empty_day_strategy || 'expand';

      if (strategy === 'skip') {
        console.log(`[AIR] Strategy is 'skip' - not sending report today`);
        return null;
      }

      // Expand to 7 days
      console.log(`[AIR] Expanding search to last 7 days`);
      query = `Show me papers published in the last 7 days about: ${cleanedQuery}`;
      kgResponse = await runKGQuery(query, [], '', cleanDataBoundary);
      // Count papers - match various formats:
      // 1. ### 1. Title
      // 2. 🤖 [Title](url)
      // 3. [Title](http://arxiv.org/abs/...)
      const numberedHeaders = (kgResponse.match(/###\s+\d+\./g) || []).length;
      const emojiBullets = (kgResponse.match(/[\u{1F300}-\u{1F9FF}]\s*\[/gu) || []).length;
      const arxivLinks = (kgResponse.match(/\[[\w\s\-:]+\]\(https?:\/\/arxiv\.org\/abs\//g) || []).length;
      paperCount = Math.max(numberedHeaders, emojiBullets, arxivLinks);
      wasExpanded = true;

      if (paperCount === 0) {
        console.log(`[AIR] Still no matches after expansion - skipping report`);
        return null;
      }
    }

    console.log(`[AIR] Found ${paperCount} papers${wasExpanded ? ' (expanded)' : ''}`);

    // Format as report markdown
    const markdown = formatKGResponseAsReport(
      kgResponse,
      cleanedQuery,
      new Date(),
      wasExpanded
    );

    // TODO: Generate audio narration
    const audioUrl = null;

    console.log(`[AIR] Report generated successfully`);
    return { markdown, audioUrl, wasExpanded };
  } catch (error) {
    console.error(`[AIR] Failed to generate report:`, error);
    throw error;
  }
}

/**
 * Format kg-query response as a daily report
 */
function formatKGResponseAsReport(
  kgResponse: string,
  userQuery: string,
  date: Date,
  wasExpanded?: boolean
): string {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let expandedNote = '';
  if (wasExpanded) {
    expandedNote = `\n*Note: No matches from the last 3 days, so we expanded to the last week.*\n`;
  }

  const markdown = `# Your AI Research Brief

**${dateStr}**

**Your Query:** "${userQuery}"
${expandedNote}
---

${kgResponse}

---

*Questions? Text: **KG [your question]***
*Modify your query: **AIR {new query}***
*Change delivery time: **AIR TIME HH:MM***
*Help: **AIR HELP***
`;

  return markdown;
}

/**
 * Store personalized report in Supabase
 */
export async function storePersonalizedReport(
  subscriberId: string,
  reportDate: Date,
  markdown: string,
  audioUrl: string | null,
  queryUsed: string
): Promise<AIRReport> {
  const dateStr = reportDate.toISOString().split('T')[0];

  // Count papers mentioned (rough estimate from markdown)
  const paperCount = (markdown.match(/###\s+\d+\./g) || []).length;

  const { data, error } = await supabase
    .from('ai_research_reports_personalized')
    .insert({
      subscriber_id: subscriberId,
      report_date: dateStr,
      markdown_content: markdown,
      audio_url: audioUrl,
      paper_count: paperCount,
      query_used: queryUsed,
    })
    .select()
    .single();

  if (error) {
    console.error('[AIR] Failed to store report:', error);
    throw error;
  }

  console.log(`[AIR] Report stored: ${data.id}`);
  return data as AIRReport;
}

/**
 * Get latest report for a subscriber
 */
export async function getLatestPersonalizedReport(
  subscriberId: string
): Promise<AIRReport | null> {
  const { data, error } = await supabase
    .from('ai_research_reports_personalized')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AIR] Failed to get latest report:', error);
    return null;
  }

  return data as AIRReport | null;
}

/**
 * Build SMS message for personalized report
 */
export function buildAIRReportMessage(
  report: AIRReport,
  shortLink: string | null
): string {
  let message = `📊 Your AI Research Brief\n\n`;
  message += `Query: "${report.query_used}"\n`;
  message += `Papers: ${report.paper_count}\n\n`;

  if (shortLink) {
    message += `📖 Read: ${shortLink}\n`;
  }

  if (report.audio_url) {
    message += `🎧 Listen: ${report.audio_url}\n`;
  }

  message += `\n💬 Ask questions: KG [your question]\n`;
  message += `⚙️ Settings: AIR HELP`;

  return message;
}

/**
 * Update subscription status after delivery attempt
 */
async function updateSubscriptionStatus(
  subscriberId: string,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  const { data: subscription } = await supabase
    .from('agent_subscriptions')
    .select('preferences')
    .eq('subscriber_id', subscriberId)
    .eq('agent_slug', AIR_AGENT_SLUG)
    .single();

  if (!subscription) return;

  const preferences = (subscription.preferences || {}) as AIRPreferences;
  const consecutiveFailures = status === 'failed'
    ? (preferences.consecutive_failures || 0) + 1
    : 0;

  const updatedPrefs: AIRPreferences = {
    ...preferences,
    last_delivery_status: status,
    consecutive_failures: consecutiveFailures,
  };

  await supabase
    .from('agent_subscriptions')
    .update({
      preferences: updatedPrefs,
    })
    .eq('subscriber_id', subscriberId)
    .eq('agent_slug', AIR_AGENT_SLUG);
}

/**
 * Generate and send personalized report to one user
 */
async function generateAndSendReport(
  subscriber: AgentSubscriber,
  twilioClient: TwilioClient
): Promise<void> {
  console.log(`[AIR] Processing ${subscriber.phone_number}`);

  try {
    // Load preferences
    const preferences = subscriber.preferences as AIRPreferences;

    if (!preferences?.natural_language_query) {
      console.log(`[AIR] Skipping ${subscriber.phone_number} - no query set`);
      return;
    }

    // Generate report via kg-query
    const result = await generatePersonalizedReport(subscriber, preferences);

    // Check if report was skipped (no matches + strategy is 'skip')
    if (!result) {
      console.log(`[AIR] No report for ${subscriber.phone_number} today (no matches, strategy=skip)`);
      return;
    }

    const { markdown, audioUrl, wasExpanded } = result;

    // Store report
    const report = await storePersonalizedReport(
      subscriber.id,
      new Date(),
      markdown,
      audioUrl,
      preferences.natural_language_query
    );

    // TODO: Generate short link for report viewer
    const shortLink = null;

    // Build SMS message
    const smsMessage = buildAIRReportMessage(report, shortLink);

    // Send SMS
    await twilioClient.messages.create({
      to: subscriber.phone_number,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: smsMessage,
    });

    // Mark as sent
    await markAgentReportSent(subscriber.phone_number, AIR_AGENT_SLUG);
    await updateSubscriptionStatus(subscriber.id, 'success');

    console.log(`[AIR] ✓ Sent to ${subscriber.phone_number}`);
  } catch (error) {
    console.error(`[AIR] ✗ Failed for ${subscriber.phone_number}:`, error);
    await updateSubscriptionStatus(subscriber.id, 'failed', String(error));
    throw error;
  }
}

/**
 * Register daily job for personalized reports
 */
export function registerAIRDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'air-personalized-reports',
    hour: DEFAULT_JOB_HOUR,
    minute: DEFAULT_JOB_MINUTE,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('[AIR] Starting daily personalized report generation...');
      const startTime = Date.now();

      const subscribers = await getAgentSubscribers(AIR_AGENT_SLUG);
      console.log(`[AIR] Generating reports for ${subscribers.length} users`);

      if (subscribers.length === 0) {
        console.log('[AIR] No subscribers, skipping');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < subscribers.length; i++) {
        const subscriber = subscribers[i];

        try {
          await generateAndSendReport(subscriber, twilioClient);
          successCount++;
          console.log(`[AIR] Progress: ${i + 1}/${subscribers.length}`);

          // Rate limiting: small delay between SMS
          if (i < subscribers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, SMS_DELAY_MS));
          }
        } catch (error) {
          failCount++;
          console.error(`[AIR] Failed for user ${i + 1}/${subscribers.length}`);
          // Continue to next user
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(
        `[AIR] Complete: ${successCount} success, ${failCount} failed in ${duration}m`
      );
    },
    onError: (error) => {
      console.error('[AIR] Daily job failed:', error);
    },
  });

  console.log(
    `[AIR] Daily job registered for ${DEFAULT_JOB_HOUR}:${String(DEFAULT_JOB_MINUTE).padStart(2, '0')} PT`
  );
}
