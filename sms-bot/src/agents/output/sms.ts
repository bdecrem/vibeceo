/**
 * SMS Output Generator
 * Generates SMS content from items using Handlebars templates
 */

import Handlebars from 'handlebars';
import type { NormalizedItem, AgentMetadata, EnrichedItem } from '@vibeceo/shared-types';

interface SMSConfig {
  template: string;
  maxLength: number;
}

/**
 * Generate SMS content from items using template
 */
export function generateSMS(
  items: NormalizedItem[],
  config: SMSConfig,
  agentMetadata: AgentMetadata,
  reportUrl?: string,
  aiSummary?: string
): string {
  console.log(`📱 Generating SMS from ${items.length} items...`);

  try {
    // Compile Handlebars template
    const template = Handlebars.compile(config.template);

    // Prepare template data
    const data = {
      agentName: agentMetadata.name,
      agentDescription: agentMetadata.description,
      count: items.length,
      summary: aiSummary || '', // AI-generated summary from summarize step
      items: items.map(item => ({
        title: item.title || 'Untitled',
        summary: item.summary || '',
        url: item.url || '',
        author: item.author || '',
        publishedAt: item.publishedAt ? formatDate(item.publishedAt) : '',
        score: (item as EnrichedItem).score,
        relevanceReason: (item as EnrichedItem).relevanceReason,
        keyPoints: (item as EnrichedItem).keyPoints || [],
      })),
      reportUrl: reportUrl || '',
    };

    // Render template
    let sms = template(data);

    // Always append report URL if provided and not already in template
    if (reportUrl && !sms.includes(reportUrl)) {
      sms += `\n\nFull report: ${reportUrl}`;
    }

    console.log(`   Generated SMS: ${sms.length} characters`);
    return sms;

  } catch (error: any) {
    console.error(`   ❌ SMS generation failed: ${error.message}`);

    // Fallback to simple format
    const fallback = `${agentMetadata.name}\n\n${items.length} items found.\n\n${
      items.slice(0, 3).map(item => `• ${item.title}`).join('\n')
    }\n\n${reportUrl ? `Full report: ${reportUrl}` : ''}`;

    return fallback.substring(0, config.maxLength);
  }
}

/**
 * Format date for SMS display
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
