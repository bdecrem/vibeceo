/**
 * Claude Agent Pipeline Step
 * Runs Claude AI at runtime for dynamic transformations
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NormalizedItem } from '@vibeceo/shared-types';

export interface ClaudeAgentStep {
  kind: 'claude_agent';
  name?: string;
  systemPrompt: string;
  userPromptTemplate: string; // Handlebars template
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';
  maxTokens?: number;
  outputField?: string; // Where to store the result (default: 'agentOutput')
}

export async function runClaudeAgent(
  items: NormalizedItem[],
  config: ClaudeAgentStep
): Promise<NormalizedItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ ANTHROPIC_API_KEY not set, skipping Claude agent step');
    return items;
  }

  const client = new Anthropic({ apiKey });
  const model = config.model || 'claude-3-5-sonnet-20241022';
  const maxTokens = config.maxTokens || 1024;
  const outputField = config.outputField || 'agentOutput';

  console.log(`🤖 Running Claude Agent on ${items.length} items...`);

  // Process items in parallel with rate limiting
  const batchSize = 5; // Process 5 at a time to avoid rate limits
  const results: NormalizedItem[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          // Compile user prompt with item data
          const userPrompt = renderTemplate(config.userPromptTemplate, item);

          // Call Claude
          const message = await client.messages.create({
            model,
            max_tokens: maxTokens,
            system: config.systemPrompt,
            messages: [{
              role: 'user',
              content: userPrompt
            }]
          });

          // Extract text response
          const response = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

          // Add to item
          return {
            ...item,
            [outputField]: response,
          };

        } catch (error: any) {
          console.error(`   ❌ Claude agent failed for item ${item.id}: ${error.message}`);
          return {
            ...item,
            [outputField]: null,
            agentError: error.message,
          };
        }
      })
    );

    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Claude agent processed ${results.length} items`);
  return results;
}

/**
 * Simple template rendering - supports {{field}} syntax
 * Also supports nested fields like {{raw.description}}
 */
function renderTemplate(template: string, data: any): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    // Support nested field access like {{raw.description}}
    const value = path.split('.').reduce((obj: any, key: string) => {
      return obj?.[key];
    }, data);

    return value !== undefined && value !== null ? String(value) : match;
  });
}
