import { handleGitHubTrending, handleGitHubRepo, handleGitHubSearch } from './agent.js';
import { storeAgentReport } from '../report-storage.js';
import { registerDailyJob } from '../../lib/scheduler/index.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import {
  getAgentSubscribers,
  markAgentReportSent,
  type AgentSubscriber,
} from '../../lib/agent-subscriptions.js';
import type { TwilioClient } from '../../lib/sms/webhooks.js';

const AGENT_SLUG = 'github-insights';

// Configuration
const GITHUB_JOB_HOUR = parseInt(process.env.GITHUB_REPORT_HOUR || '9', 10);
const GITHUB_JOB_MINUTE = parseInt(process.env.GITHUB_REPORT_MINUTE || '0', 10);
const GITHUB_BROADCAST_DELAY_MS = parseInt(process.env.GITHUB_BROADCAST_DELAY_MS || '150', 10);

// Run and store the GitHub trending report
export async function runAndStoreGitHubInsights(): Promise<any> {
  try {
    console.log('[GitHub Insights] Generating daily trending report...');
    
    // Generate the trending report
    const trendingReport = await handleGitHubTrending();
    
    // Extract summary (first 3 repos in brief)
    const lines = trendingReport.split('\n').filter(l => l.trim());
    const summary = lines.slice(1, 4)
      .map(l => l.replace(/^\d+\.\s*/, '').split('(')[0].trim())
      .join(', ')
      .substring(0, 160);
    
    // Store the report
    const date = new Date().toISOString().split('T')[0];
    const stored = await storeAgentReport({
      agent: AGENT_SLUG,
      date,
      markdown: trendingReport,
      summary: summary || 'Top GitHub trending repositories',
    });
    
    console.log('[GitHub Insights] Report stored:', stored.reportPath);
    
    return {
      ...stored,
      markdown: trendingReport,
      summary: summary || 'Top GitHub trending repositories',
    };
  } catch (error) {
    console.error('[GitHub Insights] Failed to generate report:', error);
    throw error;
  }
}

// Get the latest stored report
export async function getLatestStoredGitHubInsights(): Promise<any> {
  try {
    const date = new Date().toISOString().split('T')[0];
    const reportPath = `${AGENT_SLUG}/reports/${date}.md`;
    
    // This would need actual Supabase fetch logic
    // For now, returning null to indicate no stored report
    return null;
  } catch (error) {
    console.error('[GitHub Insights] Failed to get stored report:', error);
    return null;
  }
}

// Register the daily job with scheduler
export function registerGitHubInsightsDailyJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'github-insights-daily',
    hour: GITHUB_JOB_HOUR,
    minute: GITHUB_JOB_MINUTE,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('[GitHub Insights] Running scheduled daily report...');
      try {
        // Generate and store report
        const metadata = await runAndStoreGitHubInsights();
        console.log(
          `âœ… GitHub Insights report stored for ${metadata.date} at ${metadata.reportPath}`
        );
        
        // Build viewer URL and create short link
        const viewerUrl = buildReportViewerUrl({ path: metadata.reportPath });
        const reportLink = await createShortLink(viewerUrl, {
          context: 'github-insights-daily',
          createdBy: 'sms-bot',
          createdFor: 'github-insights',
        });
        
        // Get subscribers
        const subscribers = await getAgentSubscribers(AGENT_SLUG);
        console.log(`[GitHub Insights] Broadcasting to ${subscribers.length} subscribers`);
        
        // Send to each subscriber
        for (const subscriber of subscribers) {
          const message = `í´¥ GitHub Trending Today\n\n${metadata.summary}\n\nFull report: ${reportLink}`;
          
          try {
            await twilioClient.messages.create({
              body: message,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER,
            });
            
            await markAgentReportSent(subscriber.id, AGENT_SLUG);
            console.log(`[GitHub Insights] Sent to ${subscriber.phone_number}`);
          } catch (error) {
            console.error(`[GitHub Insights] Failed to send to ${subscriber.phone_number}:`, error);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, GITHUB_BROADCAST_DELAY_MS));
        }
        
        console.log('[GitHub Insights] Daily broadcast complete');
      } catch (error) {
        console.error('[GitHub Insights] Daily job failed:', error);
      }
    },
  });
  
  console.log(`[GitHub Insights] Scheduled daily job at ${GITHUB_JOB_HOUR}:${GITHUB_JOB_MINUTE.toString().padStart(2, '0')} PT`);
}

// Re-export agent functions
export { handleGitHubTrending, handleGitHubRepo, handleGitHubSearch } from './agent.js';
