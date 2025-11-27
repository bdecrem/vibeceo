/**
 * Discord Output Handler
 * Post messages to Discord channels using webhooks
 */

import Handlebars from 'handlebars';
import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Send message to Discord channel
 */
export async function sendDiscord(
  items: NormalizedItem[],
  config: OutputConfig['discord'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Discord output is disabled');
    return false;
  }

  console.log(`🎮 Posting to Discord...`);

  if (!config.webhookUrl) {
    console.log('   ⚠️  Missing Discord webhook URL');
    return false;
  }

  try {
    let contentText: string;

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
      contentText = template(data);
    } else {
      contentText = `**${agentMetadata.name}**\n\n${agentMetadata.description}\n\nFound ${items.length} item${items.length !== 1 ? 's' : ''}`;
    }

    // Create Discord embeds
    const embeds = items.slice(0, 10).map(item => ({ // Discord limit: 10 embeds
      title: item.title || 'Untitled',
      description: item.summary ? item.summary.substring(0, 2048) : undefined, // 2048 char limit
      url: item.url,
      color: 0x5865F2, // Discord blurple
      fields: [
        ...(item.author ? [{ name: 'Author', value: item.author, inline: true }] : []),
        ...(item.publishedAt ? [{ name: 'Published', value: formatDate(item.publishedAt), inline: true }] : []),
        ...((item as EnrichedItem).score ? [{ name: 'Score', value: String((item as EnrichedItem).score), inline: true }] : []),
      ],
      timestamp: new Date().toISOString(),
    }));

    // Send to Discord
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: contentText,
        embeds,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('   ✅ Posted to Discord successfully');
    return true;

  } catch (error: any) {
    console.error(`   ❌ Discord post failed: ${error.message}`);
    return false;
  }
}

/**
 * Format date for Discord display
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
