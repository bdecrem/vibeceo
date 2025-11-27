/**
 * Rank Pipeline Step
 * Uses LLM to score and rank items by relevance
 */

import OpenAI from 'openai';
import type { NormalizedItem, EnrichedItem } from '@vibeceo/shared-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RankConfig {
  model: string;
  promptTemplateId: string;
}

/**
 * Rank items using LLM
 * Returns items with score and relevanceReason added
 */
export async function rankItems(
  items: NormalizedItem[],
  config: RankConfig
): Promise<EnrichedItem[]> {
  if (items.length === 0) {
    return [];
  }

  console.log(`     Ranking ${items.length} items with ${config.model}...`);

  try {
    // Build prompt with items
    const itemsText = items.map((item, idx) => (
      `${idx + 1}. ${item.title}\n   ${item.summary?.substring(0, 200) || 'No summary'}`
    )).join('\n\n');

    const prompt = `You are a relevance scorer. Score each item from 0.0 to 1.0 based on how relevant and important it is. Also provide a brief reason for the score.

Items to score:
${itemsText}

Respond in JSON format:
{
  "scores": [
    { "index": 0, "score": 0.95, "reason": "Highly relevant..." },
    { "index": 1, "score": 0.7, "reason": "Moderately relevant..." }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    console.log(`     Ranked ${items.length} items (${tokensUsed} tokens)`);

    // Merge scores back into items
    const enrichedItems: EnrichedItem[] = items.map((item, idx) => {
      const scoreData = result.scores?.find((s: any) => s.index === idx);
      return {
        ...item,
        score: scoreData?.score || 0.5,
        relevanceReason: scoreData?.reason || 'No reason provided',
      };
    });

    return enrichedItems;

  } catch (error: any) {
    console.error(`     ❌ Ranking failed: ${error.message}`);
    // Return items without scores if ranking fails
    return items as EnrichedItem[];
  }
}
