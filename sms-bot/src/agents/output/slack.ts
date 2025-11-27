/**
 * Slack Output Handler
 * Post messages to Slack channels using webhooks
 */

import Handlebars from 'handlebars';
import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Send message to Slack channel
 */
export async function sendSlack(
  items: NormalizedItem[],
  config: OutputConfig['slack'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Slack output is disabled');
    return false;
  }

  console.log(`💬 Posting to Slack channel: ${config.channel}...`);

  // Check for webhook URL (from config or env)
  const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('   ⚠️  Missing SLACK_WEBHOOK_URL');
    return false;
  }

  try {
    let messageText: string;

    // Use template if provided
    if (config.template) {
      const template = Handlebars.compile(config.template);
      const data = {
        agentName: agentMetadata.name,
        agentDescription: agentMetadata.description,
        count: items.length,
        items: items.map(item => ({
          title: item.title || 'Untitled',
          summary: item.summary || '',
          url: item.url || '',
          author: item.author || '',
          publishedAt: item.publishedAt,
          score: (item as EnrichedItem).score,
          relevanceReason: (item as EnrichedItem).relevanceReason,
        })),
      };
      messageText = template(data);
    } else {
      // Default format
      messageText = formatDefaultMessage(items, agentMetadata);
    }

    // Create Slack blocks format
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 ${agentMetadata.name}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: messageText,
        },
      },
    ];

    // Add items as blocks
    for (const item of items.slice(0, 5)) { // Limit to 5 items
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${item.title || 'Untitled'}*\n${item.summary || ''}\n${item.url ? `<${item.url}|View Link>` : ''}`,
        },
      });
      blocks.push({ type: 'divider' } as any);
    }

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: config.channel,
        blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('   ✅ Posted to Slack successfully');
    return true;

  } catch (error: any) {
    console.error(`   ❌ Slack post failed: ${error.message}`);
    return false;
  }
}

/**
 * Format default Slack message
 */
function formatDefaultMessage(items: NormalizedItem[], metadata: AgentMetadata): string {
  return `*${metadata.description}*\n\nFound ${items.length} item${items.length !== 1 ? 's' : ''}`;
}
