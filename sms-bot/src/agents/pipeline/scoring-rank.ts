/**
 * Scoring/Ranking Pipeline Step
 * Scores and ranks items using LLM based on custom criteria
 */

import OpenAI from 'openai';
import type { NormalizedItem, ScoringRankStep } from '@vibeceo/shared-types';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Score a single item using LLM
 */
async function scoreItem(
  item: NormalizedItem,
  criteria: string,
  model: string,
  openai: OpenAI
): Promise<{ score: number; reason: string }> {
  const prompt = `Score the following item on a scale of 0-10 based on this criteria: "${criteria}"

Item:
Title: ${item.title || 'No title'}
Summary: ${item.summary?.substring(0, 300) || 'No summary'}

Respond in JSON format:
{
  "score": <number between 0 and 10>,
  "reason": "<brief explanation of the score>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content evaluator. Analyze items and provide accurate scores based on given criteria.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');

    return {
      score: result.score || 5,
      reason: result.reason || 'No reason provided',
    };
  } catch (error: any) {
    console.error(`   ⚠️ Failed to score item "${item.title}": ${error.message}`);
    return {
      score: 5,
      reason: 'Scoring failed, assigned default score',
    };
  }
}

/**
 * Score and rank items based on custom criteria
 */
export async function scoreItems(
  items: NormalizedItem[],
  config: ScoringRankStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const { criteria, model = 'gpt-4' } = config;

  console.log(`🎯 Scoring ${items.length} items with ${model}...`);
  console.log(`   Criteria: ${criteria}`);

  try {
    const openai = getOpenAIClient();

    // Score all items
    const scoredItems = await Promise.all(
      items.map(async (item) => {
        const { score, reason } = await scoreItem(item, criteria, model, openai);

        return {
          ...item,
          customScore: score,
          scoreReason: reason,
        };
      })
    );

    // Sort items by score (highest first)
    scoredItems.sort((a, b) => {
      const scoreA = (a as any).customScore || 0;
      const scoreB = (b as any).customScore || 0;
      return scoreB - scoreA;
    });

    // Add rank field
    const rankedItems = scoredItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const avgScore = rankedItems.reduce((sum, item) => sum + ((item as any).customScore || 0), 0) / rankedItems.length;

    console.log(`✅ Scored and ranked ${rankedItems.length} items (avg score: ${avgScore.toFixed(2)}/10)`);

    return rankedItems;
  } catch (error: any) {
    console.error(`❌ Scoring failed: ${error.message}`);
    return items;
  }
}
