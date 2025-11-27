/**
 * Webhook Output Handler
 * POST/PUT data to webhook endpoints
 */

import type { NormalizedItem, AgentMetadata, OutputConfig } from '@vibeceo/shared-types';

/**
 * Send webhook with items and metadata
 */
export async function sendWebhook(
  items: NormalizedItem[],
  config: OutputConfig['webhook'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Webhook output is disabled');
    return false;
  }

  console.log(`🪝 Sending webhook to ${config.url}...`);

  try {
    // Prepare payload
    const payload = {
      agent: {
        name: agentMetadata.name,
        description: agentMetadata.description,
        category: agentMetadata.category,
      },
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        author: item.author,
        publishedAt: item.publishedAt,
        score: item.score,
        raw: item.raw,
      })),
    };

    // Send request
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kochi-Agent/1.0',
        ...(config.headers || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`   ✅ Webhook sent successfully (${response.status})`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Webhook failed: ${error.message}`);
    return false;
  }
}
